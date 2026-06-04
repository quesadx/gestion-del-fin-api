import { prisma } from '../../lib/prisma.js';
import { inventory_log_log_type } from '../../generated/prisma/client.js';
import { AppError } from '../../shared/utils/appError.js';
import { auditLog } from '../../shared/utils/auditLog.js';
import { CreateAdjustmentRequestDto } from './inventory-adjustment-requests.schema.js';
import { logLowResourceAlerts } from '../inventory/inventory.service.js';
import { logger } from '../../logger/logger.js';
import * as achievementService from '../achievements/achievements.service.js';

export async function createRequest(data: CreateAdjustmentRequestDto, userId: number) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { camp_id: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.camp_id !== data.camp_id) {
    throw new AppError('Forbidden: cannot create request for another camp', 403);
  }

  const request = await prisma.inventory_adjustment_requests.create({
    data: {
      camp_id: data.camp_id,
      created_by: userId,
      adjustment_type: data.adjustment_type,
      resource_type_id: data.resource_type_id,
      quantity: data.quantity,
      reason: data.reason?.trim(),
    },
    select: {
      id: true,
      camp_id: true,
      created_by: true,
      status: true,
      adjustment_type: true,
      resource_type_id: true,
      quantity: true,
      reason: true,
      created_at: true,
      updated_at: true,
    },
  });

  auditLog({
    userId,
    campId: data.camp_id,
    action: 'CREATE_INVENTORY_ADJUSTMENT_REQUEST',
    targetType: 'inventory_adjustment_requests',
    targetId: request.id,
  });

  return request;
}

export async function getMyRequests(userId: number, campId: number) {
  return prisma.inventory_adjustment_requests.findMany({
    where: { created_by: userId, camp_id: campId },
    orderBy: { created_at: 'desc' },
    include: {
      resource_type: { select: { id: true, name: true, unit: true } },
      reviewed_by_user: { select: { id: true, username: true } },
    },
  });
}

export async function getAllRequests(campId: number) {
  return prisma.inventory_adjustment_requests.findMany({
    where: { camp_id: campId },
    orderBy: { created_at: 'desc' },
    include: {
      created_by_user: { select: { id: true, username: true } },
      resource_type: { select: { id: true, name: true, unit: true } },
      reviewed_by_user: { select: { id: true, username: true } },
    },
  });
}

export async function approveRequest(requestId: number, reviewerId: number) {
  const request = await prisma.inventory_adjustment_requests.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new AppError('Adjustment request not found', 404);
  }

  if (request.status !== 'PENDING') {
    throw new AppError('Request is not pending', 400);
  }

  const reviewer = await prisma.users.findUnique({
    where: { id: reviewerId },
    select: { camp_id: true },
  });

  if (!reviewer) {
    throw new AppError('Reviewer not found', 404);
  }

  if (reviewer.camp_id !== request.camp_id) {
    throw new AppError('Forbidden: cannot review request from another camp', 403);
  }

  const now = new Date();
  const isManualIn = request.adjustment_type === 'MANUAL_IN';
  const quantityChange = isManualIn ? Number(request.quantity) : -Number(request.quantity);
  const logType = isManualIn ? inventory_log_log_type.MANUAL_IN : inventory_log_log_type.MANUAL_OUT;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.inventory_adjustment_requests.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewed_by: reviewerId,
        reviewed_at: now,
      },
    });

    if (isManualIn) {
      await tx.inventories.upsert({
        where: {
          camp_id_resource_type_id: {
            camp_id: request.camp_id,
            resource_type_id: request.resource_type_id,
          },
        },
        update: {
          quantity: { increment: Number(request.quantity) },
          last_updated: now,
        },
        create: {
          camp_id: request.camp_id,
          resource_type_id: request.resource_type_id,
          quantity: Number(request.quantity),
          last_updated: now,
        },
      });
    } else {
      const updateResult = await tx.inventories.updateMany({
        where: {
          camp_id: request.camp_id,
          resource_type_id: request.resource_type_id,
          quantity: { gte: Number(request.quantity) },
        },
        data: {
          quantity: { decrement: Number(request.quantity) },
          last_updated: now,
        },
      });

      if (updateResult.count === 0) {
        throw new AppError(
          `Insufficient inventory for resource_type_id ${request.resource_type_id} in camp ${request.camp_id}`,
          400,
        );
      }
    }

    const movement = await tx.inventory_logs.create({
      data: {
        camp_id: request.camp_id,
        resource_type_id: request.resource_type_id,
        logged_by: reviewerId,
        log_type: logType,
        quantity_change: quantityChange,
        description: `Approved adjustment request #${request.id}: ${request.reason || 'No reason provided'}`,
      },
      select: {
        id: true,
        camp_id: true,
        resource_type_id: true,
        logged_by: true,
        log_type: true,
        quantity_change: true,
        logged_at: true,
        created_at: true,
        description: true,
      },
    });

    return { request: updated, movement };
  });

  await logLowResourceAlerts(request.camp_id);

  auditLog({
    userId: reviewerId,
    campId: request.camp_id,
    action: 'REVIEW_INVENTORY_ADJUSTMENT_REQUEST',
    targetType: 'inventory_adjustment_requests',
    targetId: request.id,
    metadata: { decision: 'APPROVED' },
  });

  achievementService
    .tryUnlock(reviewerId, request.camp_id, 'INVENTORY_ADJUST', { type: request.adjustment_type })
    .catch((err: unknown) =>
      logger.warn(`Achievement check failed (INVENTORY_ADJUST): ${(err as Error)?.message ?? err}`),
    );

  return result;
}

export async function rejectRequest(requestId: number, reviewerId: number) {
  const request = await prisma.inventory_adjustment_requests.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new AppError('Adjustment request not found', 404);
  }

  if (request.status !== 'PENDING') {
    throw new AppError('Request is not pending', 400);
  }

  const reviewer = await prisma.users.findUnique({
    where: { id: reviewerId },
    select: { camp_id: true },
  });

  if (!reviewer) {
    throw new AppError('Reviewer not found', 404);
  }

  if (reviewer.camp_id !== request.camp_id) {
    throw new AppError('Forbidden: cannot review request from another camp', 403);
  }

  const updated = await prisma.inventory_adjustment_requests.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
    },
  });

  auditLog({
    userId: reviewerId,
    campId: request.camp_id,
    action: 'REVIEW_INVENTORY_ADJUSTMENT_REQUEST',
    targetType: 'inventory_adjustment_requests',
    targetId: request.id,
    metadata: { decision: 'REJECTED' },
  });

  return { request: updated };
}

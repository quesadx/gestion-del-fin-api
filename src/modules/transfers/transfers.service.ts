import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { auditLog } from '../../shared/utils/auditLog.js';
import {
  ApproveTransferSourceDto,
  ApproveTransferTargetDto,
  CompleteTransferDto,
  CreateTransferDto,
  RejectTransferDto,
  ScheduleTransferDeliveryDto,
} from './transfers.schema.js';

type TransferTransactionClient = Prisma.TransactionClient;
type TransferWithItems = Prisma.camp_transfersGetPayload<{
  include: { camp_transfer_items: true };
}>;

function asNumber(value: unknown): number {
  return Number(value);
}

function parseDateTime(value?: string): Date | undefined {
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid datetime value: ${value}`, 400);
  }

  return parsed;
}

function buildNotes(currentNotes: string | null, nextNote?: string): string | undefined {
  const normalizedCurrent = currentNotes?.trim();
  const normalizedNext = nextNote?.trim();

  if (!normalizedCurrent && !normalizedNext) return undefined;
  if (!normalizedCurrent) return normalizedNext;
  if (!normalizedNext) return normalizedCurrent;

  return `${normalizedCurrent}\n${normalizedNext}`;
}

async function ensureCampExists(tx: TransferTransactionClient, campId: number) {
  const camp = await tx.camps.findUnique({ where: { id: campId }, select: { id: true } });
  if (!camp) throw new AppError(`Camp not found: ${campId}`, 404);
}

async function ensureUserExists(tx: TransferTransactionClient, userId: number) {
  const user = await tx.users.findUnique({
    where: { id: userId },
    select: { id: true, camp_id: true },
  });
  if (!user) throw new AppError(`User not found: ${userId}`, 404);
  return user;
}

async function ensureTransferExists(
  tx: TransferTransactionClient,
  transferId: number,
): Promise<TransferWithItems> {
  const transfer = await tx.camp_transfers.findUnique({
    where: { id: transferId },
    include: { camp_transfer_items: true },
  });

  if (!transfer) {
    throw new AppError(`Transfer not found: ${transferId}`, 404);
  }

  return transfer;
}

async function ensureResourceTypesExist(tx: TransferTransactionClient, resourceTypeIds: number[]) {
  if (resourceTypeIds.length === 0) return;

  const uniqueIds = Array.from(new Set(resourceTypeIds));
  const resources = await tx.resource_types.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });

  if (resources.length !== uniqueIds.length) {
    throw new AppError('One or more resource_type_id values do not exist', 404);
  }
}

async function ensurePeopleExistInSourceCamp(
  tx: TransferTransactionClient,
  personIds: number[],
  sourceCampId: number,
) {
  if (personIds.length === 0) return;

  const uniqueIds = Array.from(new Set(personIds));
  const people = await tx.people.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, camp_id: true, status: true },
  });

  if (people.length !== uniqueIds.length) {
    throw new AppError('One or more person_id values do not exist', 404);
  }

  for (const person of people) {
    if (person.camp_id !== sourceCampId) {
      throw new AppError(`Person ${person.id} does not belong to source camp ${sourceCampId}`, 400);
    }

    if (person.status === 'DEAD') {
      throw new AppError(`Person ${person.id} cannot be transferred (status DEAD)`, 400);
    }
  }
}

function ensureTransferStatus(
  transfer: TransferWithItems,
  expectedStatus: 'PENDING' | 'APPROVED_SOURCE' | 'APPROVED_TARGET',
) {
  if (transfer.status !== expectedStatus) {
    throw new AppError(
      `Transfer ${transfer.id} must be ${expectedStatus} to perform this action. Current status: ${transfer.status}`,
      400,
    );
  }
}

function isPastDate(date: Date): boolean {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() < startOfToday.getTime();
}

function ensureScheduledDeliveryDateForApproval(date: Date | null) {
  if (!date) {
    throw new AppError('scheduled_delivery_date is required before approval', 400);
  }

  if (isPastDate(date)) {
    throw new AppError('scheduled_delivery_date cannot be in the past for approval', 400);
  }
}

function ensureTransferCanBeRejected(currentStatus: string) {
  if (currentStatus === 'COMPLETED') {
    throw new AppError('Completed transfer cannot be rejected', 400);
  }

  if (currentStatus === 'REJECTED') {
    throw new AppError('Transfer is already rejected', 400);
  }
}

async function applyResourceTransfer(
  tx: TransferTransactionClient,
  input: {
    transferId: number;
    sourceCampId: number;
    targetCampId: number;
    completedBy: number;
    resourceItems: Array<{ resource_type_id: number; quantity: number }>;
  },
) {
  const aggregatedResourceItems = Array.from(
    input.resourceItems
      .reduce((acc, item) => {
        const currentQuantity = acc.get(item.resource_type_id) ?? 0;
        acc.set(item.resource_type_id, currentQuantity + item.quantity);
        return acc;
      }, new Map<number, number>())
      .entries(),
  ).map(([resource_type_id, quantity]) => ({ resource_type_id, quantity }));

  const logEntries: Prisma.inventory_logsCreateManyInput[] = [];

  for (const item of aggregatedResourceItems) {
    const updateResult = await tx.inventories.updateMany({
      where: {
        camp_id: input.sourceCampId,
        resource_type_id: item.resource_type_id,
        quantity: { gte: item.quantity },
      },
      data: {
        quantity: { decrement: item.quantity },
        last_updated: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(
        `Insufficient inventory in source camp for resource_type_id ${item.resource_type_id}`,
        400,
      );
    }

    await tx.inventories.upsert({
      where: {
        camp_id_resource_type_id: {
          camp_id: input.targetCampId,
          resource_type_id: item.resource_type_id,
        },
      },
      update: {
        quantity: { increment: item.quantity },
        last_updated: new Date(),
      },
      create: {
        camp_id: input.targetCampId,
        resource_type_id: item.resource_type_id,
        quantity: item.quantity,
      },
    });

    logEntries.push(
      {
        camp_id: input.sourceCampId,
        resource_type_id: item.resource_type_id,
        logged_by: input.completedBy,
        log_type: 'TRANSFER_OUT',
        quantity_change: -item.quantity,
        description: `Transfer #${input.transferId} completed (source outflow)`,
      },
      {
        camp_id: input.targetCampId,
        resource_type_id: item.resource_type_id,
        logged_by: input.completedBy,
        log_type: 'TRANSFER_IN',
        quantity_change: item.quantity,
        description: `Transfer #${input.transferId} completed (target inflow)`,
      },
    );
  }

  if (logEntries.length > 0) {
    await tx.inventory_logs.createMany({ data: logEntries });
  }
}

async function applyPeopleTransfer(
  tx: TransferTransactionClient,
  input: {
    transferId: number;
    sourceCampId: number;
    targetCampId: number;
    personIds: number[];
    personStatus: 'SICK' | 'HEALTHY' | 'INJURED' | 'AWAY' | 'DEAD';
    changedBy: number;
  },
) {
  if (input.personIds.length === 0) return;

  const people = await tx.people.findMany({
    where: { id: { in: input.personIds } },
    select: { id: true, camp_id: true, status: true },
  });

  if (people.length !== input.personIds.length) {
    throw new AppError('One or more transfer people do not exist', 404);
  }

  for (const person of people) {
    if (person.camp_id !== input.sourceCampId) {
      throw new AppError(
        `Person ${person.id} no longer belongs to source camp ${input.sourceCampId}`,
        400,
      );
    }

    await tx.people.update({
      where: { id: person.id },
      data: {
        camp_id: input.targetCampId,
        status: input.personStatus,
      },
    });

    if (person.status !== input.personStatus) {
      await tx.person_status_logs.create({
        data: {
          person_id: person.id,
          old_status: person.status,
          new_status: input.personStatus,
          reason: `Transfer #${input.transferId} completed`,
          changed_by: input.changedBy,
        },
      });
    }
  }
}

export async function createTransfer(data: CreateTransferDto) {
  const scheduledDeliveryDate = parseDateTime(data.scheduled_delivery_date);
  const resourceTypeIds = data.items
    .filter((item) => item.item_type === 'RESOURCE')
    .map((item) => item.resource_type_id as number);
  const personIds = data.items
    .filter((item) => item.item_type === 'PERSON')
    .map((item) => item.person_id as number);

  return prisma
    .$transaction(async (tx: TransferTransactionClient) => {
      if (data.requesting_camp === data.target_camp) {
        throw new AppError('requesting_camp and target_camp must be different', 400);
      }

      const [requestedBy] = await Promise.all([
        ensureUserExists(tx, data.requested_by),
        ensureCampExists(tx, data.requesting_camp),
        ensureCampExists(tx, data.target_camp),
        ensureResourceTypesExist(tx, resourceTypeIds),
        ensurePeopleExistInSourceCamp(tx, personIds, data.requesting_camp),
      ]);

      if (data.leader_person_id) {
        await ensurePeopleExistInSourceCamp(tx, [data.leader_person_id], data.requesting_camp);
      }
      if (requestedBy.camp_id !== data.requesting_camp) {
        throw new AppError('requested_by must belong to requesting_camp', 400);
      }

      const transfer = await tx.camp_transfers.create({
        data: {
          requesting_camp: data.requesting_camp,
          target_camp: data.target_camp,
          status: 'PENDING',
          type: data.type,
          notes: data.notes?.trim(),
          requested_by: data.requested_by,
          leader_person_id: data.leader_person_id,
          scheduled_delivery_date: scheduledDeliveryDate,
        },
      });

      await tx.camp_transfer_items.createMany({
        data: data.items.map((item) => ({
          camp_transfer_id: transfer.id,
          item_type: item.item_type,
          resource_type_id: item.resource_type_id,
          person_id: item.person_id,
          quantity: item.item_type === 'RESOURCE' ? item.quantity : null,
        })),
      });

      return tx.camp_transfers.findUnique({
        where: { id: transfer.id },
        include: { camp_transfer_items: true },
      });
    })
    .then((result) => {
      if (result) {
        auditLog({
          userId: data.requested_by,
          campId: data.requesting_camp,
          action: 'CREATE_TRANSFER',
          targetType: 'camp_transfers',
          targetId: result.id,
        });
      }
      return result;
    });
}

export async function scheduleTransferDelivery(
  transferId: number,
  actorUserId: number,
  data: ScheduleTransferDeliveryDto,
) {
  const scheduledDeliveryDate = parseDateTime(data.scheduled_delivery_date)!;

  if (isPastDate(scheduledDeliveryDate)) {
    throw new AppError('scheduled_delivery_date cannot be in the past', 400);
  }

  return prisma.$transaction(async (tx: TransferTransactionClient) => {
    const actor = await ensureUserExists(tx, actorUserId);
    const transfer = await ensureTransferExists(tx, transferId);

    if (transfer.status === 'COMPLETED' || transfer.status === 'REJECTED') {
      throw new AppError('Cannot schedule delivery for completed or rejected transfers', 400);
    }

    if (actor.camp_id !== transfer.requesting_camp) {
      throw new AppError('Only requesting camp can schedule delivery date', 403);
    }

    return tx.camp_transfers.update({
      where: { id: transferId },
      data: { scheduled_delivery_date: scheduledDeliveryDate },
      include: { camp_transfer_items: true },
    });
  });
}

export async function approveTransferBySource(
  transferId: number,
  approverUserId: number,
  data: ApproveTransferSourceDto,
) {
  const scheduledDeliveryDate = parseDateTime(data.scheduled_delivery_date);
  const approver = await prisma.users.findUnique({
    where: { id: approverUserId },
    select: { id: true, camp_id: true },
  });
  if (!approver) throw new AppError(`User not found: ${approverUserId}`, 404);

  return prisma
    .$transaction(async (tx: TransferTransactionClient) => {
      const transfer = await ensureTransferExists(tx, transferId);

      ensureTransferStatus(transfer, 'PENDING');

      if (approver.camp_id !== transfer.requesting_camp) {
        throw new AppError('Only requesting camp can approve source stage', 403);
      }

      const effectiveScheduledDate = scheduledDeliveryDate ?? transfer.scheduled_delivery_date;
      ensureScheduledDeliveryDateForApproval(effectiveScheduledDate);

      return tx.camp_transfers.update({
        where: { id: transferId },
        data: {
          status: 'APPROVED_SOURCE',
          approved_by_source: approverUserId,
          approved_source_at: new Date(),
          scheduled_delivery_date: effectiveScheduledDate,
          notes: buildNotes(transfer.notes, data.notes),
        },
        include: { camp_transfer_items: true },
      });
    })
    .then((result) => {
      if (result) {
        auditLog({
          userId: approverUserId,
          campId: approver.camp_id,
          action: 'APPROVE_TRANSFER_SOURCE',
          targetType: 'camp_transfers',
          targetId: transferId,
        });
      }
      return result;
    });
}

export async function approveTransferByTarget(
  transferId: number,
  approverUserId: number,
  data: ApproveTransferTargetDto,
) {
  const approver = await prisma.users.findUnique({
    where: { id: approverUserId },
    select: { id: true, camp_id: true },
  });
  if (!approver) throw new AppError(`User not found: ${approverUserId}`, 404);

  return prisma
    .$transaction(async (tx: TransferTransactionClient) => {
      const transfer = await ensureTransferExists(tx, transferId);

      ensureTransferStatus(transfer, 'APPROVED_SOURCE');

      if (approver.camp_id !== transfer.target_camp) {
        throw new AppError('Only target camp can approve target stage', 403);
      }

      ensureScheduledDeliveryDateForApproval(transfer.scheduled_delivery_date);

      return tx.camp_transfers.update({
        where: { id: transferId },
        data: {
          status: 'APPROVED_TARGET',
          approved_by_target: approverUserId,
          approved_target_at: new Date(),
          notes: buildNotes(transfer.notes, data.notes),
        },
        include: { camp_transfer_items: true },
      });
    })
    .then((result) => {
      if (result) {
        auditLog({
          userId: approverUserId,
          campId: approver.camp_id,
          action: 'APPROVE_TRANSFER_TARGET',
          targetType: 'camp_transfers',
          targetId: transferId,
        });
      }
      return result;
    });
}

export async function completeTransfer(
  transferId: number,
  completedBy: number,
  data: CompleteTransferDto,
) {
  const targetPersonStatus = data.person_status ?? 'HEALTHY';
  const actor = await prisma.users.findUnique({
    where: { id: completedBy },
    select: { id: true, camp_id: true },
  });
  if (!actor) throw new AppError(`User not found: ${completedBy}`, 404);

  return prisma
    .$transaction(async (tx: TransferTransactionClient) => {
      const transfer = await ensureTransferExists(tx, transferId);

      ensureTransferStatus(transfer, 'APPROVED_TARGET');

      if (actor.camp_id !== transfer.requesting_camp && actor.camp_id !== transfer.target_camp) {
        throw new AppError('Only source or target camp users can complete transfer', 403);
      }

      const resourceItems = transfer.camp_transfer_items
        .filter((item) => item.item_type === 'RESOURCE')
        .map((item) => {
          if (item.resource_type_id == null) {
            throw new AppError('RESOURCE items must include resource_type_id', 400);
          }

          if (item.quantity == null) {
            throw new AppError('RESOURCE items must include quantity', 400);
          }

          const quantity = asNumber(item.quantity);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError('RESOURCE item quantity must be a finite positive number', 400);
          }

          return {
            resource_type_id: item.resource_type_id,
            quantity,
          };
        });

      const personIds = transfer.camp_transfer_items
        .filter((item) => item.item_type === 'PERSON')
        .map((item) => {
          if (item.person_id == null) {
            throw new AppError('PERSON items must include person_id', 400);
          }

          return item.person_id;
        });

      if (personIds.length > 0 && resourceItems.length === 0) {
        throw new AppError('Person transfer must include travel rations (RESOURCE items)', 400);
      }

      await applyResourceTransfer(tx, {
        transferId: transfer.id,
        sourceCampId: transfer.requesting_camp,
        targetCampId: transfer.target_camp,
        completedBy,
        resourceItems,
      });

      await applyPeopleTransfer(tx, {
        transferId: transfer.id,
        sourceCampId: transfer.requesting_camp,
        targetCampId: transfer.target_camp,
        personIds,
        personStatus: targetPersonStatus,
        changedBy: completedBy,
      });

      return tx.camp_transfers.update({
        where: { id: transfer.id },
        data: {
          status: 'COMPLETED',
          notes: buildNotes(transfer.notes, data.notes),
        },
        include: { camp_transfer_items: true },
      });
    })
    .then((result) => {
      if (result) {
        auditLog({
          userId: completedBy,
          campId: actor.camp_id,
          action: 'COMPLETE_TRANSFER',
          targetType: 'camp_transfers',
          targetId: transferId,
        });
      }
      return result;
    });
}

export async function rejectTransfer(
  transferId: number,
  actorUserId: number,
  data: RejectTransferDto,
) {
  const actor = await prisma.users.findUnique({
    where: { id: actorUserId },
    select: { id: true, camp_id: true },
  });
  if (!actor) throw new AppError(`User not found: ${actorUserId}`, 404);

  return prisma
    .$transaction(async (tx: TransferTransactionClient) => {
      const transfer = await ensureTransferExists(tx, transferId);

      ensureTransferCanBeRejected(transfer.status);

      if (actor.camp_id !== transfer.requesting_camp && actor.camp_id !== transfer.target_camp) {
        throw new AppError('Only source or target camp users can reject transfer', 403);
      }

      return tx.camp_transfers.update({
        where: { id: transfer.id },
        data: {
          status: 'REJECTED',
          notes: buildNotes(
            transfer.notes,
            `Rejected by user ${actorUserId}: ${data.reason.trim()}`,
          ),
        },
        include: { camp_transfer_items: true },
      });
    })
    .then((result) => {
      if (result) {
        auditLog({
          userId: actorUserId,
          campId: actor.camp_id,
          action: 'REJECT_TRANSFER',
          targetType: 'camp_transfers',
          targetId: transferId,
        });
      }
      return result;
    });
}

export async function getTransfer(id: number) {
  const transfer = await prisma.camp_transfers.findUnique({
    where: { id },
    include: {
      camp_transfer_items: true,
    },
  });

  if (!transfer) {
    throw new AppError(`Transfer not found: ${id}`, 404);
  }

  return transfer;
}

export async function getTransfers(campId: number, page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const where = {
    OR: [{ requesting_camp: campId }, { target_camp: campId }],
  };

  const [transfers, total] = await Promise.all([
    prisma.camp_transfers.findMany({
      where,
      skip,
      take: effectiveLimit,
      orderBy: { created_at: 'desc' },
      include: {
        camp_transfer_items: true,
        requesting_camp_ref: true,
        target_camp_ref: true,
      },
    }),
    prisma.camp_transfers.count({ where }),
  ]);

  return {
    data: transfers,
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
}

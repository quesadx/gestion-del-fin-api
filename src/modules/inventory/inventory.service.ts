import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { ManualAdjustmentDto } from './inventory.schema.js';

function asNumber(value: unknown): number {
  return Number(value);
}

type InventoryTransactionClient = Prisma.TransactionClient;

async function ensureCampExists(tx: InventoryTransactionClient, campId: number) {
  const camp = await tx.camps.findUnique({ where: { id: campId }, select: { id: true } });
  if (!camp) {
    throw new AppError(`Camp not found: ${campId}`, 404);
  }
}

async function ensureResourceExists(tx: InventoryTransactionClient, resourceTypeId: number) {
  const resource = await tx.resource_type.findUnique({
    where: { id: resourceTypeId },
    select: { id: true },
  });

  if (!resource) {
    throw new AppError(`Resource not found: ${resourceTypeId}`, 404);
  }
}

async function ensureUserExists(tx: InventoryTransactionClient, userId: number) {
  const user = await tx.users.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new AppError(`User not found: ${userId}`, 404);
  }
}

async function validateInventoryConsistency(campId: number) {
  const inventoryRecords = await prisma.inventory.findMany({
    where: { camp_id: campId },
    select: { resource_type_id: true, quantity: true },
  });

  const logDeltasByResource = await prisma.inventory_log.groupBy({
    by: ['resource_type_id'],
    where: { camp_id: campId },
    _sum: { delta: true },
  });

  const logMap = new Map(
    logDeltasByResource.map((row) => [row.resource_type_id, asNumber(row._sum.delta ?? 0)]),
  );

  return inventoryRecords.map((inv) => {
    const inventoryQty = asNumber(inv.quantity);
    const logSum = logMap.get(inv.resource_type_id) ?? 0;
    const isConsistent = Math.abs(inventoryQty - logSum) < 0.01; // tolerance for decimals

    return {
      resource_type_id: inv.resource_type_id,
      inventory_quantity: inventoryQty,
      log_delta_sum: logSum,
      is_consistent: isConsistent,
      discrepancy: inventoryQty - logSum,
    };
  });
}

export async function getCampInventory(campId: number) {
  await ensureCampExists(prisma, campId);

  const inventoryRecords = await prisma.inventory.findMany({
    where: { camp_id: campId },
    select: {
      resource_type_id: true,
      quantity: true,
      resource_type: {
        select: {
          id: true,
          name: true,
          unit: true,
          minimum_stock: true,
        },
      },
    },
  });

  if (inventoryRecords.length === 0) {
    return { camp_id: campId, inventory: [] };
  }

  const inventory = inventoryRecords
    .map((row) => {
      const quantity = asNumber(row.quantity);
      const minimumStock = asNumber(row.resource_type.minimum_stock);

      return {
        resource_type_id: row.resource_type_id,
        resource_name: row.resource_type.name,
        unit: row.resource_type.unit,
        quantity,
        minimum_stock: minimumStock,
        is_below_minimum: quantity < minimumStock,
      };
    })
    .sort((a, b) => a.resource_name.localeCompare(b.resource_name));

  return {
    camp_id: campId,
    inventory,
  };
}

export async function getInventoryAudit(campId: number) {
  await ensureCampExists(prisma, campId);

  const consistency = await validateInventoryConsistency(campId);
  const hasInconsistencies = consistency.some((item) => !item.is_consistent);

  const resources = await prisma.resource_type.findMany({
    where: { id: { in: consistency.map((c) => c.resource_type_id) } },
    select: { id: true, name: true, unit: true },
  });

  const resourcesMap = new Map(resources.map((r) => [r.id, r]));

  const audit = consistency.map((item) => {
    const resource = resourcesMap.get(item.resource_type_id);
    return {
      resource_type_id: item.resource_type_id,
      resource_name: resource?.name ?? null,
      unit: resource?.unit ?? null,
      inventory_quantity: item.inventory_quantity,
      log_delta_sum: item.log_delta_sum,
      is_consistent: item.is_consistent,
      discrepancy: item.discrepancy,
    };
  });

  return {
    camp_id: campId,
    has_inconsistencies: hasInconsistencies,
    audit,
  };
}

export async function createManualAdjustment(data: ManualAdjustmentDto, userId: number) {
  return prisma.$transaction(async (tx: InventoryTransactionClient) => {
    await Promise.all([
      ensureCampExists(tx, data.camp_id),
      ensureResourceExists(tx, data.resource_type_id),
      ensureUserExists(tx, userId),
    ]);

    const now = new Date();
    const isManualIn = data.type === 'MANUAL_IN';
    const delta = isManualIn ? data.quantity : -data.quantity;

    if (isManualIn) {
      await tx.inventory.upsert({
        where: {
          camp_id_resource_type_id: {
            camp_id: data.camp_id,
            resource_type_id: data.resource_type_id,
          },
        },
        update: {
          quantity: { increment: data.quantity },
          last_updated: now,
        },
        create: {
          camp_id: data.camp_id,
          resource_type_id: data.resource_type_id,
          quantity: data.quantity,
          last_updated: now,
        },
      });
    } else {
      const updateResult = await tx.inventory.updateMany({
        where: {
          camp_id: data.camp_id,
          resource_type_id: data.resource_type_id,
          quantity: { gte: data.quantity },
        },
        data: {
          quantity: { decrement: data.quantity },
          last_updated: now,
        },
      });

      if (updateResult.count === 0) {
        throw new AppError(
          `Insufficient inventory for resource_type_id ${data.resource_type_id} in camp ${data.camp_id}`,
          400,
        );
      }
    }

    const movement = await tx.inventory_log.create({
      data: {
        camp_id: data.camp_id,
        resource_type_id: data.resource_type_id,
        logged_by: userId,
        log_type: data.type,
        delta,
        description: data.description?.trim(),
      },
      select: {
        id: true,
        camp_id: true,
        resource_type_id: true,
        logged_by: true,
        log_type: true,
        delta: true,
        logged_at: true,
        description: true,
      },
    });

    const currentInventory = await tx.inventory.findUnique({
      where: {
        camp_id_resource_type_id: {
          camp_id: data.camp_id,
          resource_type_id: data.resource_type_id,
        },
      },
      select: {
        quantity: true,
        last_updated: true,
      },
    });

    return {
      movement: {
        ...movement,
        delta: asNumber(movement.delta),
      },
      inventory: {
        camp_id: data.camp_id,
        resource_type_id: data.resource_type_id,
        quantity: asNumber(currentInventory?.quantity ?? 0),
        last_updated: currentInventory?.last_updated ?? now,
      },
    };
  });
}

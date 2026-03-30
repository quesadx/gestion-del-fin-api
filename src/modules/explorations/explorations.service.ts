import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { handleUniqueConstraintError } from '../../shared/utils/handlePrismaError.js';
import {
  CreateExplorationDto,
  UpdateExplorationDto,
  UpdateExplorationStatusDto,
  DeleteExplorationDto,
} from './explorations.schema.js';

function parseDate(dateStr?: string) {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid date value: ${dateStr}`, 400);
  }
  return date;
}

function asNumber(value: unknown): number {
  return Number(value);
}

function aggregateResources(
  resources: Array<{ resource_type_id: number; amount: number }> = [],
): Map<number, number> {
  const aggregated = new Map<number, number>();

  for (const item of resources) {
    const next = (aggregated.get(item.resource_type_id) ?? 0) + item.amount;
    aggregated.set(item.resource_type_id, next);
  }

  return aggregated;
}

function validateDateOrder(data: {
  departure_date?: Date;
  expected_return_date?: Date;
  max_return_date?: Date;
  actual_return_date?: Date;
}) {
  const { departure_date, expected_return_date, max_return_date, actual_return_date } = data;

  if (departure_date && expected_return_date && expected_return_date < departure_date) {
    throw new AppError('expected_return_date cannot be earlier than departure_date', 400);
  }

  if (expected_return_date && max_return_date && max_return_date < expected_return_date) {
    throw new AppError('max_return_date cannot be earlier than expected_return_date', 400);
  }

  if (actual_return_date && departure_date && actual_return_date < departure_date) {
    throw new AppError('actual_return_date cannot be earlier than departure_date', 400);
  }
}

async function validateReferences(campId?: number, createdBy?: number) {
  if (campId) {
    const camp = await prisma.camps.findUnique({ where: { id: campId } });
    if (!camp) throw new AppError(`camp_id does not exist: ${campId}`, 404);
  }

  if (createdBy) {
    const user = await prisma.users.findUnique({ where: { id: createdBy } });
    if (!user) throw new AppError(`created_by does not exist: ${createdBy}`, 404);
  }
}

function validateCreateStatus(status: 'PLANNED' | 'ONGOING' | 'RETURNED' | 'CANCELLED') {
  if (status === 'RETURNED' || status === 'CANCELLED') {
    throw new AppError('New expeditions can only start as PLANNED or ONGOING', 400);
  }
}

function validateStatusTransition(
  currentStatus: 'PLANNED' | 'ONGOING' | 'RETURNED' | 'CANCELLED',
  targetStatus: 'PLANNED' | 'ONGOING' | 'RETURNED' | 'CANCELLED',
) {
  const allowedTransitions: Record<string, Array<string>> = {
    PLANNED: ['ONGOING', 'CANCELLED'],
    ONGOING: ['RETURNED', 'CANCELLED'],
    RETURNED: [],
    CANCELLED: [],
  };

  if (currentStatus === targetStatus) return;

  const allowed = allowedTransitions[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new AppError(`Invalid status transition from ${currentStatus} to ${targetStatus}`, 400);
  }
}

async function getExpeditionMemberIds(tx: any, expeditionId: number): Promise<number[]> {
  const members = await tx.expedition_members.findMany({
    where: { expedition_id: expeditionId },
    select: { person_id: true },
  });

  return members.map((member: { person_id: number }) => member.person_id);
}

async function validateMembers(tx: any, campId: number, memberIds: number[]) {
  if (memberIds.length === 0) return;

  const uniqueMemberIds = Array.from(new Set(memberIds));
  const people = await tx.persons.findMany({
    where: { id: { in: uniqueMemberIds } },
    select: { id: true, camp_id: true, status: true },
  });

  if (people.length !== uniqueMemberIds.length) {
    throw new AppError('One or more expedition members do not exist', 404);
  }

  for (const person of people) {
    if (person.camp_id !== campId) {
      throw new AppError(`Person ${person.id} does not belong to camp ${campId}`, 400);
    }

    if (person.status === 'DEAD') {
      throw new AppError(`Person ${person.id} cannot join an expedition (status DEAD)`, 400);
    }
  }
}

async function changeMemberStatus(
  tx: any,
  personIds: number[],
  newStatus: 'SICK' | 'HEALTHY' | 'INJURED' | 'AWAY' | 'DEAD',
  changedBy: number,
  reason: string,
) {
  if (personIds.length === 0) return;

  const people = await tx.persons.findMany({
    where: { id: { in: personIds } },
    select: { id: true, status: true },
  });

  const updates = people.filter((person: { status: string }) => person.status !== newStatus);

  for (const person of updates) {
    await tx.persons.update({
      where: { id: person.id },
      data: { status: newStatus },
    });

    await tx.person_status_log.create({
      data: {
        person_id: person.id,
        old_status: person.status,
        new_status: newStatus,
        reason,
        changed_by: changedBy,
      },
    });
  }
}

// Handles the outbound inventory flow when an expedition starts.
export async function handleResourceOutflow(
  tx: any,
  input: {
    campId: number;
    loggedBy: number;
    expeditionId: number;
    resources: Array<{ resource_type_id: number; amount: number }>;
  },
) {
  const aggregatedResources = aggregateResources(input.resources);
  const resourceIds = Array.from(aggregatedResources.keys());

  if (resourceIds.length === 0) return;

  const inventoryRows = await tx.inventory.findMany({
    where: {
      camp_id: input.campId,
      resource_type_id: { in: resourceIds },
    },
    select: { id: true, resource_type_id: true, quantity: true },
  });

  const inventoryMap = new Map<number, { id: number; quantity: number }>();
  for (const row of inventoryRows) {
    inventoryMap.set(row.resource_type_id, {
      id: row.id,
      quantity: asNumber(row.quantity),
    });
  }

  for (const resourceId of resourceIds) {
    const requested = aggregatedResources.get(resourceId)!;
    const current = inventoryMap.get(resourceId);

    if (!current) {
      throw new AppError(`No inventory record for resource_type_id ${resourceId}`, 400);
    }

    if (current.quantity < requested) {
      throw new AppError(
        `Insufficient stock for resource_type_id ${resourceId}. available=${current.quantity}, requested=${requested}`,
        400,
      );
    }
  }

  for (const resourceId of resourceIds) {
    const requested = aggregatedResources.get(resourceId)!;

    const updateResult = await tx.inventory.updateMany({
      where: {
        camp_id: input.campId,
        resource_type_id: resourceId,
        quantity: { gte: requested },
      },
      data: {
        quantity: { decrement: requested },
        last_updated: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(
        `Insufficient stock or concurrent update for resource_type_id ${resourceId} when processing expedition #${input.expeditionId}`,
        400,
      );
    }
    await tx.inventory_log.create({
      data: {
        camp_id: input.campId,
        resource_type_id: resourceId,
        logged_by: input.loggedBy,
        log_type: 'EXPEDITION_OUT',
        delta: -requested,
        description: `Expedition #${input.expeditionId} resource outflow`,
      },
    });
  }
}

// Handles the inbound inventory flow when an expedition returns.
export async function handleResourceReturn(
  tx: any,
  input: {
    campId: number;
    loggedBy: number;
    expeditionId: number;
    resources: Array<{ resource_type_id: number; amount: number }>;
  },
) {
  const aggregatedResources = aggregateResources(input.resources);
  const resourceIds = Array.from(aggregatedResources.keys());

  if (resourceIds.length === 0) return;

  for (const resourceId of resourceIds) {
    const amount = aggregatedResources.get(resourceId)!;

    await tx.inventory.upsert({
      where: {
        camp_id_resource_type_id: {
          camp_id: input.campId,
          resource_type_id: resourceId,
        },
      },
      update: {
        quantity: { increment: amount },
        last_updated: new Date(),
      },
      create: {
        camp_id: input.campId,
        resource_type_id: resourceId,
        quantity: amount,
      },
    });

    await tx.inventory_log.create({
      data: {
        camp_id: input.campId,
        resource_type_id: resourceId,
        logged_by: input.loggedBy,
        log_type: 'EXPEDITION_IN',
        delta: amount,
        description: `Expedition #${input.expeditionId} resource return`,
      },
    });
  }
}

function prepareCreateData(data: CreateExplorationDto) {
  const departureDate = parseDate(data.departure_date)!;
  const expectedReturnDate = parseDate(data.expected_return_date)!;
  const maxReturnDate = parseDate(data.max_return_date)!;
  const actualReturnDate = parseDate(data.actual_return_date);

  validateDateOrder({
    departure_date: departureDate,
    expected_return_date: expectedReturnDate,
    max_return_date: maxReturnDate,
    actual_return_date: actualReturnDate,
  });

  return {
    destination: data.destination.trim(),
    status: data.status ?? 'PLANNED',
    departure_date: departureDate,
    expected_return_date: expectedReturnDate,
    max_return_date: maxReturnDate,
    actual_return_date: actualReturnDate,
    notes: data.notes?.trim(),
    camps: { connect: { id: data.camp_id } },
    users: { connect: { id: data.created_by } },
  };
}

function prepareUpdateData(data: UpdateExplorationDto) {
  const departureDate = parseDate(data.departure_date);
  const expectedReturnDate = parseDate(data.expected_return_date);
  const maxReturnDate = parseDate(data.max_return_date);
  const actualReturnDate = parseDate(data.actual_return_date);

  validateDateOrder({
    departure_date: departureDate,
    expected_return_date: expectedReturnDate,
    max_return_date: maxReturnDate,
    actual_return_date: actualReturnDate,
  });

  return {
    destination: data.destination?.trim(),
    departure_date: departureDate,
    expected_return_date: expectedReturnDate,
    max_return_date: maxReturnDate,
    actual_return_date: actualReturnDate,
    notes: data.notes?.trim(),
    camps: data.camp_id ? { connect: { id: data.camp_id } } : undefined,
    users: data.created_by ? { connect: { id: data.created_by } } : undefined,
  };
}

export async function createExploration(data: CreateExplorationDto) {
  await validateReferences(data.camp_id, data.created_by);

  const initialStatus = data.status ?? 'PLANNED';
  validateCreateStatus(initialStatus);

  const allocatedResources = Array.from(aggregateResources(data.allocated_resources)).map(
    ([resource_type_id, amount]) => ({ resource_type_id, amount }),
  );

  const memberIds = data.members.map((member) => member.person_id);

  try {
    return await prisma.$transaction(async (tx: any) => {
      await validateMembers(tx, data.camp_id, memberIds);

      const expedition = await tx.expeditions.create({
        data: prepareCreateData(data),
      });

      if (memberIds.length > 0) {
        await tx.expedition_members.createMany({
          data: memberIds.map((personId) => ({
            expedition_id: expedition.id,
            person_id: personId,
          })),
          skipDuplicates: true,
        });
      }

      if (allocatedResources.length > 0) {
        await tx.expedition_allocated_resources.createMany({
          data: allocatedResources.map((resource) => ({
            expedition_id: expedition.id,
            resource_type_id: resource.resource_type_id,
            amount: resource.amount,
          })),
          skipDuplicates: true,
        });

        await handleResourceOutflow(tx, {
          campId: data.camp_id,
          loggedBy: data.created_by,
          expeditionId: expedition.id,
          resources: allocatedResources,
        });
      }

      if (initialStatus === 'ONGOING' && memberIds.length > 0) {
        await changeMemberStatus(
          tx,
          memberIds,
          'AWAY',
          data.created_by,
          `Expedition #${expedition.id} started`,
        );
      }

      return tx.expeditions.findUnique({
        where: { id: expedition.id },
        include: {
          camps: true,
          users: true,
          expedition_members: true,
          expedition_allocated_resources: true,
        },
      });
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateExploration(id: number, data: UpdateExplorationDto) {
  const expedition = await prisma.expeditions.findUnique({ where: { id } });
  if (!expedition) throw new AppError(`Expedition not found: ${id}`, 404);

  await validateReferences(data.camp_id, data.created_by);

  const departureDate = parseDate(data.departure_date) ?? expedition.departure_date;
  const expectedReturnDate =
    parseDate(data.expected_return_date) ?? expedition.expected_return_date;
  const maxReturnDate = parseDate(data.max_return_date) ?? expedition.max_return_date;
  const actualReturnDate = parseDate(data.actual_return_date) ?? expedition.actual_return_date;

  validateDateOrder({
    departure_date: departureDate,
    expected_return_date: expectedReturnDate,
    max_return_date: maxReturnDate,
    actual_return_date: actualReturnDate ?? undefined,
  });

  const updateData = prepareUpdateData(data);

  try {
    return await prisma.expeditions.update({
      where: { id },
      data: updateData,
      include: { camps: true, users: true },
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateExpeditionStatus(id: number, data: UpdateExplorationStatusDto) {
  const expedition = await prisma.expeditions.findUnique({ where: { id } });
  if (!expedition) throw new AppError(`Expedition not found: ${id}`, 404);

  await validateReferences(undefined, data.changed_by);

  if (expedition.status === data.status) {
    throw new AppError(`Expedition #${id} is already in status ${data.status}`, 400);
  }

  validateStatusTransition(expedition.status, data.status);

  try {
    return await prisma.$transaction(async (tx: any) => {
      let resourcesToReturn = data.resources_to_return ?? [];

      if (data.status === 'RETURNED' && resourcesToReturn.length === 0) {
        const allocated = await tx.expedition_allocated_resources.findMany({
          where: { expedition_id: id },
          select: { resource_type_id: true, amount: true },
        });

        resourcesToReturn = allocated.map(
          (resource: { resource_type_id: number; amount: number }) => ({
            resource_type_id: resource.resource_type_id,
            amount: asNumber(resource.amount),
          }),
        );
      }

      const normalizedResourcesToReturn = Array.from(aggregateResources(resourcesToReturn)).map(
        ([resource_type_id, amount]) => ({ resource_type_id, amount }),
      );

      const expeditionMemberIds = await getExpeditionMemberIds(tx, id);

      let memberIds = expeditionMemberIds;
      if (data.members) {
        const requestedMemberIds = Array.from(
          new Set(data.members.map((member) => member.person_id)),
        );
        const expeditionMemberSet = new Set(expeditionMemberIds);

        for (const memberId of requestedMemberIds) {
          if (!expeditionMemberSet.has(memberId)) {
            throw new AppError(`Person ${memberId} is not a member of expedition ${id}`, 400);
          }
        }

        await validateMembers(tx, expedition.camp_id, requestedMemberIds);
        memberIds = requestedMemberIds;
      }

      if (data.status === 'ONGOING' && memberIds.length > 0) {
        await changeMemberStatus(
          tx,
          memberIds,
          'AWAY',
          data.changed_by,
          `Expedition #${id} switched to ONGOING`,
        );
      }

      if (data.status === 'RETURNED' || data.status === 'CANCELLED') {
        if (memberIds.length > 0) {
          await changeMemberStatus(
            tx,
            memberIds,
            data.return_member_status ?? 'HEALTHY',
            data.changed_by,
            `Expedition #${id} switched to ${data.status}`,
          );
        }
      }

      if (data.status === 'RETURNED' && normalizedResourcesToReturn.length > 0) {
        await handleResourceReturn(tx, {
          campId: expedition.camp_id,
          loggedBy: data.changed_by,
          expeditionId: id,
          resources: normalizedResourcesToReturn,
        });

        await tx.expedition_found_resources.createMany({
          data: normalizedResourcesToReturn.map((resource) => ({
            expedition_id: id,
            resource_type_id: resource.resource_type_id,
            amount: resource.amount,
          })),
          skipDuplicates: true,
        });
      }

      await tx.expeditions.update({
        where: { id },
        data: {
          status: data.status,
          actual_return_date:
            data.status === 'RETURNED'
              ? parseDate(data.actual_return_date)!
              : expedition.actual_return_date,
          notes: data.notes?.trim() ?? expedition.notes,
        },
      });

      return tx.expeditions.findUnique({
        where: { id },
        include: {
          camps: true,
          users: true,
          expedition_members: true,
          expedition_allocated_resources: true,
          expedition_found_resources: true,
        },
      });
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

// Alias names kept for readability at call sites and feature parity with API request.
export const createExpedition = createExploration;

export async function getExploration(id: number) {
  const expedition = await prisma.expeditions.findUnique({
    where: { id },
    include: {
      camps: true,
      users: true,
      expedition_members: true,
      expedition_allocated_resources: true,
      expedition_found_resources: true,
    },
  });

  if (!expedition) throw new AppError(`Expedition not found: ${id}`, 404);

  return expedition;
}

export async function getExplorations() {
  return await prisma.expeditions.findMany({
    include: {
      camps: true,
      users: true,
      expedition_members: true,
      expedition_allocated_resources: true,
      expedition_found_resources: true,
    },
    orderBy: { id: 'desc' },
  });
}

export async function deleteExploration(id: number, data: DeleteExplorationDto) {
  const expedition = await prisma.expeditions.findUnique({ where: { id } });
  if (!expedition) throw new AppError(`Expedition not found: ${id}`, 404);

  if (expedition.status === 'RETURNED') {
    throw new AppError('Returned expeditions cannot be cancelled', 400);
  }

  if (expedition.status === 'CANCELLED') {
    throw new AppError('Expedition is already cancelled', 400);
  }

  await validateReferences(undefined, data.changed_by);

  await prisma.$transaction(async (tx: any) => {
    const memberIds = await getExpeditionMemberIds(tx, id);

    if (memberIds.length > 0) {
      await changeMemberStatus(
        tx,
        memberIds,
        data.return_member_status ?? 'HEALTHY',
        data.changed_by,
        `Expedition #${id} cancelled`,
      );
    }

    await tx.expeditions.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  });
}

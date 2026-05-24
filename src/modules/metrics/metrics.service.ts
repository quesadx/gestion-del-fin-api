import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';

function asNumber(value: unknown): number {
  return Number(value);
}

export async function getDashboard(campId: number) {
  const [
    survivorCount,
    healthyCount,
    injuredCount,
    absentCount,
    resourceTypesCount,
    activeExpeditionsCount,
    pendingTransfersCount,
    inventoryRows,
    lowResourceRows,
  ] = await Promise.all([
    prisma.people.count({ where: { camp_id: campId, status: { not: 'DEAD' } } }),
    prisma.people.count({ where: { camp_id: campId, status: 'HEALTHY' } }),
    prisma.people.count({ where: { camp_id: campId, status: 'INJURED' } }),
    prisma.people.count({ where: { camp_id: campId, status: 'AWAY' } }),
    prisma.resource_types.count({
      where: {
        inventories: { some: { camp_id: campId } },
      },
    }),
    prisma.expeditions.count({ where: { camp_id: campId, status: 'ONGOING' } }),
    prisma.camp_transfers.count({
      where: { requesting_camp: campId, status: 'PENDING' },
    }),
    prisma.inventories.findMany({
      where: { camp_id: campId },
      select: { quantity: true },
    }),
    prisma.inventories.findMany({
      where: { camp_id: campId },
      select: {
        quantity: true,
        resource_type: { select: { minimum_stock: true } },
      },
    }),
  ]);

  const totalResourcesValue = inventoryRows.reduce((sum, row) => sum + asNumber(row.quantity), 0);

  const lowResourceAlertsCount = lowResourceRows.filter(
    (row) => asNumber(row.quantity) < asNumber(row.resource_type.minimum_stock),
  ).length;

  return {
    survivor_count: survivorCount,
    healthy_count: healthyCount,
    injured_count: injuredCount,
    absent_count: absentCount,
    resource_types_count: resourceTypesCount,
    total_resources_value: Math.round(totalResourcesValue * 100) / 100,
    active_expeditions_count: activeExpeditionsCount,
    pending_transfers_count: pendingTransfersCount,
    low_resource_alerts_count: lowResourceAlertsCount,
  };
}

export async function getResources(campId: number) {
  const inventoryRows = await prisma.inventories.findMany({
    where: { camp_id: campId },
    select: {
      resource_type_id: true,
      quantity: true,
      resource_type: {
        select: {
          id: true,
          name: true,
          minimum_stock: true,
        },
      },
    },
  });

  return inventoryRows
    .map((row) => {
      const quantity = asNumber(row.quantity);
      const minThreshold = asNumber(row.resource_type.minimum_stock);

      let status: 'OK' | 'LOW' | 'CRITICAL' | 'OVERSTOCKED';

      if (quantity < minThreshold * 0.5) {
        status = 'CRITICAL';
      } else if (quantity < minThreshold) {
        status = 'LOW';
      } else if (quantity > minThreshold * 3) {
        status = 'OVERSTOCKED';
      } else {
        status = 'OK';
      }

      return {
        resource_id: row.resource_type_id,
        resource_name: row.resource_type.name,
        quantity_current: quantity,
        quantity_min_threshold: minThreshold,
        quantity_max_capacity: null,
        status,
      };
    })
    .sort((a, b) => a.resource_name.localeCompare(b.resource_name));
}

export async function getLowResourceAlerts(campId: number) {
  const resources = await getResources(campId);

  return resources.filter(
    (resource) => resource.status === 'LOW' || resource.status === 'CRITICAL',
  );
}

export async function getPeople(campId: number) {
  const [totalSurvivors, byProfession, byStatus, camp] = await Promise.all([
    prisma.people.count({ where: { camp_id: campId, status: { not: 'DEAD' } } }),
    prisma.people.groupBy({
      by: ['profession_id'],
      where: { camp_id: campId, status: { not: 'DEAD' } },
      _count: true,
    }),
    prisma.people.groupBy({
      by: ['status'],
      where: { camp_id: campId },
      _count: true,
    }),
    prisma.camps.findUnique({
      where: { id: campId },
      select: { id: true },
    }),
  ]);

  if (!camp) throw new AppError('Camp not found', 404);

  const professionIds = byProfession.map((p) => p.profession_id);
  const professions = await prisma.professions.findMany({
    where: { id: { in: professionIds } },
    select: { id: true, name: true },
  });
  const professionMap = new Map(professions.map((p) => [p.id, p.name]));

  const byProfessionResult = byProfession.map((row) => ({
    profession_name: professionMap.get(row.profession_id) ?? 'Unknown',
    count: row._count,
  }));

  const byStatusResult = byStatus.map((row) => ({
    status: row.status,
    count: row._count,
  }));

  return {
    total_survivors: totalSurvivors,
    by_profession: byProfessionResult,
    by_status: byStatusResult,
    average_capacity_utilization_percent: 0,
  };
}

export async function getExpeditions(campId: number) {
  const now = new Date();

  const expeditions = await prisma.expeditions.findMany({
    where: { camp_id: campId },
    include: {
      expedition_members: true,
      expedition_allocated_resources: {
        include: {
          resource_type: true,
        },
      },
    },
    orderBy: { id: 'desc' },
  });

  return expeditions.map((exp) => {
    const participantCount = exp.expedition_members.length;
    const resourceConsumptionTotal = exp.expedition_allocated_resources.reduce(
      (sum, r) => sum + asNumber(r.amount),
      0,
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - new Date(exp.departure_date).getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      expedition_id: exp.id,
      name: exp.destination,
      status: exp.status,
      participant_count: participantCount,
      resource_consumption_total: Math.round(resourceConsumptionTotal * 100) / 100,
      days_elapsed: daysElapsed > 0 ? daysElapsed : 0,
      expected_return_date: exp.expected_return_date,
    };
  });
}

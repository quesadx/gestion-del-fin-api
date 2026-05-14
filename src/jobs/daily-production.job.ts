import { logger } from '../logger/logger.js';
import { getAllCamps } from '../modules/camps/camps.service.js';
import {
  increaseInventoryWithLog,
  logLowResourceAlerts,
} from '../modules/inventory/inventory.service.js';
import {
  getActiveContributionOverridesByCamp,
  getActivePeopleWithProfessionsByCamp,
} from '../modules/people/people.service.js';
import { getProfessionResourceAmounts } from '../modules/professions/professions.service.js';

type Camp = { id: number; name: string };

type ActivePerson = Awaited<ReturnType<typeof getActivePeopleWithProfessionsByCamp>>[number];
type ProfessionResourceAmount = Awaited<ReturnType<typeof getProfessionResourceAmounts>>[number];

function asNumber(value: unknown) {
  return Number(value);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function buildProfessionTotals(
  people: ActivePerson[],
  professionResourceAmounts: ProfessionResourceAmount[],
) {
  const activePeopleByProfession = new Map<number, number>();

  for (const person of people) {
    activePeopleByProfession.set(
      person.profession_id,
      (activePeopleByProfession.get(person.profession_id) ?? 0) + 1,
    );
  }

  const totals = new Map<number, number>();

  for (const amount of professionResourceAmounts) {
    const activeCount = activePeopleByProfession.get(amount.professions_id) ?? 0;

    if (activeCount === 0) {
      continue;
    }

    const total = roundToTwoDecimals(asNumber(amount.amount) * activeCount);
    if (total <= 0) {
      continue;
    }

    totals.set(
      amount.resource_type_id,
      roundToTwoDecimals((totals.get(amount.resource_type_id) ?? 0) + total),
    );
  }

  return totals;
}

async function processCampProduction(
  camp: Camp,
  professionResourceAmounts: ProfessionResourceAmount[],
) {
  const [people, activeOverrides] = await Promise.all([
    getActivePeopleWithProfessionsByCamp(camp.id),
    getActiveContributionOverridesByCamp(camp.id),
  ]);

  if (people.length === 0) {
    logger.info(` [JOB] Camp ${camp.id} (${camp.name}): no active people, skipping production`);
    return;
  }

  const professionResourceAmountsForCamp = professionResourceAmounts.filter(
    (amount: ProfessionResourceAmount) =>
      people.some((person: ActivePerson) => person.profession_id === amount.professions_id),
  );

  if (professionResourceAmountsForCamp.length === 0 && activeOverrides.length === 0) {
    logger.info(` [JOB] Camp ${camp.id} (${camp.name}): no production configured`);
    return;
  }

  const totals = buildProfessionTotals(people, professionResourceAmountsForCamp);

  for (const override of activeOverrides) {
    const currentTotal = totals.get(override.resource_type_id) ?? 0;
    totals.set(
      override.resource_type_id,
      roundToTwoDecimals(currentTotal + asNumber(override.amount)),
    );
  }

  const appliedTotals = Array.from(totals.entries()).filter(([, total]) => total > 0);

  if (appliedTotals.length === 0) {
    logger.info(` [JOB] Camp ${camp.id} (${camp.name}): production netted no positive gains`);
    return;
  }

  for (const [resourceTypeId, quantity] of appliedTotals) {
    await increaseInventoryWithLog(
      camp.id,
      resourceTypeId,
      quantity,
      `Daily production from professions and overrides for camp ${camp.id}`,
      { logAlerts: false },
    );
  }

  await logLowResourceAlerts(camp.id);

  logger.info(
    ` [JOB] Camp ${camp.id} (${camp.name}): applied ${appliedTotals.length} production movement(s)`,
  );
}

export async function execute() {
  const [camps, professionResourceAmounts] = await Promise.all([
    getAllCamps(),
    getProfessionResourceAmounts(),
  ]);

  for (const camp of camps) {
    await processCampProduction(camp, professionResourceAmounts);
  }
}

export default { execute };

import { logger } from '../logger/logger.js';
import { getAllCamps } from '../modules/camps/camps.service.js';
import {
  consumeInventoryWithLog,
  logLowResourceAlerts,
} from '../modules/inventory/inventory.service.js';
import { getActivePeopleWithProfessionsByCamp } from '../modules/people/people.service.js';
import { getDailyRationResources } from '../modules/resources/resources.service.js';

type PersonWithProfession = Awaited<
  ReturnType<typeof getActivePeopleWithProfessionsByCamp>
>[number];
type DailyRationResource = Awaited<ReturnType<typeof getDailyRationResources>>[number];

type AssignmentMap = Record<number, Record<number, number>>;

const CHILD_AGE = Number(process.env.CHILD_AGE) || 12;

function isChild(person: PersonWithProfession) {
  return person.age == null || person.age <= CHILD_AGE;
}

function isDoctor(person: PersonWithProfession) {
  const professionName = person.professions?.name?.toLowerCase();
  return typeof professionName === 'string'
    ? professionName.includes('doctor') || professionName.includes('medic')
    : false;
}

function isExplorer(person: PersonWithProfession) {
  const professionName = person.professions?.name?.toLowerCase();
  return typeof professionName === 'string'
    ? professionName.includes('explorer') || professionName.includes('scout')
    : false;
}

function buildPriorityPeople(people: PersonWithProfession[]) {
  const seen = new Set<number>();
  const priority: PersonWithProfession[] = [];

  for (const person of people.filter(isChild)) {
    seen.add(person.id);
    priority.push(person);
  }

  for (const person of people.filter((value) => !seen.has(value.id) && isDoctor(value))) {
    seen.add(person.id);
    priority.push(person);
  }

  for (const person of people.filter((value) => !seen.has(value.id) && isExplorer(value))) {
    seen.add(person.id);
    priority.push(person);
  }

  for (const person of people) {
    if (!seen.has(person.id)) {
      priority.push(person);
    }
  }

  return priority;
}

function createAssignments(priority: PersonWithProfession[]) {
  return priority.reduce<AssignmentMap>((accumulator, person) => {
    accumulator[person.id] = {};
    return accumulator;
  }, {});
}

function getInventoryForCamp(resource: DailyRationResource, campId: number) {
  const inv = resource.inventories.find((i: { camp_id: number }) => i.camp_id === campId);
  return inv || null;
}

function countServed(assignments: AssignmentMap) {
  return Object.values(assignments).filter((value) => Object.keys(value).length > 0).length;
}

async function distributeResource(params: {
  campId: number;
  resource: DailyRationResource;
  assignments: AssignmentMap;
}) {
  const { campId, resource, assignments } = params;

  const inventory = getInventoryForCamp(resource, campId);
  if (!inventory) {
    logger.info(` [JOB] Camp ${campId}: no inventory found for ${resource.name}`);
    return;
  }

  const available = Number(inventory.quantity);
  const perPersonNeed = Number(resource.daily_ration);

  if (available <= 0 || perPersonNeed <= 0) {
    logger.info(
      ` [JOB] Camp ${campId}: ${resource.name} has no quantity or invalid ration (${available}/${perPersonNeed})`,
    );
    return;
  }

  const recipientIds = Object.keys(assignments).map((id) => Number(id));
  const fullPortions = Math.floor(available / perPersonNeed);

  if (fullPortions <= 0) {
    logger.info(` [JOB] Camp ${campId}: insufficient ${resource.name} for one ration per person`);
    return;
  }

  const selectedRecipientIds =
    fullPortions >= recipientIds.length ? recipientIds : recipientIds.slice(0, fullPortions);
  const consumeTotal = Number((perPersonNeed * selectedRecipientIds.length).toFixed(2));

  for (const personId of selectedRecipientIds) {
    assignments[personId][resource.id] = perPersonNeed;
  }

  await consumeInventoryWithLog(
    campId,
    resource.id,
    consumeTotal,
    `Daily ${resource.name} distribution`,
    { logAlerts: false },
  );

  if (selectedRecipientIds.length === recipientIds.length) {
    logger.info(
      ` [JOB] Camp ${campId}: ${resource.name} distributed to all (${consumeTotal} ${resource.unit})`,
    );
  } else {
    logger.info(
      ` [JOB] Camp ${campId}: ${resource.name} supplied to ${selectedRecipientIds.length} people`,
    );
  }
}

async function processCampRations(camp: { id: number; name: string }) {
  const people = await getActivePeopleWithProfessionsByCamp(camp.id);

  if (people.length === 0) {
    logger.info(` [JOB] Camp ${camp.id} (${camp.name}): no active people, skipping`);
    return;
  }

  const priority = buildPriorityPeople(people);
  const assignments = createAssignments(priority);

  const rationResources = await getDailyRationResources(camp.id);

  if (rationResources.length === 0) {
    logger.info(` [JOB] Camp ${camp.id} (${camp.name}): no daily ration resources configured`);
    return;
  }

  for (const resource of rationResources) {
    await distributeResource({ campId: camp.id, resource, assignments });
  }

  await logLowResourceAlerts(camp.id);

  const served = countServed(assignments);
  logger.info(
    ` [JOB] Camp ${camp.id}: assignments completed for ${served}/${priority.length} people`,
  );
}

export async function execute() {
  const camps = await getAllCamps();

  for (const camp of camps) {
    await processCampRations(camp);
  }
}

export default { execute };

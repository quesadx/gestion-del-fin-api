import { prisma } from '../../lib/prisma.js';
import { Prisma, persons_status } from '../../generated/prisma/client.js';
import { AppError } from '../../shared/utils/appError.js';
// cspell:ignore Toprofessions
import {
  handleForeignKeyError,
  handleUniqueConstraintError,
} from '../../shared/utils/handlePrismaError.js';
import {
  CreateContributionOverrideDto,
  CreatePersonDto,
  CreatePersonStatusLogDto,
  CreateProfessionReassignmentDto,
  UpdatePersonDto,
} from './people.schema.js';

const personInclude = { camps: true, professions: true };
const ACTIVE_PERSON_STATUS_SET = new Set<persons_status>(
  Object.values(persons_status).filter((status) => status !== persons_status.DEAD),
);

type PeopleTransactionClient = Prisma.TransactionClient;

function parseDate(dateStr?: string) {
  if (!dateStr) return undefined;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid admitted_at date: ${dateStr}`, 400);
  }

  return date;
}

function parseDateOnly(dateStr: string | undefined, fieldName: string) {
  if (!dateStr) return undefined;

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid ${fieldName} date: ${dateStr}`, 400);
  }

  return date;
}

async function ensureCampExists(campId: number) {
  const camp = await prisma.camps.findUnique({ where: { id: campId }, select: { id: true } });
  if (!camp) {
    throw new AppError(`Camp not found: ${campId}`, 404);
  }
}

async function ensureProfessionExists(professionId: number) {
  const profession = await prisma.professions.findUnique({
    where: { id: professionId },
    select: { id: true },
  });

  if (!profession) {
    throw new AppError(`Profession not found: ${professionId}`, 404);
  }
}

async function ensureProfessionExistsTx(tx: PeopleTransactionClient, professionId: number) {
  const profession = await tx.professions.findUnique({
    where: { id: professionId },
    select: { id: true },
  });

  if (!profession) {
    throw new AppError(`Profession not found: ${professionId}`, 404);
  }
}

async function ensureResourceTypeExistsTx(tx: PeopleTransactionClient, resourceTypeId: number) {
  const resourceType = await tx.resource_type.findUnique({
    where: { id: resourceTypeId },
    select: { id: true },
  });

  if (!resourceType) {
    throw new AppError(`Resource not found: ${resourceTypeId}`, 404);
  }
}

async function ensureUserExistsTx(tx: PeopleTransactionClient, userId: number) {
  const user = await tx.users.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new AppError(`User not found: ${userId}`, 404);
  }
}

async function ensurePersonBelongsToCamp(campId: number, personId: number) {
  const person = await prisma.persons.findUnique({
    where: { id: personId },
    select: { id: true, camp_id: true },
  });

  if (!person) {
    throw new AppError(`Person not found: ${personId}`, 404);
  }

  if (person.camp_id !== campId) {
    throw new AppError(`Person ${personId} does not belong to camp ${campId}`, 409);
  }
}

async function validateRelations(
  data: Partial<Pick<CreatePersonDto, 'camp_id' | 'profession_id'>>,
) {
  if (data.camp_id !== undefined) {
    await ensureCampExists(data.camp_id);
  }

  if (data.profession_id !== undefined) {
    await ensureProfessionExists(data.profession_id);
  }
}

function preparePersonCreateData(data: CreatePersonDto) {
  return {
    full_name: data.full_name.trim(),
    age: data.age,
    identification_code: data.identification_code,
    blood_type: data.blood_type,
    skills_summary: data.skills_summary?.trim(),
    photo_url: data.photo_url,
    status: data.status ?? 'HEALTHY',
    admitted_at: parseDate(data.admitted_at),
    camps: { connect: { id: data.camp_id } },
    professions: { connect: { id: data.profession_id } },
  };
}

function preparePersonUpdateData(data: UpdatePersonDto) {
  const { camp_id, profession_id, admitted_at, ...rest } = data;

  return {
    ...rest,
    full_name: rest.full_name?.trim(),
    skills_summary: rest.skills_summary?.trim(),
    admitted_at: admitted_at ? parseDate(admitted_at) : undefined,
    camps: camp_id ? { connect: { id: camp_id } } : undefined,
    professions: profession_id ? { connect: { id: profession_id } } : undefined,
  };
}

export async function createPerson(campId: number, data: CreatePersonDto) {
  if (data.camp_id !== campId) {
    throw new AppError(`camp_id in body (${data.camp_id}) must match URL campId (${campId})`, 400);
  }

  await validateRelations({ camp_id: campId, profession_id: data.profession_id });

  try {
    return await prisma.persons.create({
      data: preparePersonCreateData({ ...data, camp_id: campId }),
      include: personInclude,
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updatePerson(
  campId: number,
  id: number,
  data: UpdatePersonDto,
  changedBy: number,
) {
  await ensurePersonBelongsToCamp(campId, id);

  if (data.camp_id !== undefined && data.camp_id !== campId) {
    throw new AppError(`camp_id in body (${data.camp_id}) must match URL campId (${campId})`, 400);
  }

  await validateRelations({ camp_id: data.camp_id, profession_id: data.profession_id });

  return prisma.$transaction(async (tx: PeopleTransactionClient) => {
    await ensureUserExistsTx(tx, changedBy);

    const currentPerson = await tx.persons.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!currentPerson) {
      throw new AppError(`Person not found: ${id}`, 404);
    }

    const updatedPerson = await tx.persons.update({
      where: { id },
      data: preparePersonUpdateData({ ...data, camp_id: campId }),
      include: personInclude,
    });

    if (data.status && data.status !== currentPerson.status) {
      await tx.person_status_log.create({
        data: {
          person_id: id,
          old_status: currentPerson.status,
          new_status: data.status,
          reason: 'Status changed via people update endpoint',
          changed_by: changedBy,
        },
      });
    }

    return updatedPerson;
  });
}

export async function getPerson(campId: number, id: number) {
  const person = await prisma.persons.findUnique({ where: { id }, include: personInclude });
  if (!person) {
    throw new AppError(`Person not found: ${id}`, 404);
  }

  if (person.camp_id !== campId) {
    throw new AppError(`Person ${id} does not belong to camp ${campId}`, 409);
  }

  return person;
}

export async function getPeople(campId: number, page = 1, limit = 10) {
  await ensureCampExists(campId);

  return await prisma.persons.findMany({
    where: { camp_id: campId },
    skip: (page - 1) * limit,
    take: limit,
    include: personInclude,
  });
}

export async function deletePerson(campId: number, id: number) {
  await ensurePersonBelongsToCamp(campId, id);

  try {
    await prisma.persons.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

export async function createPersonStatusLog(
  campId: number,
  data: CreatePersonStatusLogDto,
  userId: number,
) {
  return prisma.$transaction(async (tx: PeopleTransactionClient) => {
    await ensureUserExistsTx(tx, userId);

    const person = await tx.persons.findUnique({
      where: { id: data.person_id },
      select: { id: true, camp_id: true, status: true },
    });

    if (!person) {
      throw new AppError(`Person not found: ${data.person_id}`, 404);
    }

    if (person.camp_id !== campId) {
      throw new AppError(`Person ${data.person_id} does not belong to camp ${campId}`, 409);
    }

    if (person.status === data.new_status) {
      throw new AppError('new_status must be different from current status', 400);
    }

    await tx.persons.update({
      where: { id: data.person_id },
      data: { status: data.new_status },
    });

    return tx.person_status_log.create({
      data: {
        person_id: data.person_id,
        old_status: person.status,
        new_status: data.new_status,
        reason: data.reason?.trim(),
        changed_by: userId,
      },
      include: {
        persons: {
          select: {
            id: true,
            full_name: true,
            status: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });
}

export async function createProfessionReassignment(
  campId: number,
  data: CreateProfessionReassignmentDto,
) {
  return prisma.$transaction(async (tx: PeopleTransactionClient) => {
    const person = await tx.persons.findUnique({
      where: { id: data.person_id },
      select: {
        id: true,
        camp_id: true,
        status: true,
        profession_id: true,
      },
    });

    if (!person) {
      throw new AppError(`Person not found: ${data.person_id}`, 404);
    }

    if (person.camp_id !== campId) {
      throw new AppError(`Person ${data.person_id} does not belong to camp ${campId}`, 409);
    }

    await Promise.all([
      ensureProfessionExistsTx(tx, data.from_profession_id),
      ensureProfessionExistsTx(tx, data.to_profession_id),
    ]);

    if (person.profession_id !== data.from_profession_id) {
      throw new AppError(
        `Person ${data.person_id} is currently assigned to profession ${person.profession_id}, not ${data.from_profession_id}`,
        409,
      );
    }

    const today = new Date();

    const activeReassignment = await tx.profession_reassignment_log.findFirst({
      where: {
        person_id: data.person_id,
        OR: [{ end_date: null }, { end_date: { gte: today } }],
      },
      select: { id: true, start_date: true, end_date: true },
    });

    if (activeReassignment) {
      throw new AppError(
        `Person ${data.person_id} already has an active profession reassignment (${activeReassignment.id})`,
        409,
      );
    }

    const targetActiveCount = await tx.persons.count({
      where: {
        camp_id: person.camp_id,
        profession_id: data.to_profession_id,
        status: { in: Array.from(ACTIVE_PERSON_STATUS_SET) },
      },
    });

    if (!ACTIVE_PERSON_STATUS_SET.has(person.status)) {
      throw new AppError(
        `Person ${data.person_id} has an inactive status (${person.status}) and cannot be reassigned`,
        400,
      );
    }

    const startDate = parseDateOnly(data.start_date, 'start_date');
    const endDate = parseDateOnly(data.end_date, 'end_date');

    await tx.persons.update({
      where: { id: data.person_id },
      data: { profession_id: data.to_profession_id },
    });

    const log = await tx.profession_reassignment_log.create({
      data: {
        person_id: data.person_id,
        from_profession_id: data.from_profession_id,
        to_profession_id: data.to_profession_id,
        reason: data.reason?.trim(),
        start_date: startDate,
        end_date: endDate,
      },
      include: {
        persons: {
          select: { id: true, full_name: true, profession_id: true },
        },
        professions_profession_reassignment_log_from_profession_idToprofessions: {
          select: { id: true, name: true },
        },
        professions_profession_reassignment_log_to_profession_idToprofessions: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      ...log,
      target_profession_had_no_active_people: targetActiveCount === 0,
    };
  });
}

export async function createContributionOverride(
  campId: number,
  data: CreateContributionOverrideDto,
  userId: number,
) {
  return prisma.$transaction(async (tx: PeopleTransactionClient) => {
    await Promise.all([
      ensureResourceTypeExistsTx(tx, data.resource_type_id),
      ensureUserExistsTx(tx, userId),
    ]);

    const person = await tx.persons.findUnique({
      where: { id: data.person_id },
      select: { id: true, camp_id: true },
    });

    if (!person) {
      throw new AppError(`Person not found: ${data.person_id}`, 404);
    }

    if (person.camp_id !== campId) {
      throw new AppError(`Person ${data.person_id} does not belong to camp ${campId}`, 409);
    }

    const startDate = parseDateOnly(data.start_date, 'start_date');
    const endDate = parseDateOnly(data.end_date, 'end_date');

    return tx.contribution_overrides.create({
      data: {
        person_id: data.person_id,
        resource_type_id: data.resource_type_id,
        reason: data.reason.trim(),
        start_date: startDate,
        end_date: endDate,
        created_by: userId,
        amount: data.amount,
      },
      include: {
        persons: {
          select: {
            id: true,
            full_name: true,
          },
        },
        resource_type: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });
}

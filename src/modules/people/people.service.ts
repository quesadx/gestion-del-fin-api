import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleForeignKeyError,
  handleUniqueConstraintError,
} from '../../shared/utils/handlePrismaError.js';
import { CreatePersonDto, UpdatePersonDto } from './people.schema.js';

const personInclude = { camps: true, professions: true };

function parseDate(dateStr?: string) {
  if (!dateStr) return undefined;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid admitted_at date: ${dateStr}`, 400);
  }

  return date;
}

async function ensureCampExists(campId: number) {
  const camp = await prisma.camps.findUnique({ where: { id: campId } });
  if (!camp) {
    throw new AppError(`camp_id does not exist: ${campId}`, 404);
  }
}

async function ensureProfessionExists(professionId: number) {
  const profession = await prisma.professions.findUnique({ where: { id: professionId } });
  if (!profession) {
    throw new AppError(`profession_id does not exist: ${professionId}`, 404);
  }
}

async function ensurePersonExists(id: number) {
  const person = await prisma.persons.findUnique({ where: { id } });
  if (!person) {
    throw new AppError(`Person not found: ${id}`, 404);
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

export async function createPerson(data: CreatePersonDto) {
  await validateRelations({ camp_id: data.camp_id, profession_id: data.profession_id });

  try {
    return await prisma.persons.create({
      data: preparePersonCreateData(data),
      include: personInclude,
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updatePerson(id: number, data: UpdatePersonDto) {
  await ensurePersonExists(id);
  await validateRelations({ camp_id: data.camp_id, profession_id: data.profession_id });

  try {
    return await prisma.persons.update({
      where: { id },
      data: preparePersonUpdateData(data),
      include: personInclude,
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getPerson(id: number) {
  const person = await prisma.persons.findUnique({ where: { id }, include: personInclude });
  if (!person) {
    throw new AppError(`Person not found: ${id}`, 404);
  }

  return person;
}

export async function getPeople(page = 1, limit = 10) {
  return await prisma.persons.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: personInclude,
  });
}

export async function deletePerson(id: number) {
  await ensurePersonExists(id);

  try {
    await prisma.persons.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

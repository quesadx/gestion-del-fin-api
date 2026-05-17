import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateProfessionDto, UpdateProfessionDto } from './professions.schema.js';

function prepareProfessionCreateData(data: CreateProfessionDto) {
  return {
    name: data.name.trim(),
    description: data.description?.trim(),
  };
}

function prepareProfessionalUpdateData(data: UpdateProfessionDto) {
  return {
    name: data.name?.trim(),
    description: data.description?.trim(),
  };
}

export async function createProfession(data: CreateProfessionDto) {
  try {
    return await prisma.professions.create({
      data: prepareProfessionCreateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateProfession(id: number, data: UpdateProfessionDto) {
  const profession = await prisma.professions.findUnique({ where: { id } });
  if (!profession) throw new AppError(`Profession not found: ${id}`, 404);

  try {
    return await prisma.professions.update({
      where: { id },
      data: prepareProfessionalUpdateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getProfession(id: number) {
  const profession = await prisma.professions.findUnique({ where: { id } });
  if (!profession) throw new AppError(`Profession not found: ${id}`, 404);
  return profession;
}

export async function getProfessions(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [records, total] = await Promise.all([
    prisma.professions.findMany({ skip, take: effectiveLimit }),
    prisma.professions.count(),
  ]);

  return {
    data: records,
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
}

export async function deleteProfession(id: number) {
  const profession = await prisma.professions.findUnique({ where: { id } });
  if (!profession) throw new AppError(`Profession not found: ${id}`, 404);

  try {
    await prisma.professions.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

export async function getProfessionResourceAmounts() {
  return prisma.professions_resources_amounts.findMany({
    select: {
      profession_id: true,
      resource_type_id: true,
      amount: true,
      professions: {
        select: {
          id: true,
          name: true,
        },
      },
      resource_type: {
        select: {
          id: true,
          name: true,
          unit: true,
        },
      },
    },
    orderBy: [{ profession_id: 'asc' }, { resource_type_id: 'asc' }],
  });
}

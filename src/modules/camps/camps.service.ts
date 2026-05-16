import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateCampDto, UpdateCampDto } from './camps.schema.js';

function prepareCampCreateData(data: CreateCampDto) {
  return {
    name: data.name,
    location: data.location?.trim(),
    status: data.status ?? 'ACTIVE',
    ai_context_prompt: data.ai_context_prompt?.trim(),
  };
}

function prepareCampUpdateData(data: UpdateCampDto) {
  return {
    name: data.name,
    location: data.location?.trim(),
    status: data.status,
    ai_context_prompt: data.ai_context_prompt?.trim(),
  };
}

export async function createCamp(data: CreateCampDto) {
  try {
    return await prisma.camps.create({
      data: prepareCampCreateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateCamp(id: number, data: UpdateCampDto) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);

  try {
    return await prisma.camps.update({
      where: { id },
      data: prepareCampUpdateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getCamp(id: number) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);
  return camp;
}

export async function getAllCamps() {
  return prisma.camps.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
}

export async function getCamps(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [records, total] = await Promise.all([
    prisma.camps.findMany({ skip, take: effectiveLimit }),
    prisma.camps.count(),
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

export async function deleteCamp(id: number) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);
  try {
    await prisma.camps.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

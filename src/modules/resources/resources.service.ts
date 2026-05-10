import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateResourceDto, UpdateResourceDto } from './resources.schema.js';

function prepareResourceCreateData(data: CreateResourceDto) {
  return {
    name: data.name.trim(),
    unit: data.unit.trim(),
    daily_ration: data.daily_ration,
    minimum_stock: data.minimum_stock,
    auto_daily: data.auto_daily ?? false,
  };
}

function prepareResourceUpdateData(data: UpdateResourceDto) {
  return {
    name: data.name?.trim(),
    unit: data.unit?.trim(),
    daily_ration: data.daily_ration,
    minimum_stock: data.minimum_stock,
    auto_daily: data.auto_daily,
  };
}

export async function createResource(data: CreateResourceDto) {
  try {
    return await prisma.resource_type.create({
      data: prepareResourceCreateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateResource(id: number, data: UpdateResourceDto) {
  const resource = await prisma.resource_type.findUnique({ where: { id } });
  if (!resource) throw new AppError(`Resource not found: ${id}`, 404);

  try {
    return await prisma.resource_type.update({
      where: { id },
      data: prepareResourceUpdateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getResource(id: number) {
  const resource = await prisma.resource_type.findUnique({ where: { id } });
  if (!resource) throw new AppError(`Resource not found: ${id}`, 404);
  return resource;
}

export async function getResources(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [records, total] = await Promise.all([
    prisma.resource_type.findMany({ skip, take: effectiveLimit }),
    prisma.resource_type.count(),
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

export async function deleteResource(id: number) {
  const resource = await prisma.resource_type.findUnique({ where: { id } });
  if (!resource) throw new AppError(`Resource not found: ${id}`, 404);
  try {
    await prisma.resource_type.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

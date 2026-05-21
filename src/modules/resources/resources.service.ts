import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateResourceDto, UpdateResourceDto } from './resources.schema.js';
import { deleteByPrefix, deleteKeys, getOrSetCacheJson } from '../../lib/cache.js';
import { cacheKeys, cacheTtl } from '../../shared/cache/cacheKeys.js';

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

async function invalidateResourceCache(resourceId?: number) {
  const keys: string[] = [cacheKeys.professionResources];
  if (resourceId) keys.push(cacheKeys.resourceType(resourceId));
  await deleteKeys(keys);
  await deleteByPrefix(cacheKeys.resourceTypesListPrefix);
}

export async function createResource(data: CreateResourceDto) {
  try {
    const created = await prisma.resource_types.create({
      data: prepareResourceCreateData(data),
    });
    await invalidateResourceCache(created.id);
    return created;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateResource(id: number, data: UpdateResourceDto) {
  const resource = await prisma.resource_types.findUnique({ where: { id } });
  if (!resource) throw new AppError(`Resource not found: ${id}`, 404);

  try {
    const updated = await prisma.resource_types.update({
      where: { id },
      data: prepareResourceUpdateData(data),
    });
    await invalidateResourceCache(id);
    return updated;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getResource(id: number) {
  const cacheKey = cacheKeys.resourceType(id);
  return getOrSetCacheJson(cacheKey, cacheTtl.resourceTypes, async () => {
    const resource = await prisma.resource_types.findUnique({ where: { id } });
    if (!resource) throw new AppError(`Resource not found: ${id}`, 404);
    return resource;
  });
}

export async function getResources(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const cacheKey = cacheKeys.resourceTypesList(page, effectiveLimit);
  return getOrSetCacheJson(cacheKey, cacheTtl.resourceTypes, async () => {
    const [records, total] = await Promise.all([
      prisma.resource_types.findMany({ skip, take: effectiveLimit }),
      prisma.resource_types.count(),
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
  });
}

export async function deleteResource(id: number) {
  const resource = await prisma.resource_types.findUnique({ where: { id } });
  if (!resource) throw new AppError(`Resource not found: ${id}`, 404);
  try {
    await prisma.resource_types.delete({ where: { id } });
    await invalidateResourceCache(id);
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

export async function getDailyRationResources(campId: number) {
  return await prisma.resource_types.findMany({
    where: { auto_daily: true },
    include: {
      inventories: {
        where: { camp_id: campId },
        select: {
          camp_id: true,
          resource_type_id: true,
          quantity: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
}

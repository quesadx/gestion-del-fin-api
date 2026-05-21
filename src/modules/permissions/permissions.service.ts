import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreatePermissionDto, UpdatePermissionDto } from './permissions.schema.js';
import { deleteByPrefix, deleteKeys, getOrSetCacheJson } from '../../lib/cache.js';
import { cacheKeys, cacheTtl } from '../../shared/cache/cacheKeys.js';

function preparePermissionCreateData(data: CreatePermissionDto) {
  return {
    name: data.name.trim(),
    description: data.description?.trim(),
  };
}

function preparePermissionUpdateData(data: UpdatePermissionDto) {
  return {
    name: data.name?.trim(),
    description: data.description?.trim(),
  };
}

async function invalidatePermissionCache(permissionId?: number) {
  const keys: string[] = [];
  if (permissionId) keys.push(cacheKeys.permission(permissionId));
  await deleteKeys(keys);
  await deleteByPrefix(cacheKeys.permissionsListPrefix);
  await deleteByPrefix(cacheKeys.rolesListPrefix);
  await deleteByPrefix(cacheKeys.rolePrefix);
}

export async function createPermission(data: CreatePermissionDto) {
  try {
    const created = await prisma.permissions.create({
      data: preparePermissionCreateData(data),
    });
    await invalidatePermissionCache(created.id);
    return created;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updatePermission(id: number, data: UpdatePermissionDto) {
  const permission = await prisma.permissions.findUnique({ where: { id } });
  if (!permission) throw new AppError(`Permission not found: ${id}`, 404);

  try {
    const updated = await prisma.permissions.update({
      where: { id },
      data: preparePermissionUpdateData(data),
    });
    await invalidatePermissionCache(id);
    return updated;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getPermission(id: number) {
  const cacheKey = cacheKeys.permission(id);
  return getOrSetCacheJson(cacheKey, cacheTtl.permissions, async () => {
    const permission = await prisma.permissions.findUnique({ where: { id } });
    if (!permission) throw new AppError(`Permission not found: ${id}`, 404);
    return permission;
  });
}

export async function getPermissions(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const cacheKey = cacheKeys.permissionsList(page, effectiveLimit);
  return getOrSetCacheJson(cacheKey, cacheTtl.permissions, async () => {
    const [records, total] = await Promise.all([
      prisma.permissions.findMany({ skip, take: effectiveLimit, orderBy: { id: 'asc' } }),
      prisma.permissions.count(),
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

export async function deletePermission(id: number) {
  const permission = await prisma.permissions.findUnique({ where: { id } });
  if (!permission) throw new AppError(`Permission not found: ${id}`, 404);

  try {
    await prisma.permissions.delete({ where: { id } });
    await invalidatePermissionCache(id);
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

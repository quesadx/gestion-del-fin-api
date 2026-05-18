import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreatePermissionDto, UpdatePermissionDto } from './permissions.schema.js';

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

export async function createPermission(data: CreatePermissionDto) {
  try {
    return await prisma.permissions.create({
      data: preparePermissionCreateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updatePermission(id: number, data: UpdatePermissionDto) {
  const permission = await prisma.permissions.findUnique({ where: { id } });
  if (!permission) throw new AppError(`Permission not found: ${id}`, 404);

  try {
    return await prisma.permissions.update({
      where: { id },
      data: preparePermissionUpdateData(data),
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getPermission(id: number) {
  const permission = await prisma.permissions.findUnique({ where: { id } });
  if (!permission) throw new AppError(`Permission not found: ${id}`, 404);
  return permission;
}

export async function getPermissions(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

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
}

export async function deletePermission(id: number) {
  const permission = await prisma.permissions.findUnique({ where: { id } });
  if (!permission) throw new AppError(`Permission not found: ${id}`, 404);

  try {
    await prisma.permissions.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateRoleDto, UpdateRoleDto } from './roles.schema.js';
import { z } from 'zod';
import { deleteByPrefix, deleteKeys, getOrSetCacheJson } from '../../lib/cache.js';
import { cacheKeys, cacheTtl } from '../../shared/cache/cacheKeys.js';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  role_permissions: {
    select: { permissions: { select: { id: true, name: true, description: true } } },
  },
} as const;

const RoleWithPermissionsSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
  role_permissions: z.array(
    z.object({
      permissions: z.object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable(),
      }),
    }),
  ),
});

type RoleWithPermissions = z.infer<typeof RoleWithPermissionsSchema>;

function normalizePermissionIds(permissionIds?: number[]): number[] {
  if (!permissionIds) return [];
  return Array.from(new Set(permissionIds));
}

async function ensurePermissionsExist(permissionIds: number[]) {
  if (permissionIds.length === 0) return;

  const permissions = await prisma.permissions.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });

  if (permissions.length !== permissionIds.length) {
    const found = new Set(permissions.map((permission) => permission.id));
    const missing = permissionIds.filter((id) => !found.has(id));
    throw new AppError(`Permissions not found: ${missing.join(', ')}`, 404);
  }
}

function mapRole(role: RoleWithPermissions) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    created_at: role.created_at,
    updated_at: role.updated_at,
    deleted_at: role.deleted_at,
    permissions: role.role_permissions.map((entry) => entry.permissions),
  };
}

async function invalidateRoleCache(roleId?: number) {
  const keys: string[] = [];
  if (roleId) keys.push(cacheKeys.role(roleId));
  await deleteKeys(keys);
  await deleteByPrefix(cacheKeys.rolesListPrefix);
}

export async function createRole(data: CreateRoleDto) {
  const permissionIds = normalizePermissionIds(data.permission_ids);
  await ensurePermissionsExist(permissionIds);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: {
          name: data.name,
          description: data.description?.trim(),
        },
      });

      if (permissionIds.length > 0) {
        await tx.role_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: role.id,
            permission_id: permissionId,
          })),
        });
      }

      return tx.roles.findUnique({ where: { id: role.id }, select: roleSelect });
    });

    const mapped = mapRole(RoleWithPermissionsSchema.parse(created));
    await invalidateRoleCache(mapped.id);
    return mapped;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateRole(id: number, data: UpdateRoleDto) {
  const role = await prisma.roles.findUnique({ where: { id } });
  if (!role) throw new AppError(`Role not found: ${id}`, 404);

  let normalizedPermissionIds: number[] | undefined;
  if (data.permission_ids !== undefined) {
    normalizedPermissionIds = normalizePermissionIds(data.permission_ids);
    await ensurePermissionsExist(normalizedPermissionIds);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.roles.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description?.trim(),
        },
      });

      if (data.permission_ids !== undefined) {
        await tx.role_permissions.deleteMany({ where: { role_id: id } });
        if (normalizedPermissionIds!.length > 0) {
          await tx.role_permissions.createMany({
            data: normalizedPermissionIds!.map((permissionId) => ({
              role_id: id,
              permission_id: permissionId,
            })),
          });
        }
      }

      return tx.roles.findUnique({ where: { id }, select: roleSelect });
    });

    if (!updated) throw new AppError(`Role not found: ${id}`, 404);
    const mapped = mapRole(RoleWithPermissionsSchema.parse(updated));
    await invalidateRoleCache(id);
    return mapped;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getRole(id: number) {
  const cacheKey = cacheKeys.role(id);
  return getOrSetCacheJson(cacheKey, cacheTtl.roles, async () => {
    const role = await prisma.roles.findUnique({ where: { id }, select: roleSelect });
    if (!role) throw new AppError(`Role not found: ${id}`, 404);
    return mapRole(RoleWithPermissionsSchema.parse(role));
  });
}

export async function getRoles(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const cacheKey = cacheKeys.rolesList(page, effectiveLimit);
  return getOrSetCacheJson(cacheKey, cacheTtl.roles, async () => {
    const [records, total] = await Promise.all([
      prisma.roles.findMany({
        skip,
        take: effectiveLimit,
        select: roleSelect,
        orderBy: { id: 'asc' },
      }),
      prisma.roles.count(),
    ]);

    return {
      data: records.map((record) => mapRole(RoleWithPermissionsSchema.parse(record))),
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

export async function deleteRole(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.roles.findUnique({ where: { id }, select: { id: true } });
      if (!role) throw new AppError(`Role not found: ${id}`, 404);
      const userCount = await tx.users.count({ where: { role_id: id } });
      if (userCount > 0) {
        throw new AppError(
          `Cannot delete role: ${userCount} user(s) are assigned to this role`,
          409,
        );
      }
      await tx.role_permissions.deleteMany({ where: { role_id: id } });
      await tx.roles.delete({ where: { id } });
    });
    await invalidateRoleCache(id);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    handleForeignKeyError(error);
  }
}

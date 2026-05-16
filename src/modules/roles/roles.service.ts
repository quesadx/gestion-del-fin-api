import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateRoleDto, UpdateRoleDto } from './roles.schema.js';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  role_permissions: {
    select: { permissions: { select: { id: true, name: true, description: true } } },
  },
} as const;

type RoleWithPermissions = {
  id: number;
  name: string;
  description: string | null;
  role_permissions: Array<{
    permissions: { id: number; name: string; description: string | null };
  }>;
};

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
    permissions: role.role_permissions.map((entry) => entry.permissions),
  };
}

export async function createRole(data: CreateRoleDto) {
  const permissionIds = normalizePermissionIds(data.permission_ids);
  await ensurePermissionsExist(permissionIds);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: {
          name: data.name.trim(),
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

    if (!created) throw new AppError('Role creation failed', 500);
    return mapRole(created as RoleWithPermissions);
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateRole(id: number, data: UpdateRoleDto) {
  const role = await prisma.roles.findUnique({ where: { id } });
  if (!role) throw new AppError(`Role not found: ${id}`, 404);

  const permissionIds = normalizePermissionIds(data.permission_ids);
  await ensurePermissionsExist(permissionIds);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.roles.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          description: data.description?.trim(),
        },
      });

      if (data.permission_ids !== undefined) {
        await tx.role_permissions.deleteMany({ where: { role_id: id } });
        if (permissionIds.length > 0) {
          await tx.role_permissions.createMany({
            data: permissionIds.map((permissionId) => ({
              role_id: id,
              permission_id: permissionId,
            })),
          });
        }
      }

      return tx.roles.findUnique({ where: { id }, select: roleSelect });
    });

    if (!updated) throw new AppError(`Role not found: ${id}`, 404);
    return mapRole(updated as RoleWithPermissions);
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getRole(id: number) {
  const role = await prisma.roles.findUnique({ where: { id }, select: roleSelect });
  if (!role) throw new AppError(`Role not found: ${id}`, 404);
  return mapRole(role as RoleWithPermissions);
}

export async function getRoles(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

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
    data: records.map((record) => mapRole(record as RoleWithPermissions)),
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
}

export async function deleteRole(id: number) {
  const role = await prisma.roles.findUnique({ where: { id } });
  if (!role) throw new AppError(`Role not found: ${id}`, 404);

  try {
    await prisma.roles.delete({ where: { id } });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

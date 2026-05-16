import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { handleUniqueConstraintError } from '../../shared/utils/handlePrismaError.js';
import { CreateUserDto, UpdateUserDto } from './users.schema.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

async function prepareUserCreateData(data: CreateUserDto) {
  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

  return {
    username: data.username.trim(),
    password_hash,
    camp_id: data.camp_id,
    role_id: data.role_id,
    is_active: data.is_active ?? true,
    last_activity: data.last_activity,
    created_at: data.created_at,
  };
}

async function prepareUserUpdateData(data: UpdateUserDto) {
  const password_hash = data.password ? await bcrypt.hash(data.password, SALT_ROUNDS) : undefined;

  return {
    username: data.username?.trim(),
    password_hash,
    camp_id: data.camp_id,
    role_id: data.role_id,
    is_active: data.is_active,
    last_activity: data.last_activity,
  };
}

const userSelectWithoutPassword = {
  id: true,
  camp_id: true,
  role_id: true,
  session_version: true,
  username: true,
  is_active: true,
  last_activity: true,
  created_at: true,
} as const;

export async function createUser(data: CreateUserDto) {
  try {
    return await prisma.users.create({
      data: await prepareUserCreateData(data),
      select: userSelectWithoutPassword,
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateUser(id: number, data: UpdateUserDto) {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new AppError(`User not found: ${id}`, 404);

  try {
    return await prisma.users.update({
      where: { id },
      data: await prepareUserUpdateData(data),
      select: userSelectWithoutPassword,
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getUser(id: number) {
  const user = await prisma.users.findUnique({
    where: { id },
    select: userSelectWithoutPassword,
  });
  if (!user) throw new AppError(`User not found: ${id}`, 404);
  return user;
}

export async function getUsers(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [records, total] = await Promise.all([
    prisma.users.findMany({ skip, take: effectiveLimit, select: userSelectWithoutPassword }),
    prisma.users.count(),
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

export async function getRoles() {
  return prisma.roles.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
}

export async function deleteUser(id: number) {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new AppError(`User not found: ${id}`, 404);
  await prisma.users.update({
    where: { id },
    data: { is_active: false, session_version: { increment: 1 }, last_activity: null },
  });
}

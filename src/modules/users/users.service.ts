import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateUserDto, UpdateUserDto } from './users.schema.js';
import bcrypt from 'bcryptjs';

async function prepareUserCreateData(data: CreateUserDto) {
  const password_hash = await bcrypt.hash(data.password.trim(), 10);

  return {
    username: data.username.trim(),
    password_hash,
    camp_id: data.camp_id,
    role_id: data.role_id,
    is_active: data.is_active,
    last_activity: data.last_activity,
    created_at: data.created_at,
  };
}

async function prepareUserUpdateData(data: UpdateUserDto) {
  const password_hash = data.password ? await bcrypt.hash(data.password.trim(), 10) : undefined;

  return {
    username: data.username?.trim(),
    password_hash,
    camp_id: data.camp_id,
    role_id: data.role_id,
    is_active: data.is_active,
    last_activity: data.last_activity,
    created_at: data.created_at,
  };
}

export async function createUser(data: CreateUserDto) {
  try {
    return await prisma.users.create({
      data: await prepareUserCreateData(data),
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
    });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getUser(id: number) {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new AppError(`User not found: ${id}`, 404);
  return user;
}

export async function getUsers() {
  return await prisma.users.findMany();
}

export async function deleteUser(id: number) {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new AppError(`User not found: ${id}`, 404);
  try {
    await prisma.users.update({
      where: { id },
      data: { is_active: false },
    });
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

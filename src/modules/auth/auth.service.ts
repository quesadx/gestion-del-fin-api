import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import bcrypt from 'bcryptjs';
import { LoginInput } from './auth.schema.js';
import { signAccessToken } from '../../shared/utils/jwt.js';

export const login = async (data: LoginInput) => {
  const user = await prisma.users.findUnique({
    where: { username: data.username },
    select: {
      id: true,
      camp_id: true,
      username: true,
      password_hash: true,
      is_active: true,
      roles: { select: { name: true } },
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.is_active) {
    throw new AppError('Account is inactive', 401);
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signAccessToken(user.id, user.camp_id, user.roles.name);

  await prisma.users.update({
    where: { id: user.id },
    data: { last_activity: new Date() },
  });

  return { user: { username: user.username }, token };
};

export const logout = async (userId: number) => {
  await prisma.users.update({
    where: { id: userId },
    data: { last_activity: null },
  });

  return { message: 'Logged out successfully' };
};

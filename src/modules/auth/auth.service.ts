import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import bcrypt from 'bcryptjs';
import { LoginInput } from './auth.schema.js';
import { signAccessToken } from '../../shared/utils/jwt.js';

export const login = async (data: LoginInput) => {
  const user = await prisma.users.findUnique({
    where: { username: data.username },
    include: { roles: { select: { name: true } } },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signAccessToken(user.id, user.camp_id);

  return {
    user: { username: user.username, role: user.roles.name },
    token,
  };
};

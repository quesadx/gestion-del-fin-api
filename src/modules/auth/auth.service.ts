import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { LoginInput } from './auth.schema.js';
import { config } from '../../config/index.js';

export const login = async (data: LoginInput) => {
  const user = await prisma.users.findUnique({
    where: { username: data.username },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRY as SignOptions['expiresIn'],
  });

  return { user: { username: user.username }, token };
};

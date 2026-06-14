import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { compare } from '@node-rs/bcrypt';
import { LoginInput } from './auth.schema.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiresAt,
} from '../../shared/utils/refreshToken.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { auditLog } from '../../shared/utils/auditLog.js';
import * as achievementService from '../achievements/achievements.service.js';
import { logger } from '../../logger/logger.js';

export const login = async (data: LoginInput) => {
  const user = await prisma.users.findUnique({
    where: { username: data.username },
    select: {
      id: true,
      camp_id: true,
      last_activity: true,
      session_version: true,
      username: true,
      password_hash: true,
      is_active: true,
      roles: {
        select: {
          name: true,
          role_permissions: { select: { permissions: { select: { name: true } } } },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.is_active) {
    throw new AppError('Account is inactive', 401);
  }

  if (!user.roles) {
    throw new AppError('User has no role assigned', 500);
  }

  const isPasswordValid = await compare(data.password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const isAdmin = user.roles.role_permissions.some(
    (rp) => rp.permissions.name === PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING,
  );

  const accessToken = signAccessToken(
    user.id,
    user.camp_id,
    user.roles.name,
    user.session_version,
    isAdmin,
  );

  const refreshTokenRaw = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshTokenRaw);

  await prisma.refresh_tokens.create({
    data: {
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: getRefreshTokenExpiresAt(),
    },
  });

  const isFirstLogin = user.last_activity == null;

  await prisma.users.update({
    where: { id: user.id },
    data: { last_activity: new Date() },
  });

  auditLog({
    userId: user.id,
    campId: user.camp_id,
    action: 'LOGIN',
    targetType: 'users',
    targetId: user.id,
  });

  achievementService
    .tryUnlock(user.id, user.camp_id, 'LOGIN', { firstLogin: isFirstLogin })
    .catch((err) => logger.warn(`Achievement check failed (LOGIN): ${err?.message ?? err}`));

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: {
      username: user.username,
      role: user.roles.name,
      permissions: user.roles.role_permissions.map((rp) => rp.permissions.name),
    },
  };
};

export const refresh = async (refreshTokenCookie: string | undefined) => {
  if (!refreshTokenCookie) {
    throw new AppError('Refresh token is required', 401);
  }

  const tokenHash = hashRefreshToken(refreshTokenCookie);

  const storedToken = await prisma.refresh_tokens.findUnique({
    where: { token_hash: tokenHash },
    select: { id: true, user_id: true, expires_at: true, revoked_at: true },
  });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (storedToken.revoked_at) {
    throw new AppError('Refresh token has been revoked', 401);
  }

  if (storedToken.expires_at < new Date()) {
    throw new AppError('Refresh token has expired', 401);
  }

  const user = await prisma.users.findUnique({
    where: { id: storedToken.user_id },
    select: {
      id: true,
      camp_id: true,
      session_version: true,
      is_active: true,
      roles: {
        select: {
          name: true,
          role_permissions: { select: { permissions: { select: { name: true } } } },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 401);
  }

  if (!user.is_active) {
    throw new AppError('Account is inactive', 401);
  }

  const isAdmin = user.roles.role_permissions.some(
    (rp) => rp.permissions.name === PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING,
  );

  const newAccessToken = signAccessToken(
    user.id,
    user.camp_id,
    user.roles.name,
    user.session_version,
    isAdmin,
  );

  // Rotate: revoke old refresh token, create new one
  await prisma.refresh_tokens.update({
    where: { id: storedToken.id },
    data: { revoked_at: new Date() },
  });

  const newRefreshTokenRaw = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshTokenRaw);

  await prisma.refresh_tokens.create({
    data: {
      user_id: user.id,
      token_hash: newRefreshTokenHash,
      expires_at: getRefreshTokenExpiresAt(),
    },
  });

  await prisma.users.update({
    where: { id: user.id },
    data: { last_activity: new Date() },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenRaw,
  };
};

export const logout = async (refreshTokenCookie: string | undefined) => {
  if (!refreshTokenCookie) {
    return { message: 'Logged out successfully' };
  }

  const tokenHash = hashRefreshToken(refreshTokenCookie);

  const storedToken = await prisma.refresh_tokens.findUnique({
    where: { token_hash: tokenHash },
    select: { id: true, user_id: true },
  });

  if (storedToken) {
    await prisma.refresh_tokens.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    const user = await prisma.users.findUnique({
      where: { id: storedToken.user_id },
      select: { id: true, camp_id: true },
    });

    await prisma.users.update({
      where: { id: storedToken.user_id },
      data: { last_activity: null, session_version: { increment: 1 } },
    });

    if (user) {
      auditLog({
        userId: user.id,
        campId: user.camp_id,
        action: 'LOGOUT',
        targetType: 'users',
        targetId: user.id,
      });
    }
  }

  return { message: 'Logged out successfully' };
};

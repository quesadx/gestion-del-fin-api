import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { compare } from '@node-rs/bcrypt';
import { LoginInput } from './auth.schema.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
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

  // NOTE: isAdmin is static for the token lifetime (up to 24h).
  // If the role's permissions change after login, the flag is not auto-revoked.
  // campMiddleware uses it to bypass camp-scoping, but permissionMiddleware
  // re-checks permissions from the DB on every request, so no actual data access is leaked.
  // Re-login refreshes the flag with current permissions.
  const isAdmin = user.roles.role_permissions.some(
    (rp) => rp.permissions.name === PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING,
  );

  const token = signAccessToken(
    user.id,
    user.camp_id,
    user.roles.name,
    user.session_version,
    isAdmin,
  );

  // Detect whether this is the user's first recorded activity
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

  // Try to unlock login-related achievements (non-blocking)
  achievementService
    .tryUnlock(user.id, user.camp_id, 'LOGIN', { firstLogin: isFirstLogin })
    .catch((err) => logger.warn(`Achievement check failed (LOGIN): ${err?.message ?? err}`));

  return { user: { username: user.username, role: user.roles.name }, token };
};

export const logout = async (userId: number) => {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, camp_id: true },
  });

  await prisma.users.update({
    where: { id: userId },
    data: { last_activity: null, session_version: { increment: 1 } },
  });

  if (user) {
    auditLog({
      userId,
      campId: user.camp_id,
      action: 'LOGOUT',
      targetType: 'users',
      targetId: userId,
    });
  }

  return { message: 'Logged out successfully' };
};

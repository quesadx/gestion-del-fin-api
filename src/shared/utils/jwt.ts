import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from './appError.js';

export type AccessTokenPayload = {
  userId: number;
  campId: number;
  role: string;
  sessionVersion: number;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not defined in environment variables', 500);
  }

  return secret;
}

function getJwtExpiry(): SignOptions['expiresIn'] {
  const raw = process.env.JWT_EXPIRY;
  if (!raw) return '1d';
  if (!/^\d+[smhd]?$/.test(raw)) {
    throw new AppError(`Invalid JWT_EXPIRY format: "${raw}". Expected: <number>[s|m|h|d]`, 500);
  }
  return raw as SignOptions['expiresIn'];
}

export function signAccessToken(
  userId: number,
  campId: number,
  role: string,
  sessionVersion: number,
  isAdmin = false,
): string {
  const payload: AccessTokenPayload = { userId, campId, role, sessionVersion, isAdmin };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiry() });
}

function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader) {
    throw new AppError('Missing Authorization header', 401);
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(' ');
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    throw new AppError('Invalid Authorization header format. Expected: Bearer <token>', 401);
  }

  return token;
}

export function getAccessTokenPayloadFromHeader(authorizationHeader?: string): AccessTokenPayload {
  try {
    const token = extractBearerToken(authorizationHeader);
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded === 'string') {
      throw new AppError('Invalid token payload', 401);
    }

    const userId = decoded.userId;
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Invalid token payload', 401);
    }

    const campId = decoded.campId;
    if (!Number.isInteger(campId) || campId <= 0) {
      throw new AppError('Invalid token payload', 401);
    }

    const role = decoded.role;
    if (typeof role !== 'string' || !role) {
      throw new AppError('Invalid token payload', 401);
    }

    const sessionVersion = decoded.sessionVersion;
    if (!Number.isInteger(sessionVersion) || sessionVersion <= 0) {
      throw new AppError('Invalid token payload', 401);
    }

    const isAdmin = typeof decoded.isAdmin === 'boolean' ? decoded.isAdmin : false;

    const iat = typeof decoded.iat === 'number' ? decoded.iat : undefined;
    const exp = typeof decoded.exp === 'number' ? decoded.exp : undefined;

    return { userId, campId, role, sessionVersion, isAdmin, iat, exp };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired token', 401);
  }
}

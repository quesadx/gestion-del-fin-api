import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from './appError.js';

export type AccessTokenPayload = {
  userId: number;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return secret;
}

function getJwtExpiry(): SignOptions['expiresIn'] {
  return (process.env.JWT_EXPIRY || '1d') as SignOptions['expiresIn'];
}

export function signAccessToken(userId: number): string {
  const payload: AccessTokenPayload = { userId };
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

    return { userId };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired token', 401);
  }
}

import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from './appError.js';

export type AccessTokenPayload = {
  userId: number;
};

const accessTokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
});

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

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return accessTokenPayloadSchema.parse(decoded);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}

export function extractBearerToken(authorizationHeader?: string): string {
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
  const token = extractBearerToken(authorizationHeader);
  return verifyAccessToken(token);
}

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiry() });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, getJwtSecret());
};

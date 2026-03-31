import jwt, { SignOptions } from 'jsonwebtoken';

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

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
}

export function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader) {
    throw new Error('Missing Authorization header');
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(' ');
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    throw new Error('Invalid Authorization header format. Expected: Bearer <token>');
  }

  return token;
}

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiry() });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, getJwtSecret());
};

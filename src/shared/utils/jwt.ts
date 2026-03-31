import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export interface AccessTokenPayload extends JwtPayload {
  userId: number;
}

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
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: getJwtExpiry() });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

export const generateToken = (payload: object): string =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiry() });

export const verifyToken = (token: string): JwtPayload | string =>
  jwt.verify(token, getJwtSecret());

import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiryMs(): number {
  const raw = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  const match = raw.match(/^(\d+)\s*(d|h|m|s)?$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'd';

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export function getRefreshTokenExpiresAt(): Date {
  return new Date(Date.now() + getRefreshTokenExpiryMs());
}

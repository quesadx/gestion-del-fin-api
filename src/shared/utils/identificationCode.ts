import { randomBytes } from 'node:crypto';

export function generateIdentificationCode() {
  return randomBytes(10).toString('hex').slice(0, 20).toUpperCase();
}

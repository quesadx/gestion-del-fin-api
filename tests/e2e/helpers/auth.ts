// tests/e2e/helpers/auth.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TestRole =
  | 'admin_camp1'
  | 'admin_camp2'
  | 'worker_camp1'
  | 'worker_camp2'
  | 'resource_mgr_camp1'
  | 'travel_coord_camp1';

export interface TestTokens {
  admin_camp1: string;
  admin_camp2: string;
  worker_camp1: string;
  worker_camp2: string;
  resource_mgr_camp1: string;
  travel_coord_camp1: string;
}

let _tokens: TestTokens | null = null;

export function loadTokens(): TestTokens {
  if (_tokens) return _tokens;
  const tokensPath = path.join(__dirname, '..', '.auth', 'tokens.json');
  _tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  return _tokens!;
}

export function authHeader(role: TestRole): Record<string, string> {
  const tokens = loadTokens();
  return { Authorization: `Bearer ${tokens[role]}` };
}

/** Maps a test role to its assigned camp ID (from setup seed data) */
export function getCampIdForRole(role: TestRole): number {
  const map: Record<TestRole, number> = {
    admin_camp1: 1,
    admin_camp2: 2,
    worker_camp1: 1,
    worker_camp2: 2,
    resource_mgr_camp1: 1,
    travel_coord_camp1: 1,
  };
  return map[role];
}

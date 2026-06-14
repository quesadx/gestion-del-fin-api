import { request } from '@playwright/test';

interface LoginResponse {
  accessToken: string;
  user: { username: string; role: string; permissions: string[] };
}

/**
 * Login against the target API and return accessToken + user info.
 * Credentials from env E2E_USER/E2E_PASS or fallback to seed defaults.
 */
export async function login(
  baseURL: string,
  username?: string,
  password?: string,
): Promise<{ token: string; userId: number; campId: number; role: string }> {
  const u = username ?? process.env.E2E_USER ?? 'admin_master';
  const p = password ?? process.env.E2E_PASS ?? 'test-password-123';

  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/auth/login', { data: { username: u, password: p } });
  if (!res.ok()) {
    const body = await res.json();
    throw new Error(`Login failed for ${u}: ${JSON.stringify(body)}`);
  }
  const body = (await res.json()) as LoginResponse;
  await ctx.dispose();

  return {
    token: body.accessToken,
    userId: 0,
    campId: 0,
    role: body.user.role,
  };
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

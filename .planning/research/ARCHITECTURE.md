# E2E Test Suite Architecture

**Domain:** Express API E2E Testing (Playwright)
**Researched:** 2026-05-17
**Confidence:** HIGH (Playwright 1.58 official docs + codebase analysis)

## Executive Summary

This document defines the architecture for a comprehensive E2E test suite covering 14 Express API modules using Playwright's `request` fixture for pure API testing. The design addresses: camp-scoped multi-tenancy, an 8-middleware auth chain (auth → session → camp → permission → rateLimit → validate → errorHandler), Prisma-backed PostgreSQL, and a 2-week deadline for capstone defense.

The architecture uses **Playwright project dependencies** for DB seeding/teardown, **custom fixtures** for per-test auth context, **direct JWT generation** (not login calls) for setup speed, and **one spec file per module** matching the existing codebase convention.

### Key Decisions

| Decision                                | Rationale                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Project dependencies over `globalSetup` | Full trace/HTML reports, fixture support, visible in reporters                                  |
| `workers: 1` (serial execution)         | Camp-scoped state + session versioning make parallel fragile; 140 tests × ~1s = under 3 minutes |
| Direct JWT generation in global setup   | Avoids HTTP round-trips per role, no circular dependency on auth module                         |
| One spec file per module                | Matches existing `tests/e2e/{module}.spec.ts` convention, easy to find/grep                     |
| Custom fixture per role                 | Eliminates auth boilerplate from every test                                                     |
| `.auth/` directory for tokens           | Gitignored, regenerated each run, no secrets in repo                                            |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Playwright Test Runner                           │
│                     (playwright test / npm run test:e2e)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Setup Project │───▶│  E2E Project  │───▶│  Teardown Project    │  │
│  │ global.setup  │    │  *.spec.ts    │    │  global.teardown     │  │
│  │ (seed DB,     │    │  (14 modules) │    │  (cleanup test data) │  │
│  │  create tokens)│    │               │    │                      │  │
│  └──────────────┘    └───────────────┘    └───────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                Express API (webServer)                         │  │
│  │                http://localhost:3000                           │  │
│  │  NODE_ENV=test → no cron jobs, test DB                         │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                  │                                   │
│                                  ▼                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                PostgreSQL (test database)                      │  │
│  │                Seeded with known, deterministic data           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Directory Layout

```
tests/e2e/
├── global.setup.ts              # Setup project: DB seed + token generation
├── global.teardown.ts           # Teardown project: cleanup
├── .auth/                       # Generated tokens (gitignored)
│   └── tokens.json
├── helpers/                     # Shared test utilities
│   ├── auth.ts                  # Token loading, auth headers, role types
│   ├── fixtures.ts              # Custom test fixtures (per-role request context)
│   ├── assertions.ts            # Reusable response assertions
│   └── data.ts                  # Test data constants (IDs, names, expected values)
├── auth.spec.ts                 # Auth module (login/logout)
├── system.spec.ts               # System module (server time)
├── camps.spec.ts                # Camp CRUD
├── resources.spec.ts            # Resource type CRUD
├── professions.spec.ts          # Profession catalog
├── roles.spec.ts                # Role management
├── permissions.spec.ts          # Permission management
├── users.spec.ts                # User management
├── people.spec.ts               # Survivor records
├── inventory.spec.ts            # Stock tracking, audit
├── expeditions.spec.ts          # Expedition lifecycle
├── transfers.spec.ts            # Inter-camp transfer workflow
├── admission.spec.ts            # AI-assisted admission
└── metrics.spec.ts              # Dashboard analytics
```

**Total: 14 spec files + 3 infrastructure files + 4 helpers = 21 files**

---

## Component Boundaries

### 1. Test Configuration (`playwright.config.ts`)

**Responsibility:** Define projects, web server, timeouts, parallelism, and global options.

**Rationale for project-dependency approach:** Playwright 1.31+ recommends project dependencies over `globalSetup` because the setup project: appears in HTML reports, records traces, supports fixtures, and benefits from auto-applied config options like `headless`.

**Key settings:**

```typescript
// playwright.config.ts — structure
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:3000/api',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/system/time',
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/gestion_del_fin_test',
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      JWT_EXPIRY: '24h',
      CORS_ORIGIN: '*',
      LOG_LEVEL: 'error',
      PORT: '3000',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'e2e',
      testMatch: '*.spec.ts',
      dependencies: ['setup'],
    },
  ],
});
```

**Why `workers: 1`:** The session middleware (`session.middleware.ts`) mutates `users.last_activity` on every request (optimistic lock with `updateMany`). Parallel workers would race on this field, causing intermittent "Session terminated" (401) errors. Additionally, camp-scoped data created by one test could interfere with another test's assertions. Serial execution is safe and fast enough: 140 tests × ~1s each = under 3 minutes.

**Why `fullyParallel: false`:** Tests within a spec file follow the create→read→update→delete lifecycle. Serial ordering within files maintains logical flow.

**`webServer` integration:** The app already has `NODE_ENV !== 'test'` check at `src/index.ts:92` that skips cron job startup. We set `LOG_LEVEL=error` to suppress Winston noise during test runs. Playwright auto-starts the server before tests and kills it after.

### 2. Global Setup (`tests/e2e/global.setup.ts`)

**Responsibility:** Seed the test database with deterministic data and generate authentication tokens for all test roles.

**Data flow:**

```
1. Import prisma from src/lib/prisma (uses TEST_DATABASE_URL)
2. TRUNCATE all tables in dependency order (child tables first)
3. INSERT base entities:
   - 2 camps (Alpha Outpost id=1, Beta Sanctuary id=2)
   - 4 roles (system_admin, worker, resource_manager, travel_coordinator)
   - 56 permissions
   - role_permissions (full mapping from seed.ts)
   - 3 resource types (Standard Rations, Purified Water, Antibiotics)
   - 2 professions (Engineer, Scout)
4. CREATE test users with known bcrypt-hashed passwords:
   | username          | role               | camp | isAdmin |
   |-------------------|--------------------|------|---------|
   | admin_master      | system_admin       | 1    | true    |
   | admin_user_2      | system_admin       | 2    | true    |
   | worker_user_1     | worker             | 1    | false   |
   | worker_user_2     | worker             | 2    | false   |
   | resource_mgr_1    | resource_manager   | 1    | false   |
   | travel_coord_1    | travel_coordinator | 1    | false   |
5. CREATE sample data:
   - 2 people per camp (Engineer + Scout each)
   - Inventory entries for each camp+resource combo
   - 3 expeditions (PLANNED, ONGOING, RETURNED) with members and resources
   - 4 transfers (PENDING, APPROVED_SOURCE, APPROVED_TARGET, REJECTED)
6. SET last_activity = new Date() on all test users (session middleware requirement)
7. GENERATE JWT tokens using signAccessToken() from src/shared/utils/jwt.ts
8. WRITE tokens to tests/e2e/.auth/tokens.json
```

**Token generation logic:**

```typescript
import { signAccessToken } from '../../src/shared/utils/jwt';

// Called once per test user in setup
function generateToken(user: {
  id: number;
  campId: number;
  role: string;
  sessionVersion: number;
  isAdmin: boolean;
}) {
  // JWT_SECRET must match the server's env
  return signAccessToken(user.id, user.campId, user.role, user.sessionVersion, user.isAdmin);
}
```

**tokens.json output format:**

```json
{
  "admin_camp1": "eyJhbGciOi...",
  "admin_camp2": "eyJhbGciOi...",
  "worker_camp1": "eyJhbGciOi...",
  "worker_camp2": "eyJhbGciOi...",
  "resource_mgr_camp1": "eyJhbGciOi...",
  "travel_coord_camp1": "eyJhbGciOi..."
}
```

**Password scheme:** All test users share the password `test-password-123` (hashed with bcryptjs at setup time). This enables the auth spec to test `POST /api/auth/login` with known credentials.

### 3. Global Teardown (`tests/e2e/global.teardown.ts`)

**Responsibility:** Clean up test artifacts.

```typescript
import { test as teardown } from '@playwright/test';
import fs from 'fs';
import path from 'path';

teardown('cleanup test artifacts', async () => {
  const tokensFile = path.join(__dirname, '.auth', 'tokens.json');
  if (fs.existsSync(tokensFile)) {
    fs.unlinkSync(tokensFile);
  }
  // Optionally disconnect Prisma if directly used
  console.log('E2E teardown complete');
});
```

TRUNCATE is intentionally NOT in teardown — setup handles it on next run. This avoids teardown failing and leaving DB in an unknown state.

### 4. Auth Helpers (`tests/e2e/helpers/auth.ts`)

**Responsibility:** Typed token access and authorization header construction.

```typescript
// tests/e2e/helpers/auth.ts
import fs from 'fs';
import path from 'path';

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

/** Maps role to its assigned camp ID (from setup seed) */
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
```

### 5. Custom Fixtures (`tests/e2e/helpers/fixtures.ts`)

**Responsibility:** Extend Playwright's `test` with role-specific authenticated `APIRequestContext` instances. Every spec file imports from here instead of `@playwright/test`.

```typescript
// tests/e2e/helpers/fixtures.ts
import { test as base, type APIRequestContext } from '@playwright/test';
import { loadTokens } from './auth';

// Re-export everything for convenience
export * from '@playwright/test';

type ApiFixtures = {
  adminRequest: APIRequestContext;
  adminCamp2Request: APIRequestContext;
  workerCamp1Request: APIRequestContext;
  workerCamp2Request: APIRequestContext;
  resourceMgrRequest: APIRequestContext;
  travelCoordRequest: APIRequestContext;
};

function createAuthContext(
  playwright: Parameters<Parameters<typeof base.extend>[0][keyof ApiFixtures]>[0]['playwright'],
  token: string,
): Promise<APIRequestContext> {
  return playwright.request.newContext({
    baseURL: 'http://localhost:3000/api',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export const test = base.extend<ApiFixtures>({
  adminRequest: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.admin_camp1);
    await use(ctx);
    await ctx.dispose();
  },
  adminCamp2Request: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.admin_camp2);
    await use(ctx);
    await ctx.dispose();
  },
  workerCamp1Request: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.worker_camp1);
    await use(ctx);
    await ctx.dispose();
  },
  workerCamp2Request: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.worker_camp2);
    await use(ctx);
    await ctx.dispose();
  },
  resourceMgrRequest: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.resource_mgr_camp1);
    await use(ctx);
    await ctx.dispose();
  },
  travelCoordRequest: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.travel_coord_camp1);
    await use(ctx);
    await ctx.dispose();
  },
});
```

**Usage in spec files:**

```typescript
import { test, expect } from '../helpers/fixtures';

test('GET /people returns camp-scoped results', async ({ workerCamp1Request }) => {
  const resp = await workerCamp1Request.get('/people');
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  // All returned people should belong to camp 1
  for (const person of body.data) {
    expect(person.camp_id).toBe(1);
  }
});
```

### 6. Custom Assertions (`tests/e2e/helpers/assertions.ts`)

**Responsibility:** Reusable assertion helpers that validate standard API response shapes. These enforce the error format contract: `{ error: { message, statusCode } }`.

```typescript
import { expect, type APIResponse } from '@playwright/test';

/** Assert response matches the standard error envelope */
export async function expectError(
  response: APIResponse,
  expectedStatus: number,
  expectedMessage?: string,
): Promise<void> {
  expect(response.status()).toBe(expectedStatus);
  const body = await response.json();
  expect(body).toHaveProperty('error');
  expect(body.error).toHaveProperty('statusCode', expectedStatus);
  expect(body.error).toHaveProperty('message');
  if (expectedMessage) {
    expect(body.error.message).toContain(expectedMessage);
  }
}

/** Assert response is 2xx and body has data array (for list endpoints) */
export async function expectDataArray(response: APIResponse, minLength = 0): Promise<any[]> {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
  if (minLength > 0) {
    expect(body.data.length).toBeGreaterThanOrEqual(minLength);
  }
  return body.data;
}

/** Assert response is 2xx and body has the created/updated entity */
export async function expectEntity(response: APIResponse): Promise<Record<string, unknown>> {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('data');
  expect(body.data).toBeTruthy();
  return body.data as Record<string, unknown>;
}

/** Assert response is 201 Created */
export async function expectCreated(response: APIResponse): Promise<Record<string, unknown>> {
  expect(response.status()).toBe(201);
  return expectEntity(response);
}
```

### 7. Test Data Constants (`tests/e2e/helpers/data.ts`)

**Responsibility:** Centralize all magic numbers, expected strings, and known entity IDs from the seed. Tests reference these instead of hardcoding.

```typescript
// tests/e2e/helpers/data.ts
export const TEST = {
  camps: {
    alphaOutpost: { id: 1, name: 'Alpha Outpost', location: 'Grid Sector 7' },
    betaSanctuary: { id: 2, name: 'Beta Sanctuary', location: 'Grid Sector 9' },
  },
  password: 'test-password-123',
  roles: {
    system_admin: 'system_admin',
    worker: 'worker',
    resource_manager: 'resource_manager',
    travel_coordinator: 'travel_coordinator',
  },
  resources: {
    rations: { name: 'Standard Rations', unit: 'kg' },
    water: { name: 'Purified Water', unit: 'Liters' },
    antibiotics: { name: 'Antibiotics', unit: 'Doses' },
  },
  professions: {
    engineer: 'Engineer',
    scout: 'Scout',
  },
} as const;
```

Entities with auto-increment IDs (people, expeditions, transfers) get their IDs from API responses and are NOT hardcoded in constants — tests capture them from create responses.

---

## Data Flow

### Setup Phase (before any tests)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ TRUNCATE all │────▶│ INSERT seed  │────▶│ GENERATE     │
│ tables       │     │ data via     │     │ JWTs via     │
│ (clean slate)│     │ Prisma       │     │ signAccess   │
│              │     │              │     │ Token()      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │ WRITE        │
                                         │ tokens.json  │
                                         │ to .auth/    │
                                         └──────────────┘
```

### Test Execution Phase (per spec file)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. import { test } from '../helpers/fixtures'                   │
│    ↓                                                            │
│ 2. Fixture creates APIRequestContext with auth header            │
│    loadTokens() → read tokens.json → createAuthContext(token)   │
│    ↓                                                            │
│ 3. test('name', async ({ workerCamp1Request }) => {             │
│       // Arrange: define payload, expected data                  │
│       const payload = { ... };                                   │
│                                                                  │
│       // Act: make HTTP request via authenticated context        │
│       const resp = await workerCamp1Request.post('/camps', {     │
│         data: payload,                                           │
│       });                                                        │
│                                                                  │
│       // Assert: check status, response shape, business rules    │
│       expect(resp.status()).toBe(201);                           │
│       const body = await resp.json();                            │
│       expect(body.data.name).toBe(payload.name);                │
│     });                                                          │
│    ↓                                                            │
│ 4. Fixture disposes APIRequestContext after test                 │
└─────────────────────────────────────────────────────────────────┘
```

### Teardown Phase (after all tests)

```
┌──────────────┐
│ DELETE       │
│ tokens.json  │
│ (cleanup)    │
└──────────────┘
```

### Error Test Data Flow (example: 404 not found)

```
test('GET /camps/:id with nonexistent ID returns 404', async ({ workerCamp1Request }) => {
  // Make request to a known-nonexistent ID
  const resp = await workerCamp1Request.get('/camps/99999');

  // Assert error shape
  await expectError(resp, 404);
});
```

The request flows through the full middleware chain:

1. `authMiddleware` → validates JWT, attaches user to req
2. `sessionMiddleware` → checks last_activity (was set in setup), updates it
3. `campMiddleware` → extracts camp=1 from URL, verifies user's camp=1 matches
4. `permissionMiddleware('camps.read')` → checks DB role_permissions (worker has it)
5. `validate(z.object({ params: idParamsSchema }))` → validates 99999
6. Controller → calls `camps.service.getById(99999)`
7. Service → `findUnique` returns null → throws `AppError('Camp not found', 404)`
8. Global error handler → formats `{ error: { message: '...', statusCode: 404 } }`

---

## Patterns to Follow

### Pattern 1: Three-Category Test Organization

Every spec file MUST have three `test.describe` blocks:

```typescript
import { test, expect } from '../helpers/fixtures';
import { expectError, expectEntity, expectDataArray } from '../helpers/assertions';
import { TEST } from '../helpers/data';

test.describe('Happy path', () => {
  test('should create a camp', async ({ workerCamp1Request }) => { /* 201 */ });
  test('should list camps', async ({ workerCamp1Request }) => { /* 200, array */ });
  test('should get camp by ID', async ({ workerCamp1Request }) => { /* 200, entity */ });
  test('should update a camp', async ({ workerCamp1Request }) => { /* 200 */ });
  test('should delete a camp', async ({ workerCamp1Request }) => { /* 200 or 204 */ });
});

test.describe('Error cases', () => {
  test('should return 401 without auth token', async ({ request }) => {
    // Use built-in unauthenticated request fixture
    const resp = await request.get('/camps');
    await expectError(resp, 401);
  });

  test('should return 404 for nonexistent ID', async ({ workerCamp1Request }) => {
    const resp = await workerCamp1Request.get('/camps/99999');
    await expectError(resp, 404);
  });

  test('should return 403 for cross-camp access', async ({ workerCamp1Request }) => {
    // worker_camp1 tries to access camp 2's data
    const resp = await workerCamp1Request.get('/camps/2');
    await expectError(resp, 403);
  });

  test('should return 403 for insufficient permissions', async ({ workerCamp1Request }) => {
    // worker doesn't have camps.delete
    const resp = await workerCamp1Request.delete('/camps/1');
    await expectError(resp, 403);
  });

  test('should return 409 for duplicate name', async ({ adminRequest }) => {
    const payload = { name: TEST.camps.alphaOutpost.name, location: 'Test' };
    const resp = await adminRequest.post('/camps', { data: payload });
    await expectError(resp, 409);
  });

  test('should return 400 for invalid body', async ({ workerCamp1Request }) => {
    const resp = await workerCamp1Request.post('/camps', { data: { name: '' } });
    await expectError(resp, 400);
  });
});

test.describe('Edge cases', () => {
  test('should return empty array for camp with no data', async ({ ... }) => {});
  test('should enforce pagination limits', async ({ ... }) => {});
  test('should reject zero-length strings in required fields', async ({ ... }) => {});
});
```

### Pattern 2: Auth Test Strategy for auth.spec.ts

The auth module spec tests login/logout. It MUST NOT use the custom fixtures (which bypass login). Instead, use the built-in `request` fixture:

```typescript
import { test, expect } from '@playwright/test';
import { TEST } from '../helpers/data';

test.describe('POST /auth/login', () => {
  test('should return token for valid credentials', async ({ request }) => {
    const resp = await request.post('/auth/login', {
      data: { username: 'admin_master', password: TEST.password },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.role).toBe('system_admin');
  });

  test('should return 401 for wrong password', async ({ request }) => {
    const resp = await request.post('/auth/login', {
      data: { username: 'admin_master', password: 'wrong' },
    });
    expect(resp.status()).toBe(401);
  });

  test('should enforce login rate limiting (5 failures)', async ({ request }) => {
    for (let i = 0; i < 5; i++) {
      await request.post('/auth/login', {
        data: { username: 'admin_master', password: 'wrong' },
      });
    }
    const resp = await request.post('/auth/login', {
      data: { username: 'admin_master', password: 'wrong' },
    });
    expect(resp.status()).toBe(429);
  });
});

test.describe('POST /auth/logout', () => {
  test('should increment session version', async ({ request }) => {
    // Login first
    const loginResp = await request.post('/auth/login', {
      data: { username: 'admin_master', password: TEST.password },
    });
    const { token } = await loginResp.json();

    // Logout with that token
    const logoutResp = await request.post('/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutResp.status()).toBe(200);

    // Verify old token is now rejected (session_version incremented)
    const recheckResp = await request.get('/camps', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(recheckResp.status()).toBe(401);
  });
});
```

**IMPORTANT:** Auth tests MUST NOT import from `../helpers/fixtures` (which bypass login). Auth tests are the one module where the raw `request` fixture is used, plus manual token extraction from login responses.

### Pattern 3: RBAC Permission Testing

Test that each role can only access permitted endpoints:

```typescript
test.describe('Role-based access', () => {
  test('worker cannot create camps', async ({ workerCamp1Request }) => {
    const resp = await workerCamp1Request.post('/camps', {
      data: { name: 'Unauthorized Camp', location: 'Nowhere' },
    });
    await expectError(resp, 403);
  });

  test('resource_manager can create resources', async ({ resourceMgrRequest }) => {
    const resp = await resourceMgrRequest.post('/resources', {
      data: { name: 'Test Resource', unit: 'items', daily_ration: '1', minimum_stock: '10' },
    });
    expect(resp.status()).toBe(201);
  });

  test('travel_coordinator can create expeditions', async ({ travelCoordRequest }) => {
    const today = new Date().toISOString().split('T')[0];
    const resp = await travelCoordRequest.post('/expeditions', {
      data: {
        destination: 'Test Site',
        departure_date: today,
        expected_return_date: today,
        max_return_date: today,
      },
    });
    expect(resp.status()).toBe(201);
  });
});
```

### Pattern 4: Data Cleanup Within Tests

Tests that create data should clean up in `test.afterEach`:

```typescript
test.describe('Happy path', () => {
  const createdIds: number[] = [];

  test.afterEach(async ({ adminRequest }) => {
    for (const id of createdIds) {
      await adminRequest.delete(`/camps/${id}`);
    }
    createdIds.length = 0;
  });

  test('should create a camp', async ({ adminRequest }) => {
    const resp = await adminRequest.post('/camps', {
      data: { name: `Test Camp ${Date.now()}`, location: 'Test' },
    });
    const data = await expectCreated(resp);
    createdIds.push(data.id);
    expect(data.name).toContain('Test Camp');
  });
});
```

**Why `Date.now()` in names:** Ensures unique names across test runs to avoid 409 conflict errors.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Prisma Access in Spec Files

**What:** Importing `prisma` in spec files to create/query data directly.
**Why bad:** Bypasses middleware, auth, validation — the very layers we need to test. Creates data in states the API would never produce.
**Instead:** Use the authenticated request fixtures to create data through the API.

### Anti-Pattern 2: Hardcoded Entity IDs

**What:** Assuming `POST /camps` creates entity with ID 3, then testing `GET /camps/3`.
**Why bad:** IDs depend on autoincrement state. If setup seed changes or tests run in different order, IDs shift.
**Instead:** Capture IDs from create responses and use them in subsequent tests. Use `TEST.camps.alphaOutpost.id` only for seed data IDs (which are deterministic).

### Anti-Pattern 3: Testing Internal Implementation

**What:** Asserting on Prisma query results, internal service function returns, or checking DB state directly.
**Why bad:** These are unit test concerns. E2E tests validate the API contract — HTTP status codes, response shapes, and observable behavior.
**Instead:** Assert on HTTP responses only. If you need to verify a side effect (e.g., inventory decreased after expedition), do it via another API call.

### Anti-Pattern 4: Skipping Middleware in Tests

**What:** Using admin tokens for all tests to avoid permission errors.
**Why bad:** Doesn't test RBAC — which is a graded requirement. Cross-camp isolation and permission gates must be verified.
**Instead:** Use the minimum-privilege role for each test. Worker for reads, admin only for tests that specifically need admin access.

### Anti-Pattern 5: import from `../helpers/fixtures` in auth.spec.ts

**What:** Auth spec using the custom fixtures that auto-inject tokens.
**Why bad:** Circular — auth spec tests login/logout but the fixtures bypass login entirely.
**Instead:** Auth spec uses raw `request` fixture from `@playwright/test`, manually handles auth headers.

---

## Execution Strategy

### Command Line

```bash
# Run all E2E tests
npm run test:e2e

# Run a single module
npx playwright test tests/e2e/camps.spec.ts

# Run with UI mode (visual debugging)
npx playwright test --ui

# Run with debugger
npx playwright test --debug

# Run a single test by name
npx playwright test -g "should create a camp"

# Show HTML report after run
npx playwright show-report
```

### Environment Setup

Tests require a test database. Options:

**Option A (Recommended): Dedicated test database**

```bash
# Create test DB
createdb gestion_del_fin_test

# Set env var (or add to .env.test)
export TEST_DATABASE_URL="postgresql://localhost:5432/gestion_del_fin_test"

# Run migrations on test DB
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy

# Run tests
npm run test:e2e
```

**Option B: Docker Compose test DB**

```bash
# Spin up a second PostgreSQL container on different port
docker run -d --name test-db -p 5433:5432 \
  -e POSTGRES_DB=gestion_del_fin_test \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_pass \
  postgres:16-alpine

export TEST_DATABASE_URL="postgresql://test_user:test_pass@localhost:5433/gestion_del_fin_test"
```

**`webServer` ensures the server is running.** No need to manually start `npm run dev` before tests.

### Test Execution Order

With `workers: 1`, Playwright runs spec files alphabetically. The naming convention `{module}.spec.ts` produces this effective order:

1. `admission.spec.ts`
2. `auth.spec.ts`
3. `camps.spec.ts`
4. `expeditions.spec.ts`
5. `inventory.spec.ts`
6. `metrics.spec.ts`
7. `people.spec.ts`
8. `permissions.spec.ts`
9. `professions.spec.ts`
10. `resources.spec.ts`
11. `roles.spec.ts`
12. `system.spec.ts`
13. `transfers.spec.ts`
14. `users.spec.ts`

Since global setup seeds all data, order doesn't matter for data dependencies. However, **auth.spec.ts** modifies session versions (logout increments `session_version`). If auth tests run before other modules, they might invalidate tokens. The setup should generate fresh tokens that auth tests won't affect (auth tests use login endpoint, not pre-generated tokens).

---

## Build Order (Module Implementation Sequence)

This is the recommended order for implementing spec files, based on complexity and dependency risk:

### Phase 1: Infrastructure (1 day)

1. `playwright.config.ts` — project config
2. `tests/e2e/global.setup.ts` — DB seeding + token generation
3. `tests/e2e/global.teardown.ts` — cleanup
4. `tests/e2e/helpers/auth.ts` — token utilities
5. `tests/e2e/helpers/fixtures.ts` — custom test fixtures
6. `tests/e2e/helpers/assertions.ts` — reusable assertions
7. `tests/e2e/helpers/data.ts` — seed data constants

**Validation gate:** Run `playwright test --project=setup` and verify DB is seeded, tokens are generated.

### Phase 2: Foundation Modules (simplest, least dependencies)

1. `system.spec.ts` — 1 endpoint, public, no auth
2. `auth.spec.ts` — 2 endpoints, partially public
3. `camps.spec.ts` — 5 endpoints, reference CRUD pattern
4. `professions.spec.ts` — simple CRUD
5. `resources.spec.ts` — simple CRUD

**Validation gate:** All 5 specs pass. Establishes the test patterns.

### Phase 3: RBAC Modules (simple CRUD, auth-dependent)

1. `roles.spec.ts` — role management
2. `permissions.spec.ts` — permission catalog
3. `users.spec.ts` — user management (depends on camps + roles)

**Validation gate:** Permission error cases verified across modules.

### Phase 4: Domain Modules (data-dependent CRUD)

1. `people.spec.ts` — survivor records (depends on camps + professions)
2. `inventory.spec.ts` — stock tracking (depends on camps + resources)

### Phase 5: Complex Workflows (multi-step, state machines)

1. `expeditions.spec.ts` — lifecycle with status transitions
2. `transfers.spec.ts` — 7-step approval workflow, multi-camp
3. `admission.spec.ts` — AI-dependent (may need Groq/ML service, or mock)

**PITFALL:** `admission.spec.ts` may fail without Groq API key or ML service running. The `webServer` env in `playwright.config.ts` must include `GROQ_API_KEY` and `ML_SERVICE_URL` if testing real admission flow. Alternatively, admission tests can be limited to error cases that fail before AI evaluation.

### Phase 6: Aggregation

1. `metrics.spec.ts` — dashboard analytics (depends on all data existing)

**Validation gate:** Full suite passes. 14 modules, ~140+ tests.

---

## Request/Response Contract

All tests MUST validate against the standard response envelope:

### Success Response

```json
{
  "data": { "id": 1, "name": "Alpha Outpost", ... }
}
```

Status: 200/201

### List Response

```json
{
  "data": [...],
  "pagination": { "page": 1, "pageSize": 20, "total": 45 }
}
```

Status: 200

### Error Response (from global error handler)

```json
{
  "error": {
    "message": "Camp not found: 99",
    "statusCode": 404
  }
}
```

### Error Status Code Map

| Scenario                    | Status | Error Message Contains      |
| --------------------------- | ------ | --------------------------- |
| Missing/invalid JWT         | 401    | "Unauthorized" or "Invalid" |
| Session timeout             | 401    | "Session"                   |
| Cross-camp access           | 403    | "Forbidden"                 |
| Insufficient permission     | 403    | "Forbidden"                 |
| Resource not found          | 404    | "not found"                 |
| Validation failure          | 400    | "Validation" or field name  |
| Unique constraint violation | 409    | "already exists"            |
| Rate limit exceeded         | 429    | "Too many"                  |
| Server error                | 500    | (masked in production)      |

---

## Key Risks and Mitigations

| Risk                                                    | Impact                                             | Mitigation                                                                                                                  |
| ------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `sessionMiddleware` rejects tokens (last_activity null) | All tests fail with 401                            | Global setup sets `last_activity: new Date()` on all test users                                                             |
| `sessionMiddleware` rejects tokens (version mismatch)   | Intermittent 401 errors                            | `workers: 1` prevents concurrent version bumps. Auth tests use login endpoint (gets fresh version)                          |
| `campMiddleware` rejects cross-camp URLs                | Tests fail unexpectedly                            | Map each role to its camp in `data.ts`. Use correct role fixture for each test.                                             |
| Groq API key missing for admission tests                | admission.spec.ts hangs/fails                      | Set `GROQ_API_KEY` in webServer env, OR limit admission tests to error cases, OR use `test.skip(!process.env.GROQ_API_KEY)` |
| ML service not running                                  | admission endpoint fails (HTTP to ml-service:8000) | Include `ML_SERVICE_URL` in test env pointing to a running instance, or skip ML-dependent tests                             |
| `globalRateLimit` (200 req/15min) throttles tests       | Tests get 429 errors                               | 200 requests across 140 tests is fine. Single worker prevents concurrent burst.                                             |
| `loginRateLimit` (5 failures/15min) in auth tests       | Auth error tests trigger rate limit                | Auth spec must test rate limit LAST in the describe block, or reset between runs                                            |
| `admissionRateLimit` (10 req/min) in admission tests    | Admission tests hit rate limit                     | Space admission tests across describe blocks. Use 11th request to test 429.                                                 |
| Test DB URL not configured                              | `webServer` fails to start                         | Document in README, provide `.env.test.example`                                                                             |
| Token expiry (1h with default config)                   | Long test runs fail                                | Set `JWT_EXPIRY=24h` in webServer env                                                                                       |

---

## Sources

- **Playwright API Testing:** https://playwright.dev/docs/api-testing (official, HIGH confidence)
- **Playwright Project Dependencies:** https://playwright.dev/docs/test-global-setup-teardown (official, HIGH confidence)
- **Playwright Configuration:** https://playwright.dev/docs/test-configuration (official, HIGH confidence)
- **Playwright Authentication:** https://playwright.dev/docs/auth (official, HIGH confidence)
- **Playwright Parallelism:** https://playwright.dev/docs/test-parallel (official, HIGH confidence)
- **Playwright Best Practices:** https://playwright.dev/docs/best-practices (official, HIGH confidence)
- **Codebase analysis:** `src/index.ts`, `src/middlewares/*`, `src/modules/*/`, `prisma/seed.ts`, `prisma/schema.prisma` (direct inspection, HIGH confidence)
- **Existing test stubs:** `tests/e2e/auth.spec.ts`, `people.spec.ts`, `resources.spec.ts` (direct inspection, HIGH confidence)

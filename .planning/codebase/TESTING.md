# Testing Strategy

**Analysis Date:** 2026-05-17

## Framework

**Unit Runner:**
- **Jest** 30.2.0 with `ts-jest` preset
- Config: `jest.config.ts` — `testEnvironment: 'node'`, matches `tests/unit/**/*.spec.ts`

**E2E Runner:**
- **Playwright** 1.58.2 (`@playwright/test`)
- Config: `playwright.config.ts` — `testDir: './tests/e2e'`
- Global setup: `tests/e2e/global.setup.ts` — seeds test DB, generates JWT tokens
- Global teardown: `tests/e2e/global.teardown.ts` — cleans up token artifacts
- Web server: auto-started via `npx dotenv -e .env.test -- tsx src/index.ts`
- Workers: 1 (sequential), fullyParallel: false
- Timeout: 15s per test, 5s per expect

## Current Test Status

| Layer | Status | Count |
|-------|--------|-------|
| E2E (Playwright) | ✅ Implemented | 14 spec files, ~200+ test cases |
| Unit (Jest) | ❌ Not implemented | 0 spec files (empty `tests/unit/` with only placeholder files) |

## How to Run

```bash
npm test                # Jest unit tests (--passWithNoTests, currently passes trivially)
npm run test:e2e        # Playwright E2E tests
```

E2E tests require a running PostgreSQL database configured in `.env.test`. The Playwright config auto-starts the server.

## Test File Organization

```
tests/
├── unit/
│   ├── ai/
│   │   └── placeholder       # Empty file — NO unit tests exist
│   └── jobs/
│       └── placeholder       # Empty file — NO unit tests exist
└── e2e/
    ├── helpers/
    │   ├── auth.ts           # TestRole type, loadTokens(), authHeader(), getCampIdForRole()
    │   ├── assertions.ts     # expectError(), expectDataArray(), expectEntity(), expectCreated()
    │   ├── data.ts           # TEST constants (camp names, user creds, resource names)
    │   └── fixtures.ts       # Custom Playwright fixtures (adminRequest, workerCamp1Request, etc.)
    ├── global.setup.ts       # Truncates DB, seeds data, generates JWT tokens
    ├── global.teardown.ts    # Cleans up .auth/tokens.json
    ├── auth.spec.ts          # POST /api/auth/login, POST /api/auth/logout
    ├── camps.spec.ts         # Full CRUD — camps + pagination + scoped isolation
    ├── people.spec.ts        # Full CRUD — people + camp-scoped creation + cross-camp isolation
    ├── permissions.spec.ts   # Full CRUD — permissions
    ├── roles.spec.ts         # Roles (with permission assignments)
    ├── professions.spec.ts   # Professions CRUD
    ├── resources.spec.ts     # Resources CRUD
    ├── inventory.spec.ts     # Inventory tracking
    ├── admission.spec.ts     # AI evaluation + manual review workflow
    ├── transfers.spec.ts     # Transfer creation + approval workflow
    ├── expeditions.spec.ts   # Expedition scheduling
    ├── users.spec.ts         # User management
    ├── system.spec.ts        # Server time endpoint + health check
    ├── metrics.spec.ts       # Dashboard metrics (people, resources, expeditions)
    └── permissions.spec.ts   # Permission CRUD + role-permission mapping
```

## E2E Test Patterns

### Custom Fixtures

`tests/e2e/helpers/fixtures.ts` provides pre-authenticated `APIRequestContext` fixtures:

```typescript
import { test } from './helpers/fixtures';
// Available fixtures: adminRequest, adminCamp2Request, workerCamp1Request,
//                     workerCamp2Request, resourceMgrRequest, travelCoordRequest

test('works with admin auth', async ({ adminRequest }) => {
  const res = await adminRequest.get('/api/camps');
  expect(res.ok()).toBeTruthy();
});

test('tests role isolation', async ({ workerCamp1Request, workerCamp2Request }) => {
  const camp1People = await workerCamp1Request.get('/api/camps/1/people');
  const camp2People = await workerCamp2Request.get('/api/camps/1/people');
  // worker_camp2 cannot access camp 1 data
});
```

### Assertion Helpers

`tests/e2e/helpers/assertions.ts` wraps standard Playwright `expect`:

| Helper | Purpose |
|--------|---------|
| `expectError(res, status, msg?)` | Assert error envelope with status and optional message |
| `expectDataArray(res, minLength?)` | Assert 2xx with `{ data: [...] }` shape |
| `expectEntity(res)` | Assert 2xx with single object (non-array) |
| `expectCreated(res)` | Assert 201 with single object |

### Test Data Constants

`tests/e2e/helpers/data.ts` contains reusable test values:

```typescript
export const TEST = {
  camps: {
    alphaOutpost: { id: 1, name: 'Alpha Outpost', location: 'Grid Sector 7' },
    betaSanctuary: { id: 2, name: 'Beta Sanctuary', location: 'Grid Sector 9' },
  },
  password: 'test-password-123',
  users: { admin_master: 'admin_master', worker_user_1: 'worker_user_1', ... },
  resources: { rations: { name: 'Standard Rations', unit: 'kg' }, ... },
  professions: { engineer: 'Engineer', scout: 'Scout' },
} as const;
```

### Test Structure Pattern

All E2E specs follow the same structure:

```typescript
test.describe('POST /api/module', () => {
  test('creates a new entity and returns 201', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/api/module', { data: { name: 'Test' } }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'Test');
  });

  test('returns 400 when required fields missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/module', { data: {} });
    await expectError(res, 400);
  });

  test('returns 409 for duplicate name', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/module', {
      data: { name: TEST.existingName },
    });
    await expectError(res, 409);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    const res = await ctx.post('/api/module', { data: { name: 'Ghost' } });
    await expectError(res, 401);
    await ctx.dispose();
  });
});
```

### Global Setup (Database Seed)

`tests/e2e/global.setup.ts` runs once before all E2E tests:

1. **Truncates** all 24 tables with `RESTART IDENTITY CASCADE`
2. **Seeds:** 2 camps, 4 roles, all permissions, 3 resource types, 2 professions
3. **Creates:** 6 test users + 1 auth test user with bcrypt-hashed passwords
4. **Seeds:** inventory entries (1000 units each), 4 people (2 per camp)
5. **Generates:** JWT tokens for each test role
6. **Writes:** tokens to `tests/e2e/.auth/tokens.json`

Teardown removes the tokens file but does NOT truncate the database (truncate-on-next-setup pattern).

## Unit Tests

**No unit tests exist.** The `tests/unit/` directory only contains empty placeholder files. The Jest config (`jest.config.ts`) matches `tests/unit/**/*.spec.ts`, and the `--passWithNoTests` flag in `package.json` makes this pass silently.

### Recommended Unit Test Structure

Based on the architecture, unit tests should cover:

**Service tests (mock Prisma):**
```typescript
import { createCamp } from './camps.service.js';
import { prisma } from '../../lib/prisma.js';
jest.mock('../../lib/prisma.js', () => ({
  prisma: { camps: { create: jest.fn(), findUnique: jest.fn() } },
}));

describe('createCamp', () => {
  it('creates a camp with trimmed name', async () => {
    (prisma.camps.create as jest.Mock).mockResolvedValue({ id: 1, name: 'Test' });
    const result = await createCamp({ name: '  Test  ' }, 1, 1);
    expect(result.name).toBe('Test');
  });

  it('throws 409 on duplicate name', async () => {
    (prisma.camps.create as jest.Mock).mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } });
    await expect(createCamp({ name: 'Duplicate' }, 1, 1)).rejects.toThrow('name already exists');
  });
});
```

**Schema validation tests:**
```typescript
describe('createCampSchema', () => {
  it('accepts valid camp data', () => {
    const result = createCampSchema.safeParse({ name: 'Alpha Outpost' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createCampSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
```

**Middleware tests:**
```typescript
describe('parseIdParam', () => {
  it('returns number for valid id string', () => {
    expect(parseIdParam('42')).toBe(42);
  });

  it('throws 400 for non-numeric id', () => {
    expect(() => parseIdParam('abc')).toThrow(AppError);
  });
});
```

## Coverage

**No coverage configuration exists.** No `coverageThreshold`, `collectCoverageFrom`, or coverage command in `package.json`. No istanbul/nyc/c8 configured.

## Fixtures and Factories

**For E2E:** Full seed data in `tests/e2e/global.setup.ts` (6 users, 2 camps, roles, permissions, resources, professions, inventory, people).

**For Unit:** No fixtures or factories exist yet. Will need test factories or manual Prisma mock setup.

## Testing Dependencies

| Package | Purpose |
|---------|---------|
| `jest` | Test runner |
| `ts-jest` | TypeScript support for Jest |
| `@types/jest` | Type definitions |
| `@playwright/test` | E2E test runner |
| `@faker-js/faker` | Available for test data generation |
| `dotenv-cli` | Env management for E2E (`npx dotenv -e .env.test`) |

**Not installed but needed for comprehensive testing:**
- `supertest` + `@types/supertest` — HTTP assertions for integration tests
- `jest-mock-extended` or similar — cleaner Prisma mocking

## Test Coverage Gaps by Priority

| Priority | Area | What's Missing | Risk |
|----------|------|----------------|------|
| **High** | Unit tests — all services | 0 unit tests across 14 modules + middleware + utilities | Changes not validated at service level |
| **High** | Unit tests — middleware | `auth.middleware`, `session.middleware`, `camp.middleware`, `permission.middleware` not unit tested | Auth/permission bugs caught late |
| **High** | Unit tests — AI evaluator | `src/ai/admission-evaluator.ts` — Groq API integration untested | AI decisions may fail silently |
| **Medium** | Unit tests — schemas | All Zod schemas untested at unit level | Validation edge cases untested |
| **Medium** | Integration tests | No Prisma-backed integration tests | Transaction logic not validated against real DB |
| **Medium** | Error handler tests | `error.middleware.ts` not tested | Error response format not validated |
| **Low** | Python tests (ml-service) | No pytest configuration or tests | ML model changes unchecked |

## E2E Test Coverage by Module

| Module | Endpoints Covered | Auth Tests | Error Cases | Edge Cases |
|--------|------------------|------------|-------------|------------|
| auth | login, logout | ✅ 401 no token | ✅ wrong password, missing fields, max length | ✅ repeated logout |
| camps | CRUD + list | ✅ 401 | ✅ 404, 409 duplicate, 400 empty/missing | ✅ pagination, camp-scoped isolation |
| people | CRUD + list | ✅ 401 | ✅ 404, 400 missing fields | ✅ cross-camp isolation, camp_id mismatch |
| permissions | CRUD + list | ✅ 401 | ✅ 404, 409 duplicate, 400 empty/missing | ✅ create-then-update |
| roles | CRUD + list | ✅ 401 | ✅ 404, 409 | ✅ permission assignment |
| professions | CRUD + list | ✅ 401 | ✅ 404, 409 | — |
| resources | CRUD + list | ✅ 401 | ✅ 404, 409 | — |
| inventory | tracking | ✅ 401 | ✅ validation errors | — |
| admission | create, review, list | ✅ 401 | ✅ 404, 400 missing fields | ✅ AI evaluation workflow |
| transfers | create, list, get | ✅ 401 | ✅ 400 self-transfer, empty items, missing fields | ✅ approval workflow |
| expeditions | schedule | ✅ 401 | ✅ validation | — |
| users | management | ✅ 401 | ✅ 404, 409 | — |
| system | time, health | ✅ not required | — | ✅ unauthenticated access |
| metrics | dashboard | ✅ 401 | — | ✅ property shape checks |

---

*Testing analysis: 2026-05-17*

# Testing Patterns

**Analysis Date:** 2026-05-17

## Test Framework

**Runner:**
- Jest 30.2.0 (`jest`, `ts-jest`, `@types/jest`)
- Config: `jest.config.ts` — preset `ts-jest`, environment `node`, matches `tests/unit/**/*.spec.ts`

**E2E Runner:**
- Playwright 1.58.2 (`@playwright/test`)
- No `playwright.config.*` file found in project root
- Run via: `npx playwright test` or `npm run test:e2e`

**Run Commands:**
```bash
npm test                # Jest unit tests (--passWithNoTests flag)
npm run test:e2e        # Playwright E2E tests
```

**Note:** `npm test` includes `--passWithNoTests` flag, meaning the test suite passes even when zero test files match.

## Test File Organization

**Location:**
- Unit tests: `tests/unit/{domain}/` — co-located by feature area
- E2E tests: `tests/e2e/{module}.spec.ts` — one file per module

**Naming:**
- Unit tests: `*.spec.ts` (matched by Jest config)
- E2E tests: `*.spec.ts` (matched by Playwright defaults)

**Current directory structure:**
```
tests/
├── unit/
│   ├── ai/
│   │   └── placeholder        # Empty placeholder file (not a test)
│   └── jobs/
│       └── placeholder        # Empty placeholder file (not a test)
└── e2e/
    ├── auth.spec.ts           # Stub — describe.skip / test.skip
    ├── people.spec.ts         # Stub — describe.skip / test.skip
    └── resources.spec.ts      # Stub — describe.skip / test.skip
```

**Jest config:** `jest.config.ts`
```typescript
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
};
```

## Test Implementation Status

**All test files are stubs.** No actual test logic exists in the codebase.

### E2E Tests (Playwright)

Each E2E spec file contains only a skipped placeholder:

```typescript
// tests/e2e/auth.spec.ts
describe.skip('Auth e2e', () => {
  test.skip('TODO: implement auth e2e tests', () => {});
});

// tests/e2e/people.spec.ts
describe.skip('People e2e', () => {
  test.skip('TODO: implement people e2e tests', () => {});
});

// tests/e2e/resources.spec.ts
describe.skip('Resources e2e', () => {
  test.skip('TODO: implement resources e2e tests', () => {});
});
```

Pattern: `describe.skip(<name>, ...)` with `test.skip('TODO: implement...')`.

### Unit Tests (Jest)

The `tests/unit/` directory contains two placeholder files (not actual `.spec.ts` files), meaning zero unit tests are discoverable by Jest:

- `tests/unit/ai/placeholder` — empty file
- `tests/unit/jobs/placeholder` — empty file

Since the Jest matcher is `**/*.spec.ts`, these placeholder files are not matched and no tests run.

## No Coverage Configuration

No code coverage thresholds or configuration exist:
- No `coverageThreshold` in `jest.config.ts`
- No `collectCoverageFrom` patterns
- No coverage commands in `package.json` scripts
- No `nyc`, `istanbul`, or `c8` config

## Fixtures and Factories

**No test fixtures exist.** There are no:
- Test seed data
- Factory functions for creating test entities
- Mock database helpers
- Test utility functions

The codebase uses real Prisma client directly in services (no repository/repository-mock pattern), making unit testing without a database connection challenging.

## Mocking

**No mocking framework configured beyond Jest built-ins.** No `jest.mock()` patterns exist in any test file since no tests exist.

**Recommended mocking approach** based on architecture:
- Mock `prisma` from `src/lib/prisma.ts` for service unit tests
- Mock `src/ai/admission-evaluator.ts` to avoid Groq API calls
- Mock `src/logger/logger.ts` for log-free tests
- Do NOT mock `AppError`, `parseIdParam`, or Zod schemas — test real validation/error behavior

## Test Types Required

Based on the project architecture (14 route modules, multi-table transactions, AI integration, rate limiting, session management), the following test categories need implementation:

### Unit Tests
- **Services** — mock Prisma, test business logic: pagination, existence checks, transaction orchestration, constraint error handling
- **Utilities** — `parseIdParam`, `handlePrismaError`, `AppError`
- **Middleware** — `validate`, `auth.middleware`, `session.middleware` (with mocked Prisma), `permission.middleware`, `error.middleware`
- **Schemas** — Zod schema validation (valid/invalid/edge cases)
- **AI** — `admission-evaluator.ts` with mocked Groq SDK

### Integration Tests
- **Database-backed tests** — Prisma transactions against test DB
- **API endpoint tests** — supertest against Express app with test middleware chain
- **Rate limiting** — verify 429 response after threshold
- **Session timeout** — verify 401 after inactivity
- **Permission enforcement** — verify 403 for missing permissions

### E2E Tests
- **Auth flow** — login, logout, session expiry
- **CRUD operations** — complete lifecycle per module (create → read → update → delete)
- **Admission workflow** — evaluate → review (accept/reject) → person creation
- **Transfer workflow** — create → schedule → source approve → target approve → complete
- **Camp scoping** — verify cross-camp data isolation

## Untested Areas by Priority

| Priority | Module/Area | Risk | Files |
|----------|-------------|------|-------|
| **High** | Auth + Session | Security bypass, token issues | `src/middlewares/auth.middleware.ts`, `src/middlewares/session.middleware.ts` |
| **High** | Permission enforcement | Authorization bypass | `src/middlewares/permission.middleware.ts`, all route files |
| **High** | Transfers | Multi-table transactions, inventory consistency | `src/modules/transfers/transfers.service.ts` (591 lines, most complex) |
| **High** | Admission + AI | AI evaluation errors, person auto-creation | `src/modules/admission/admission.service.ts`, `src/ai/admission-evaluator.ts` |
| **Medium** | Roles + Permissions CRUD | Transactional create/update with relations | `src/modules/roles/roles.service.ts`, `src/modules/permissions/` |
| **Medium** | Error handling | Global handler coverage | `src/middlewares/error.middleware.ts` |
| **Medium** | Rate limiting | Throttle bypass | `src/middlewares/rateLimit.middleware.ts` |
| **Medium** | Validation (Zod) | Schema bypass on edge cases | All `*.schema.ts` files |
| **Medium** | Inventory adjustments | Resource quantity integrity | `src/modules/inventory/inventory.service.ts` |
| **Low** | Camps, Resources, Professions, People | Standard CRUD patterns (lower complexity) | `src/modules/{camps,resources,professions,people}/` |
| **Low** | Metrics | Read-only dashboards | `src/modules/metrics/` |
| **Low** | System | Simple health/time endpoint | `src/modules/system/` |

## ML Service Tests

**No tests exist in `ml-service/`.** There is no test framework configured. The Python service has:

- No `tests/` directory
- No `pytest` or `unittest` dependency in `requirements.txt`
- No `conftest.py`
- No test runner configuration

The `ml-service/trainer.py` script provides training/evaluation metrics but is not a test:
```python
# trainer.py — evaluation script, not a test suite
def train_and_evaluate():
    X_train, X_test, y_train, y_test = train_test_split(...)
    admission_tree.classifier.fit(X_train, y_train)
    y_pred = admission_tree.classifier.predict(X_test)
    print(classification_report(y_test, y_pred))
```

Recommended: Add `pytest` to `requirements.txt`, write tests for:
- `extract_features()` — correct binary flag mapping from skills text
- `detect_profession_category()` — category detection accuracy
- `AdmissionDecisionTree.predict()` — minor acceptance, decision confidence thresholds
- Training data integrity — no NaN values, correct labels

## Common Test Patterns (to implement)

Based on the codebase architecture, expected test patterns:

**Service unit test (mock Prisma):**
```typescript
import { createPermission } from './permissions.service.js';
import { prisma } from '../../lib/prisma.js';
jest.mock('../../lib/prisma.js', () => ({ prisma: { permissions: { create: jest.fn() } } }));

describe('createPermission', () => {
  it('creates a permission with trimmed name', async () => {
    (prisma.permissions.create as jest.Mock).mockResolvedValue({ id: 1, name: 'test.permission' });
    const result = await createPermission({ name: '  test.permission  ' });
    expect(result.name).toBe('test.permission');
  });
});
```

**Schema validation test:**
```typescript
describe('createPermissionSchema', () => {
  it('rejects names without dot-delimited segments', () => {
    const result = createPermissionSchema.safeParse({ name: 'invalid_name' });
    expect(result.success).toBe(false);
  });

  it('accepts valid dot-delimited names', () => {
    const result = createPermissionSchema.safeParse({ name: 'module.action' });
    expect(result.success).toBe(true);
  });
});
```

**Middleware test (mock req/res/next):**
```typescript
describe('permissionMiddleware', () => {
  it('returns 403 when user lacks required permission', async () => {
    const middleware = permissionMiddleware('camps.create');
    // ... setup req with user having different permissions
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
```

## E2E Playwright Config (to add)

No `playwright.config.ts` exists. Expected configuration for API testing:
```typescript
// Expected: playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
});
```

## Dependencies for Testing

Currently installed:
- Jest ecosystem: `jest`, `ts-jest`, `@types/jest`
- E2E: `@playwright/test`

Not installed but potentially needed:
- `supertest` + `@types/supertest` — HTTP assertions for integration tests
- `jest-mock-extended` or `ts-mockito` — cleaner Prisma mocking
- `pytest` + `pytest-cov` — Python test runner

---

*Testing analysis: 2026-05-17*

# E2E Testing Stack: Gestión del Fin API

**Researched:** 2026-05-17
**Confidence:** HIGH (official docs + installed versions verified)

---

## Executive Summary

The project already has `@playwright/test` 1.58.2 installed and the decision record in `.planning/PROJECT.md` specifies Playwright for API E2E testing. This is the correct choice, but with an important constraint: the app calls `app.listen()` directly in `src/index.ts` without exporting `app`. Since the project scope is "no production code changes," **supertest is infeasible** — it requires an exported Express app instance for in-process testing. Playwright's `webServer` config + `request` fixture is the only approach that works without touching production code.

---

## Recommended Stack

### Core E2E Framework

| Technology         | Version            | Purpose                       | Why                                                                                                                                                                                                                        |
| ------------------ | ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@playwright/test` | 1.58.2 (installed) | E2E test runner + HTTP client | Already installed. `webServer` auto-starts Express app. `request` fixture provides HTTP assertions without browser. `globalSetup` seeds DB before all tests. Project dependencies pattern for reproducible setup/teardown. |

**Why Playwright over supertest+Jest for THIS project:**

| Factor                     | Playwright API Testing                        | supertest + Jest                                                                                       |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Works without code changes | ✅ `webServer` starts existing `src/index.ts` | ❌ Requires refactoring `src/index.ts` to export `app` (blocked by "no production changes" constraint) |
| Server lifecycle           | ✅ Built-in `webServer` with health-check URL | ❌ Manual `app.listen()` in `beforeAll` + port management                                              |
| Parallel execution         | ✅ Built-in worker model                      | ⚠️ Jest workers possible, but port conflicts with Express                                              |
| Test data seeding          | ✅ `globalSetup` or Project Dependencies      | ⚠️ Jest `globalSetup` available but Express must be exported                                           |
| HTML reports               | ✅ Built-in                                   | ❌ Requires `jest-html-reporter`                                                                       |
| Retries/flaky management   | ✅ First-class config                         | ❌ `jest.retryTimes` only since Jest 25, limited                                                       |
| Tracing/debugging          | ✅ Built-in trace viewer                      | ❌ Manual `console.log`                                                                                |
| If UI tests added later    | ✅ Same framework, same config                | ❌ Two frameworks, two configs, two mental models                                                      |

### Test Data & Seeding

| Technology                     | Version             | Purpose                                                                    | Why                                                                                                                                                                                        |
| ------------------------------ | ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prisma seed (`prisma/seed.ts`) | — (existing)        | Baseline test data: camps, users, roles, professions, resources, inventory | Already creates 2 camps + admin/worker users + known passwords. Tests can assert against known values (e.g., `Rations: 1160 kg in Alpha`). **Produces reproducible state.**                |
| `@faker-js/faker`              | 10.4.0 (to install) | Dynamic test data generation for edge cases                                | Generates realistic names, ages, blood types, identification codes. Avoids hardcoded fixture arrays. Use for create/update operations where exact values don't matter but uniqueness does. |
| `dotenv-cli`                   | 11.0.0 (to install) | Load `.env.test` for test-specific environment                             | Playwright's `webServer` inherits `process.env` by default. `dotenv-cli` loads a separate `.env.test` before starting the server so tests don't touch the development database.            |

**What NOT to use:**

- **`@anatine/zod-mock` / schema-based fakers:** Unnecessary complexity. The API uses Zod for validation, but generating valid payloads with `@faker-js/faker` + explicit objects is more readable and debuggable for capstone defense.
- **Dockerized test DB in a separate container:** Overkill for a university capstone. A separate database on the same PostgreSQL instance (`gestion_del_fin_test`) via `DATABASE_URL` override is simpler and faster.
- **`factory_bot` / `rosie` / test factories:** The Prisma seed already provides baseline entities. Adding a factory abstraction adds complexity with marginal benefit given the 2-week deadline.

### Test Infrastructure

| Technology                | Version              | Purpose                                          | Why                                                                                                            |
| ------------------------- | -------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Docker Compose PostgreSQL | 16-alpine (existing) | Test database                                    | Spin up `gestion_del_fin_test` database alongside the existing one. Tests connect via `DATABASE_URL` override. |
| `prisma migrate deploy`   | 7.8.0 (existing)     | Apply schema to test DB before tests             | Run in `globalSetup` before seeding. Ensures test DB matches production schema.                                |
| `tsx`                     | 4.21.0 (existing)    | Run TypeScript `globalSetup` without compilation | Playwright runs setup scripts; `tsx` allows them to be written in TypeScript directly.                         |

### Auth & Token Helpers

| Technology     | Version              | Purpose                                      | Why                                                                                                                                                                           |
| -------------- | -------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jsonwebtoken` | 9.0.3 (existing dep) | Generate test JWTs with specific roles/camps | Test files need to sign tokens for different role scenarios without calling `POST /api/auth/login` every time. The `jsonwebtoken` library is already a production dependency. |

---

## Alternatives Considered

| Category             | Recommended                           | Alternative                             | Why Not                                                                                                                                                                                     |
| -------------------- | ------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E framework        | Playwright `request` fixture          | supertest + Jest                        | `src/index.ts` calls `app.listen()` directly, doesn't export `app`. supertest requires an Express app instance. "No production code changes" blocks refactoring `src/index.ts`.             |
| E2E framework        | Playwright `request` fixture          | `node:http` assertions via `fetch`      | No test runner, no parallel execution, no reports. Manual everything. Unacceptable for capstone defense.                                                                                    |
| Test DB              | Separate database on same PG instance | Dockerized test DB container            | Adds container startup time (~30s). Same PostgreSQL instance with separate database is instant and sufficient for university scope.                                                         |
| Test DB              | Separate database on same PG instance | In-memory SQLite via `better-sqlite3`   | Prisma schema uses PostgreSQL-specific features (enums, `@db.Decimal`, `@db.VarChar`, CASCADE). SQLite would require schema changes, defeating "no production code changes."                |
| Data generation      | `@faker-js/faker`                     | Hardcoded test fixtures                 | 14 modules × ~5 test cases each = ~70 scenarios. Hardcoded data is fragile (unique constraint conflicts between test files). Faker avoids collisions.                                       |
| Data generation      | `@faker-js/faker`                     | `@anatine/zod-mock`                     | Generates valid-but-random data from Zod schemas. Less control over specific test scenarios. Harder to debug failures because data is fully random vs. semi-deterministic with faker seeds. |
| ENV loading          | `dotenv-cli`                          | Manual `process.env` in `webServer.env` | `dotenv-cli` loads a clean `.env.test` file. `webServer.env` requires duplicating all env vars in `playwright.config.ts`, harder to maintain.                                               |
| TypeScript execution | `tsx`                                 | `ts-node`                               | `tsx` is already in `devDependencies` and `npm run dev`. `ts-node` is also installed but `tsx` is faster and ESM-compatible.                                                                |

---

## Installation

```bash
# Install new dev dependencies (test data generation + env loading)
npm install -D @faker-js/faker@^10.4.0 dotenv-cli@^11.0.0

# Already installed — verify
npm list @playwright/test    # 1.58.2 ✓
npm list prisma              # 7.8.0 ✓
npm list tsx                 # 4.21.0 ✓
npm list jsonwebtoken        # 9.0.3 ✓ (production dep, usable in tests via barrel export)
```

**No additional installs needed for:**

- `@playwright/test` — already 1.58.2 (1.60.0 is latest, but 1.58.2 is recent and stable; upgrade is optional, not required)
- `prisma` — already 7.8.0
- `tsx` — already 4.21.0
- `jsonwebtoken` — already 9.0.3 (production dep, used for test token generation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  playwright.config.ts                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ globalSetup: tests/global-setup.ts            │  │
│  │  1. prisma migrate deploy (test DB)           │  │
│  │  2. npx tsx prisma/seed.ts (baseline data)   │  │
│  │  3. Optional: insert extra test-only data     │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ webServer:                                    │  │
│  │  command: dotenv -e .env.test -- tsx src/index│  │
│  │  url: http://localhost:3001/api/system/time   │  │
│  │  reuseExistingServer: !process.env.CI         │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ use: {                                        │  │
│  │   baseURL: 'http://localhost:3001'            │  │
│  │ }                                             │  │
│  │ projects: [                                   │  │
│  │   { name: 'api', testMatch: 'tests/e2e/**' }  │  │
│  │ ]                                             │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ globalTeardown: tests/global-teardown.ts      │  │
│  │  Clean up test-only data if needed            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  .env.test                                          │
│  DATABASE_URL=postgresql://gestion_user:admin@      │
│                localhost:5432/gestion_del_fin_test   │
│  JWT_SECRET=test-only-secret-key-for-e2e-tests      │
│  NODE_ENV=test                                      │
│  PORT=3001                                          │
│  GROQ_API_KEY=sk-test (or mock offline)             │
│  ML_SERVICE_URL=http://localhost:8000 (or mock)     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Test file: tests/e2e/camps.spec.ts                 │
│  ┌───────────────────────────────────────────────┐  │
│  │ import { test, expect } from '@playwright/test'│  │
│  │                                                │  │
│  │ test('GET /api/camps returns camps', async     │  │
│  │   ({ request }) => {                           │  │
│  │   const token = signTestToken({ role: 'admin' })│  │
│  │   const res = await request.get('/api/camps',  │  │
│  │     { headers: { Authorization: `Bearer ${t}`}})│  │
│  │   expect(res.status()).toBe(200);              │  │
│  │   const body = await res.json();               │  │
│  │   expect(body.data).toHaveLength(2);           │  │
│  │ });                                            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Test Data Strategy

### Two-Layer Approach

**Layer 1: Baseline seed (reproducible, shared)**

- `prisma/seed.ts` creates fixed entities: Alpha Outpost + Beta Sanctuary camps, admin_master user, engineer + scout professions, 3 resource types, 5 people, 3 expeditions, 4 transfers.
- Tests assert against **known values** (e.g., "Alpha has 2 camps", "admin_master login returns JWT", "Rations stock = 1160 kg").
- This is the "given" state that every test file starts from.

**Layer 2: Per-test data (dynamic, isolated)**

- `@faker-js/faker` generates unique values for create/update operations.
- Each test creates its own entities and cleans up or relies on test isolation.
- **Critical:** Faker seeding (`faker.seed(123)`) makes tests reproducible — same seed = same random data.

**Database reset strategy:**

- `globalSetup` truncates + re-seeds the entire test database before ALL tests.
- This means tests start from a clean, known state every run.
- Cost: ~2-3 seconds for full seed. Acceptable for ~70 test cases.
- Tests that modify data (POST, PUT, DELETE) don't contaminate other test files because every file gets a fresh DB.

### Why not per-test transactions?

- Playwright API tests hit a running server (separate process). The test process cannot wrap the server's DB connection in a transaction.
- Supertest can do this because it runs in-process, but supertest is blocked (see above).
- Full reseed is the pragmatic alternative. Fast enough for this project's scale.

---

## CI Considerations

### GitHub Actions pattern

```yaml
# .github/workflows/e2e.yml
name: E2E API Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: gestion_del_fin_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/gestion_del_fin_test
          JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
          NODE_ENV: test
```

**Key CI decisions:**

- Playwright `webServer` with `reuseExistingServer: false` on CI (auto-starts Express)
- `npm ci` not `npm install` (deterministic)
- Test DB via GitHub Actions service container (PostgreSQL 16)
- Secrets in GitHub repo settings, not committed

---

## Confidence Assessment

| Area                        | Confidence | Notes                                                                                                                                                                                                                                                                               |
| --------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright as E2E framework | HIGH       | Official docs confirm `request` fixture + `webServer` + `globalSetup` pattern. Version verified in `package.json`.                                                                                                                                                                  |
| supertest incompatibility   | HIGH       | Verified `src/index.ts` does NOT export `app` — calls `app.listen()` directly. "No production code changes" blocks refactor.                                                                                                                                                        |
| Faker 10.4.0                | HIGH       | `npm view` confirmed latest version. API stable since v8.                                                                                                                                                                                                                           |
| Prisma seed for test data   | HIGH       | Existing `seed.ts` produces complete state. Verified by reading file (855 lines of seeding).                                                                                                                                                                                        |
| dotenv-cli for test ENV     | HIGH       | `npm view` confirmed version 11.0.0. Pattern is standard for Playwright `webServer` commands.                                                                                                                                                                                       |
| Two-layer data strategy     | MEDIUM     | Pattern is standard (Playwright docs show similar GitHub API setup). Per-test isolation via full reseed is opinionated but pragmatic for university scope. Flag: alternative of per-file reseed with `test.describe.serial` could be faster — tradeoff between isolation and speed. |
| CI GitHub Actions           | MEDIUM     | Pattern is standard from Playwright CI docs. PostgreSQL service container is mature. Not yet tested in this repo's CI — flag for initial setup.                                                                                                                                     |

---

## Sources

| Source                            | URL                                                    | Confidence                      |
| --------------------------------- | ------------------------------------------------------ | ------------------------------- |
| Playwright API Testing docs       | https://playwright.dev/docs/api-testing                | HIGH — official                 |
| Playwright Web Server config      | https://playwright.dev/docs/test-webserver             | HIGH — official                 |
| Playwright Global Setup docs      | https://playwright.dev/docs/test-global-setup-teardown | HIGH — official                 |
| Playwright Configuration docs     | https://playwright.dev/docs/test-configuration         | HIGH — official                 |
| supertest README (GitHub)         | https://github.com/forwardemail/supertest              | HIGH — official                 |
| @faker-js/faker docs              | https://fakerjs.dev/                                   | HIGH — official                 |
| package.json (installed versions) | `package.json` in repo root                            | HIGH — verified direct          |
| src/index.ts (app startup)        | `src/index.ts` in repo                                 | HIGH — verified direct          |
| prisma/seed.ts (baseline data)    | `prisma/seed.ts` in repo                               | HIGH — verified direct          |
| docker-compose.yml (DB config)    | `docker-compose.yml` in repo                           | HIGH — verified direct          |
| npm registry (latest versions)    | `npm view` CLI                                         | HIGH — current as of 2026-05-17 |

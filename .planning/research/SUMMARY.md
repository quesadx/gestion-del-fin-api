# Project Research Summary

**Project:** Gestión del Fin API — E2E Test Suite
**Domain:** REST API integration testing (Playwright `request` fixture, pure API — no browser)
**Researched:** 2026-05-17
**Confidence:** HIGH

## Executive Summary

This is a comprehensive E2E API test suite for a 14-module Express/Prisma/PostgreSQL backend that manages multi-camp survival operations (zombie apocalypse scenario). The system has 66+ endpoints behind an 8-layer middleware chain (auth → session → camp → permission → rateLimit → validate → errorHandler), with camp-scoped multi-tenancy, fine-grained RBAC (56 permissions), 20-minute session timeout, AI-driven admission decisions, and daily cron jobs — all of which must be proven correct through HTTP-level testing for a graded university capstone defense on June 1, 2026.

The recommended approach uses **Playwright 1.58.2** (already installed) with `webServer` auto-start, project dependencies for DB seeding/teardown, custom role-based fixtures to eliminate auth boilerplate, and **serial execution** (`workers: 1`) to prevent session middleware race conditions across the 14 spec files. Supertest is infeasible because `src/index.ts` calls `app.listen()` directly without exporting the Express app instance — and "no production code changes" is a hard constraint. The test database uses a separate PostgreSQL database (`gestion_del_fin_test`) on the same instance, seeded with deterministic data via the existing `prisma/seed.ts` baseline, augmented with `@faker-js/faker` for dynamic test data.

Key risks to manage: session timeout invalidates tokens during long test runs (require per-test login or direct `last_activity` manipulation), three known cross-camp data leakage bugs can produce false-positive tests (every list-endpoint test must assert camp-scoping explicitly), AI/ML external dependencies (Groq, ML microservice) cause non-deterministic failures (must mock), and the global rate limiter (200 req/15min) can throttle mid-suite (needs `NODE_ENV=test` bypass). The architecture addresses all of these through intentional design decisions documented below.

## Key Findings

### Recommended Stack

Playwright's `request` fixture is the only viable E2E framework for this project — supertest requires exporting the Express `app` from `src/index.ts`, which is blocked by the "no production code changes" constraint. The `webServer` config auto-starts the Express server with `NODE_ENV=test` (which suppresses cron jobs at `src/index.ts:92`), and the `request` fixture provides HTTP assertions without any browser overhead.

**Core technologies:**

- **`@playwright/test` 1.58.2 (installed):** E2E test runner + HTTP client via `request` fixture. Provides `webServer` for auto-starting Express, `globalSetup` for DB seeding, built-in HTML reports, retries, and tracing. No additional install needed.
- **Prisma 7.8.0 (installed) + existing `prisma/seed.ts`:** Baseline test data seeding. Creates 2 camps, 4 roles, 56 permissions, 3 resources, 2 professions, test users, sample people/expeditions/transfers. Produces deterministic, reproducible state — tests assert against known values.
- **`@faker-js/faker` 10.4.0 (to install):** Dynamic test data generation for create/update operations. Avoids unique constraint conflicts between test files. Seeded (`faker.seed(123)`) for reproducibility.
- **`dotenv-cli` 11.0.0 (to install):** Loads `.env.test` before starting the server via `webServer` command. Keeps test DB credentials separate from development.
- **`jsonwebtoken` 9.0.3 (existing production dep):** Direct JWT generation in global setup bypasses login round-trips per role. Call `signAccessToken()` from `src/shared/utils/jwt.ts` with test user data.
- **`tsx` 4.21.0 (installed):** Runs TypeScript `globalSetup` without compilation. Already used for `npm run dev`.

### Expected Features

**Must have (table stakes — missing any undermines credibility):**

1. **Playwright config** — `webServer`, `baseURL`, `NODE_ENV=test`, project dependencies for setup/teardown
2. **Module-organized spec files** — 14 spec files matching codebase convention (`{module}.spec.ts`)
3. **Happy-path test per endpoint** — all ~66 endpoints with valid auth + valid body → assert 2xx + correct response shape
4. **Auth boundary tests (401)** — no token, invalid token, expired token, wrong password
5. **Authorization tests (403)** — insufficient role, cross-camp access denied
6. **Not-found tests (404)** — every GET/PUT/DELETE by ID with non-existent resource
7. **Validation tests (400)** — Zod rejection for invalid bodies per endpoint
8. **Conflict tests (409)** — duplicate name/email triggers unique constraint handling
9. **Response body assertions** — not just `.ok()`, but field presence, types, values
10. **Error message assertions** — verify `{ error: { message, statusCode } }` envelope shape
11. **Test isolation** — each test independent, no order dependencies
12. **Test data lifecycle** — data created in `beforeEach`, cleaned in `afterEach`

**Should have (differentiators — what makes the suite stand out for grading):**

13. **Cross-camp isolation tests** — **highest-impact differentiator.** Proven with 2+ camps, non-admin tokens, explicit assertion that list endpoints return only requesting-camp records. Directly addresses three known data leakage bugs.
14. **Multi-role test matrix** — test key endpoints as admin, camp_manager, worker, unauthenticated
15. **Multi-step workflow tests** — transfer lifecycle (create → schedule → approve → complete), admission lifecycle, expedition lifecycle
16. **Custom auth fixtures** — `adminRequest`, `workerCamp1Request`, etc. via Playwright `test.extend()`
17. **Test data factories** — `createTestCamp()`, `createTestUser()` helpers calling the API
18. **HTML test report** — physical artifact for defense presentation
19. **Self-documenting test names** — `'POST /api/camps should return 201 and created camp'` convention
20. **Pagination edge cases** — page=0, page beyond data, negative pageSize

**Defer (v2+ / post-defense):**

- Rate limiting tests (complex to isolate, admission module surface area is small)
- Session timeout tests (requires clock manipulation or short-expiry edge cases)
- Full 56-permission exhaustive matrix (test representative roles: admin, worker, resource_mgr, travel_coord)
- AI admission with real Groq/ML services (mock instead; real AI is non-deterministic)

### Architecture Approach

The suite uses **Playwright project dependencies** (not `globalSetup`) for setup/teardown because the setup project appears in HTML reports, supports fixtures, and benefits from config auto-application. Execution is **serial** (`workers: 1`, `fullyParallel: false`) to prevent session middleware races on `last_activity` and `session_version`. Six custom fixtures provide pre-authenticated `APIRequestContext` instances (admin_camp1, admin_camp2, worker_camp1, worker_camp2, resource_mgr, travel_coord) — spec files import from `tests/e2e/helpers/fixtures.ts` instead of `@playwright/test`. The auth module spec is the sole exception: it imports raw `request` from Playwright to test login/logout without circularity.

**Major components:**

1. **`playwright.config.ts`** — Project definitions (setup, e2e, teardown), `webServer` command with `dotenv -e .env.test -- npm run dev`, `baseURL: 'http://localhost:3000/api'`, serial execution, 15s test timeout
2. **`tests/e2e/global.setup.ts`** — Truncate all tables, insert deterministic seed data (2 camps, 6 test users across 4 roles, permissions, resources, professions, sample entities), generate JWT tokens via `signAccessToken()`, write to `.auth/tokens.json`
3. **`tests/e2e/helpers/fixtures.ts`** — Custom `test.extend()` producing 6 typed `APIRequestContext` fixtures with pre-set auth headers
4. **`tests/e2e/helpers/assertions.ts`** — Reusable `expectError(response, status, message?)`, `expectDataArray(response, minLength?)`, `expectEntity(response)`, `expectCreated(response)`
5. **`tests/e2e/helpers/data.ts`** — Centralized constants for seed entity IDs, expected names, test password, role names
6. **`tests/e2e/helpers/auth.ts`** — Token loading, `authHeader(role)`, `getCampIdForRole(role)` typed utilities
7. **14 spec files** — One per domain module (`auth.spec.ts`, `camps.spec.ts`, `people.spec.ts`, …, `metrics.spec.ts`), each with three `test.describe` blocks (happy path, error cases, edge cases)

**Data flow:** Setup truncates → seeds → generates tokens → writes `tokens.json`. Each spec file imports fixtures → fixture loads tokens → creates `APIRequestContext` with auth header. Each test makes HTTP requests through the full middleware chain → asserts on status + body. Teardown deletes `tokens.json`.

### Critical Pitfalls

1. **Session timeout invalidates long-lived tokens** — `sessionMiddleware` checks `last_activity` against real clock time. Tokens generated at suite start expire after 20 minutes of wall-clock time. **Prevent with:** per-test login (`POST /api/auth/login` in `beforeEach`) or direct `last_activity` manipulation. Address in Phase 1.

2. **Cross-camp data leakage produces false-positive tests** — Three known bugs (`getTransfers`, `getUsers`, `getExplorations`) return all-camp data with no `where` clause. Single-camp tests pass trivially while the security vulnerability remains. **Prevent with:** every list endpoint test seeds 2+ camps and asserts the response contains ONLY requesting-camp records. Address in every module phase.

3. **JWT token requires exact DB state match** — Token payload includes `sessionVersion`. Manual Prisma inserts bypass `auth.service.login()` which atomically sets `last_activity`, `isAdmin`, and signs the token. Mismatch → 401. **Prevent with:** never sign tokens manually in test bodies. Use `POST /api/auth/login` or generate tokens once in global setup with verified seed state. Address in Phase 1.

4. **Rate limiting breaks comprehensive suites** — Global 200 req/15min. 14 modules × 10 tests = 140 requests, close to the limit. **Prevent with:** `NODE_ENV=test` bypass in `rateLimit.middleware.ts` (no-op middleware export), or reset store between files. Address in Phase 1.

5. **AI/ML dependencies cause non-deterministic failures** — Admission calls Groq LLM (`llama-3.3-70b-versatile`) + ML microservice (`POST localhost:8000/evaluate`). Both are non-deterministic and may be unavailable in CI. **Prevent with:** mock Groq SDK at the module level, mock ML service at HTTP level via Playwright route interception. Address in the Admission phase.

## Implications for Roadmap

Based on combined research, the FEATURES.md dependency graph, and the ARCHITECTURE.md build order:

### Phase 1: Test Infrastructure & Auth Foundation (Days 1-2)

**Rationale:** Everything depends on the config, the database having seed data, and tokens being available. No module test can be written until auth fixtures exist. This is the critical path.

**Delivers:** Working `playwright.config.ts` with `webServer`, `.env.test`, global setup that seeds the test DB and generates tokens, global teardown, all 4 helper files (auth types, fixtures, assertions, data constants), and `system.spec.ts` as a proof-of-pattern.

**Addresses features:** Playwright config (1), test data lifecycle (12), custom auth fixtures (17), system endpoint validation (25), self-documenting test names (21)

**Avoids pitfalls:** Session timeout (pitfall 1 — establish auth pattern before any module tests), JWT/DB mismatch (pitfall 3 — use `signAccessToken` in setup, never manual `jwt.sign`), rate limiting (pitfall 4 — configure `NODE_ENV=test` bypass), cron job contamination (pitfall 6 — enforce `NODE_ENV=test`), admin bypass (pitfall 11 — define role taxonomy), 401 vs 403 confusion (pitfall 9 — establish exact status code conventions)

**Research flag:** LOW — `playwright.config.ts` and fixture patterns are well-documented in Playwright official docs. The custom fixture extension pattern is standard.

### Phase 2: Foundation Modules — Auth, Camps, Professions, Resources (Days 3-4)

**Rationale:** These are the simplest modules with fewest dependencies. Auth tests login/logout (public endpoints), camps demonstrate the canonical CRUD pattern that all other modules follow, professions and resources are simple CRUD. Establishing the test patterns here makes all subsequent modules faster to write.

**Delivers:** `auth.spec.ts` (login/logout, rate limiting), `camps.spec.ts` (CRUD + 401/403/404/409/400), `professions.spec.ts`, `resources.spec.ts`

**Uses:** Custom fixtures for auth context, reusable assertions (`expectError`, `expectCreated`, `expectEntity`), test data constants, `@faker-js/faker` for create payloads

**Implements:** Three-category test organization pattern (happy path, error cases, edge cases), `test.afterEach` cleanup pattern

**Avoids pitfalls:** isAdmin bypass (pitfall 11 — use non-admin tokens for camp-scoping), campMiddleware URL gaps (pitfall 7 — verify camp ID extraction per endpoint pattern)

**Research flag:** LOW — CRUD testing patterns are standard. Auth JWT patterns verified against codebase middleware chain.

### Phase 3: RBAC & User Management (Days 5-6)

**Rationale:** Roles and permissions are the reference data for all authorization tests. Users depend on camps + roles. Building this layer unlocks multi-role testing across the remaining modules.

**Delivers:** `roles.spec.ts`, `permissions.spec.ts`, `users.spec.ts`

**Addresses features:** Multi-role test matrix (14) — verify worker can't create camps, resource_mgr can create resources, travel_coord can create expeditions

**Avoids pitfalls:** JWT/DB mismatch (pitfall 3 — user creation through API preserves `session_version` consistency), permissionMiddleware 401 vs 403 (pitfall 9 — assert exact status codes for no-token, wrong-role, correct-role scenarios)

**Research flag:** LOW — RBAC testing follows the CRUD pattern established in Phase 2. Permission mapping verified against `prisma/seed.ts` role_permissions.

### Phase 4: Domain CRUD — People, Inventory (Days 7-8)

**Rationale:** People depends on camps + professions (Phase 2). Inventory depends on camps + resources (Phase 2). These modules introduce data-dependent assertions (e.g., "created person must belong to requesting camp").

**Delivers:** `people.spec.ts`, `inventory.spec.ts`

**Addresses features:** Cross-camp isolation tests (13) — the first modules where cross-camp leakage matters. People in Camp A vs Camp B must be scoped. Inventory quantities must be per-camp. Empty results edge case (23).

**Avoids pitfalls:** Cross-camp data leakage (pitfall 2 — every list endpoint test with 2+ camps, non-admin token), test DB cleanup orphans (pitfall 10 — `afterEach` deletes children before parents, or use unique names)

**Research flag:** LOW — CRUD completion. Inventory requires awareness of cron job suppression (pitfall 6 verified in Phase 1).

### Phase 5: Complex Workflows — Expeditions, Transfers, Admission (Days 9-12)

**Rationale:** These are multi-step state machines with the highest complexity and grading impact. Transfers alone has 8 endpoints in an approval workflow across two camps. Admission depends on AI/ML services that must be mocked. These tests are the "wow factor" for the defense presentation.

**Delivers:** `expeditions.spec.ts` (lifecycle: create → schedule → depart → return), `transfers.spec.ts` (full approval workflow: create → schedule → approve_source → approve_target → complete), `admission.spec.ts` (AI evaluation + manual review, with mocks)

**Addresses features:** Multi-step workflow tests (15), cross-camp isolation (13 — transfers span two camps), rate limiting test (20 — admission), HTML report (19 — all test results visible)

**Avoids pitfalls:** AI/ML non-determinism (pitfall 5 — mock Groq SDK and ML HTTP calls; never depend on real AI for pass/fail), cross-camp data leakage (pitfall 2 — transfers and expeditions are KNOWN leakage endpoints), test DB cleanup orphans (pitfall 10 — foreign key order matters for transfer entities), admission rate limit (pitfall 4 — space tests or test 429 explicitly)

**Research flag:** MEDIUM — Admission mocking strategy needs validation. Groq SDK mocking approach (module-level mock vs. HTTP interception) requires decision during planning. ML service mock via Playwright route interception in `request` context may need `page` context workaround.

### Phase 6: Aggregation & Polish (Days 13-14)

**Rationale:** Metrics depends on all other data existing. Final polish elevates the suite from "passes" to "impresses."

**Delivers:** `metrics.spec.ts` (dashboard analytics), edge case tests across all modules (pagination edges, boundary values, empty results), test name audit and standardization, HTML report configuration and verification, `README` updates

**Addresses features:** Pagination edge cases (22), boundary values (24), self-documenting test names (21), HTML report (19)

**Avoids pitfalls:** auditLog race conditions (pitfall 13 — use retry/polling for audit_log assertions)

**Research flag:** LOW — aggregation and polish. Standard patterns.

### Phase Ordering Rationale

- **Dependency-driven:** Infrastructure → Auth → CRUD → Workflows → Aggregation matches FEATURES.md's dependency graph: Config → Global Setup → Auth Fixtures → Everything else. You cannot test a protected endpoint without auth. You cannot test transfers without camps, people, and resources.
- **Risk-driven:** The highest-risk modules (transfers, admission, expeditions) come late — after patterns are proven on simpler modules. This prevents wasting time debugging complex workflows while still establishing auth infrastructure.
- **Grading-driven:** Cross-camp isolation tests (the #1 differentiator) are embedded in Phase 4 and Phase 5 — not deferred to the end. The defense's most impressive tests (transfer workflow) are in Phase 5 with buffer days before June 1.
- **Parallelism potential:** Once Phase 1 and Phase 2 are complete, Phases 3 and 4 could theoretically be parallelized if multiple contributors exist — but serial execution (`workers: 1`) limits test runner parallelism, not development parallelism.

### Research Flags

**Phases needing `gsd-research-phase` during planning:**

- **Phase 5 (Admission):** AI/ML mocking strategy. Groq SDK module-level mock vs. Playwright HTTP route interception needs decision. ML service (`fetch` to port 8000) cannot be intercepted with `request` fixture alone — may need `browserContext.route()` or module-level `nock`-style interception. This is the single biggest architectural decision remaining.
- **Phase 5 (Transfers):** Cross-camp workflow state machine has 8 endpoints. The test flow needs careful design to avoid test interdependency within the spec file. `test.describe.serial` vs. independent tests with fresh state per test.

**Phases with standard patterns (skip research-phase):**

- **Phase 1, 2, 3, 4, 6:** All use well-documented Playwright patterns. CRUD testing, fixture extensions, project dependencies, and three-category test organization are established conventions.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack        | HIGH       | Playwright version verified in `package.json`. `src/index.ts` confirmed no `app` export. Prisma seed verified at 855 lines. `npm view` confirmed faker 10.4.0 and dotenv-cli 11.0.0. All source checks are direct codebase inspection or official registry.                                                                                                                                                                                                              |
| Features     | HIGH       | Playwright API testing docs confirm `request` fixture, `webServer`, and project dependency patterns. Codebase middleware chain verified at `src/index.ts`. Known bugs documented in `.planning/codebase/CONCERNS.md`. Test stub files exist at `tests/e2e/`.                                                                                                                                                                                                             |
| Architecture | HIGH       | Playwright project dependencies pattern is official (1.31+). Custom fixtures via `test.extend()` documented in Playwright guides. Middleware chain flow verified against all 8 middleware files. DB schema foreign keys (`onDelete: NoAction`) confirmed in `prisma/schema.prisma`. Token generation via `signAccessToken` confirmed in `src/shared/utils/jwt.ts`.                                                                                                       |
| Pitfalls     | HIGH       | All 15 pitfalls verified against actual codebase: `session.middleware.ts` (lines 38-47), `camp.middleware.ts` (line 60-62 admin bypass), `rateLimit.middleware.ts` (MemoryStore, no test bypass), `error.middleware.ts` (production message masking), `admission-evaluator.ts` (Groq + ML fetch), `scheduler.ts` (cron defaults), `auditLog.ts` (fire-and-forget), `validate.middleware.ts` (dual-parse). CONCERNS.md documents known cross-camp leakage in 3 endpoints. |

**Overall confidence:** HIGH — all four research files are based on direct codebase inspection and official Playwright documentation. No inferences from incomplete data. The only medium-confidence element is the Admission mocking strategy (STACK.md notes this as MEDIUM), which is flagged for Phase 5 research.

### Gaps to Address

- **Admission AI/ML mocking strategy:** How to intercept `fetch()` calls to the ML microservice (port 8000) from the Express server process when using Playwright's `request` fixture (no `page` context). Options: (a) module-level mock via `jest.mock` or proxyquire, (b) environment variable to skip AI evaluation in test mode, (c) `nock` to intercept at the HTTP level. Needs decision during Phase 5 planning.

- **Rate limiter bypass mechanism:** Whether to modify `rateLimit.middleware.ts` to check `NODE_ENV === 'test'` (violates "no production code changes") or use an alternative approach like a separate test-only Express instance. The PITFALLS research recommends the code change; the constraint says no production changes. This tension needs resolution in Phase 1.

- **Test database provisioning:** Whether the test DB is created manually (`createdb gestion_del_fin_test`) or automated via a script. `prisma migrate deploy` must target the test DB. A `.env.test.example` file and setup script need to be in the deliverables but are not yet defined.

- **`last_activity` strategy for long test runs:** Per-test login via `POST /api/auth/login` guarantees fresh `last_activity` but adds ~100ms per test. Direct `last_activity` manipulation via Prisma in `beforeEach` is faster but couples tests to DB. The architecture prefers per-test login; performance impact on 140+ tests needs measurement.

- **CI integration:** GitHub Actions workflow pattern is described in STACK.md but not yet implemented. PostgreSQL service container, `npx playwright install --with-deps`, and secret management are documented but untested in this repo.

## Sources

### Primary (HIGH confidence)

- [Playwright API Testing docs](https://playwright.dev/docs/api-testing) — `request` fixture, `webServer` config, project dependencies, global setup/teardown, custom fixtures via `test.extend()`
- [Playwright Configuration docs](https://playwright.dev/docs/test-configuration) — project definitions, workers, timeouts, `fullyParallel`, `webServer` options
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) — test isolation, assertions, test naming conventions
- `src/index.ts` (direct inspection) — confirmed `app.listen()` without export, `NODE_ENV !== 'test'` cron suppression at line 92, middleware chain order
- `src/middlewares/*` (all 8 files, direct inspection) — `auth`, `session`, `camp`, `permission`, `rateLimit`, `validate`, `error` middleware behavior and edge cases
- `prisma/seed.ts` (direct inspection, 855 lines) — deterministic seed data: 2 camps, 4 roles, 56 permissions, 3 resources, 2 professions, test users, sample entities
- `prisma/schema.prisma` (direct inspection) — foreign key constraints (`onDelete: NoAction`), PostgreSQL-specific features (`@db.Decimal`, `@db.VarChar`, enums), table relationships
- `.planning/codebase/CONCERNS.md` (direct inspection) — three known cross-camp data leakage bugs in `getTransfers`, `getUsers`, `getExplorations`
- `package.json` (direct inspection) — verified `@playwright/test` 1.58.2, `prisma` 7.8.0, `tsx` 4.21.0, `jsonwebtoken` 9.0.3 installed
- `npm view` CLI — verified `@faker-js/faker` 10.4.0 and `dotenv-cli` 11.0.0 latest versions

### Secondary (MEDIUM confidence)

- [express-rate-limit GitHub](https://github.com/express-rate-limit/express-rate-limit) — `MemoryStore` behavior, `skip` option, `resetKey` API
- `.planning/codebase/ARCHITECTURE.md` — project module inventory, endpoint counts, middleware chain documentation
- `tests/e2e/` (direct inspection) — 3 existing `describe.skip` stubs (`auth`, `people`, `resources`)

### Tertiary (LOW confidence)

- CI GitHub Actions pattern — described in STACK.md but not yet tested in this repo. PostgreSQL service container and `npx playwright install` patterns are from Playwright CI docs but not validated against this project's specific setup.

---

_Research completed: 2026-05-17_
_Ready for roadmap: yes_

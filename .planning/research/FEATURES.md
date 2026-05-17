# Feature Landscape: E2E API Test Suite

**Domain:** REST API integration testing (Playwright `request` fixture)
**Researched:** 2026-05-17
**Confidence:** HIGH (Playwright docs verified; project architecture fully mapped)

## Overview

This document categorizes the **testing features** (capabilities of the test suite itself, not application features) needed for a credible, gradeable E2E test suite for the Gestión del Fin API. The test suite exercises 14 domain modules, ~66 endpoints, through authenticated HTTP requests only — no browser, no frontend.

The grading context is a university capstone ("pruebas de integración" criterion, ~14% of final grade). Professors will assess: does the suite prove the API works correctly under all conditions?

---

## Table Stakes

These are the **minimum viable test suite** capabilities. Missing any of these makes the suite look incomplete or amateurish to a grading panel.

| #   | Feature                                         | Why Expected                                                                                                                                                                                                               | Complexity      | Notes                                                                                                                                                                     |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Playwright config (`playwright.config.ts`)**  | Every Playwright suite needs one. Defines `baseURL`, `webServer` to auto-start the API, timeout policy, reporter (HTML), and test directory. Without it, `npx playwright test` won't work.                                 | Low             | MUST configure `webServer` to start the Express server before tests and kill it after. Use `NODE_ENV=test` to suppress cron jobs (already built-in at `src/index.ts:92`). |
| 2   | **Module-organized spec files**                 | One spec file per domain module (14 files minimum). Professors can navigate by module. Tests within each file grouped by endpoint using `test.describe()`.                                                                 | Low             | Current state: only 3 `describe.skip` stubs exist (`auth`, `people`, `resources`).                                                                                        |
| 3   | **Happy-path test for every endpoint**          | Proves every endpoint works under normal conditions. At minimum: send valid auth + valid body → assert 2xx status + correct response shape. Covers all ~66 endpoints across 14 modules.                                    | Medium (volume) | Use pattern: `const res = await request.post('/api/camps', { data: {...} }); expect(res.status()).toBe(201);` then assert JSON body fields.                               |
| 4   | **Authentication boundary tests (401)**         | Proves the security perimeter works. Tests: request without token → 401, request with invalid token → 401, request with expired token → 401. Also: login succeeds with valid credentials, login fails with wrong password. | Low             | The `auth` module already has login/logout endpoints. Token format is JWT via `jsonwebtoken`.                                                                             |
| 5   | **Authorization tests (403 Forbidden)**         | Proves RBAC is real. User with insufficient role/permissions gets 403. Not the same as 401 — 403 means "you're logged in but not allowed."                                                                                 | Medium          | Test at least: regular user trying admin-only endpoint, camp member trying cross-camp operation.                                                                          |
| 6   | **Not-found tests (404)**                       | Proves error handling works. Valid auth + valid endpoint pattern + non-existent resource ID → 404 with descriptive message.                                                                                                | Low             | Every GET-by-ID and PUT-by-ID and DELETE-by-ID endpoint needs this.                                                                                                       |
| 7   | **Validation tests (400)**                      | Proves Zod middleware works. Invalid request bodies (too-short strings, missing required fields, negative IDs, invalid emails) → 400 with validation error details.                                                        | Medium          | Need at least one invalid-input test per endpoint that accepts a body.                                                                                                    |
| 8   | **Conflict tests (409)**                        | Proves unique constraint handling. Duplicate name/email/etc. → 409 with message about the specific conflict.                                                                                                               | Low             | Only for endpoints that have unique constraints (camps names, user emails, role names, etc.).                                                                             |
| 9   | **Response body assertions (not just `.ok()`)** | A test that only checks `.ok()` proves nothing. Must assert: correct fields present, correct types, correct values for the created/returned resource.                                                                      | Medium          | Pattern: `const body = await res.json(); expect(body).toMatchObject({ id: expect.any(Number), name: 'Test Camp' });`                                                      |
| 10  | **Error message assertions**                    | Proves error responses are well-formed. Error body must contain `{ error: { message: string, statusCode: number } }` per the global error handler.                                                                         | Low             | Don't just check `res.status() === 400` — also check `body.error.message` is descriptive.                                                                                 |
| 11  | **Test isolation**                              | Each test runs independently. No test depends on data created by another test. Test order doesn't matter. This is critical for reproducibility during grading (professor runs a single test, it still works).              | Medium          | Use `test.beforeEach` to seed fresh data. Avoid persistent test data.                                                                                                     |
| 12  | **Test data lifecycle**                         | Tests need data (camps, users, roles, people) to exercise endpoints. Must create needed data before tests and clean up after.                                                                                              | Medium          | Global setup: create test camp(s), create test user(s), obtain JWT tokens. Global teardown: delete all test data. Or create/delete within `beforeEach`/`afterEach`.       |

---

## Differentiators

These elevate the test suite from "passes minimum bar" to "stands out for grading." They demonstrate engineering maturity, security awareness, and thoroughness.

| #   | Feature                         | Value Proposition                                                                                                                                                                                                                                                                                                                                                      | Complexity | Notes                                                                                                                                                                                                                                  |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | **Cross-camp isolation tests**  | **This is the #1 differentiator.** The codebase has known cross-camp data leakage bugs (transfers, users, expeditions return data from all camps). Tests that prove camp-scoping works — or catch the known bugs — show deep understanding of the security model. Log in as Camp A user, request Camp B resources, assert we get back **only Camp A's data** (or 403). | High       | Directly addresses CONCERNS.md critical issues. Requires: 2+ test camps, 2+ users in different camps. Test pattern: `GET /api/people` as Camp A user → assert all returned people have `camp_id === CampA.id`.                         |
| 14  | **Multi-role test matrix**      | Proves RBAC at a granular level. Test key endpoints with: admin (full access), camp manager (scoped access), regular user (minimal access), and unauthenticated user. Shows the grading panel that authorization isn't just a checkbox — it's tested systematically.                                                                                                   | High       | The system has 56 permissions across roles. Pick representative ones: admin, camp_manager, a basic role. Test ~3 endpoints per role category.                                                                                          |
| 15  | **Multi-step workflow tests**   | Proves complex business logic. Instead of testing endpoints in isolation, test real workflows: **transfer lifecycle** (create → schedule → approve-source → approve-target → complete), **admission lifecycle** (create → AI evaluates → manual review → accept/reject), **expedition lifecycle** (create → schedule → return).                                        | High       | Transfers alone has 8 endpoints in a state machine. This is the most impressive test block for grading.                                                                                                                                |
| 16  | **Session timeout tests**       | Proves the 20-minute inactivity timeout works. Make a request, wait/simulate timeout (advance clock or use short expiry), assert next request gets 401.                                                                                                                                                                                                                | Medium     | The session middleware checks `users.last_activity`. Could use a test user with short session or mock the date. Playwright has no built-in clock API for API tests (clock is browser-only), so may need an environment-based approach. |
| 17  | **Custom auth fixtures**        | Makes tests DRY and readable. Create a `test` fixture extension that provides `authenticatedRequest` (pre-configured with JWT for a specific role), `adminRequest`, `campARequest`, `campBRequest`. Professors can read the test and instantly understand the auth context.                                                                                            | Medium     | Use Playwright's `test.extend()` pattern. Each request fixture = `APIRequestContext` with auth headers preset.                                                                                                                         |
| 18  | **Test data factories**         | Reusable helper functions that create test entities via API: `createTestCamp(name, overrides)`, `createTestUser(role, campId)`, `createTestPerson(campId, profession)`. Makes test setup declarative and clean. Shows professional engineering.                                                                                                                        | Medium     | Factories call the API endpoints (not direct DB). Tests remain pure E2E.                                                                                                                                                               |
| 19  | **HTML test report**            | Physical artifact for the June 1 defense. Run `npx playwright test` → open HTML report showing all tests green, organized by module, with pass/fail/duration. Professors can literally see the test suite results.                                                                                                                                                     | Low        | Configure `reporter: [['html', { outputFolder: 'test-results/report' }]]` in playwright.config.ts.                                                                                                                                     |
| 20  | **Rate limiting test**          | Proves the admission rate limit (10 req/min) actually works. Send 11+ requests rapidly → assert 429 Too Many Requests.                                                                                                                                                                                                                                                 | Medium     | Only applicable to `POST /api/admission/camps/:campId`. Can batch-send requests in a loop.                                                                                                                                             |
| 21  | **Self-documenting test names** | Tests named with the pattern: `'POST /api/camps should return 201 and created camp'`, `'GET /api/people should return 403 when user has insufficient role'`. The test report reads like API documentation — professors can see exactly what's tested without reading code.                                                                                             | Low        | Convention: `'[METHOD] [path] should [expected behavior] [when condition]'`.                                                                                                                                                           |
| 22  | **Pagination edge case tests**  | Proves API robustness. Test: page 0 (should fail 400 or return page 1), page beyond available data (empty array), negative pageSize, pageSize=0.                                                                                                                                                                                                                       | Low        | Only for list endpoints that support pagination (`?page=&pageSize=`).                                                                                                                                                                  |
| 23  | **Edge case: empty results**    | Test list endpoints with filters that match nothing → assert 200 with empty array, not 404. Libraries and frontends depend on this behavior.                                                                                                                                                                                                                           | Low        | Create a fresh test camp with no people/resources → `GET /api/people` → assert `[]` with 200.                                                                                                                                          |
| 24  | **Edge case: boundary values**  | Test maximum field lengths (names at 80 chars), minimum field lengths (single char), numeric boundaries (ID = 1). Proves validators handle edge values correctly.                                                                                                                                                                                                      | Low        | For field length limits: test at max-1, max, max+1.                                                                                                                                                                                    |
| 25  | **System endpoint validation**  | Verify `GET /api/system/time` returns valid ISO timestamp, correct Content-Type, no auth required. Proves the clock sync mechanism works.                                                                                                                                                                                                                              | Low        | Only 1 endpoint, but critical for the "server time only" architectural constraint.                                                                                                                                                     |

---

## Anti-Features

These are testing approaches to **explicitly avoid**. They waste time, mislead, or are inappropriate for this project's scope and grading context.

| #   | Anti-Feature                          | Why Avoid                                                                                                                                                                                                           | What to Do Instead                                                                                                                                                                                                       |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 26  | **Browser-based E2E tests**           | Out of scope. No `page.goto()`, no DOM locators, no UI assertions. Adds massive complexity for zero grading value. The project has no frontend.                                                                     | Pure API testing via Playwright's `request` fixture. The `page` fixture should never be used.                                                                                                                            |
| 27  | **Unit testing within E2E files**     | Mixing unit and E2E tests muddies the report and confuses the grading panel. Unit tests test functions in isolation; E2E tests test the system through HTTP.                                                        | Unit tests (Jest) go in `tests/unit/`. E2E tests (Playwright) go in `tests/e2e/`. Never import service/controller modules in E2E test files.                                                                             |
| 28  | **Code coverage metrics from E2E**    | E2E coverage is misleading. 80% line coverage from E2E doesn't mean 80% of edge cases are tested. Professors may interpret it as "tests are complete" when they aren't.                                             | Don't configure coverage reporters for Playwright. Coverage belongs in unit tests only.                                                                                                                                  |
| 29  | **Direct database queries in tests**  | Defeats the purpose of E2E testing — the system should be tested through its API boundary. DB queries couple tests to schema implementation details.                                                                | Verify state through API responses. If you need to check "was this resource created?", GET it via the API.                                                                                                               |
| 30  | **Testing third-party services**      | Groq API and ML microservice are external dependencies. Testing them in E2E makes tests flaky (network, API keys) and slow. The grading panel doesn't care if Groq works; they care if the API handles it.          | For admission tests: test the endpoint's behavior when AI succeeds AND when it fails. Mock the external HTTP calls if needed, or skip AI-dependent assertions and test only the request/response shape and status codes. |
| 31  | **Performance/stress testing**        | Separate domain with separate tooling (k6, artillery). Playwright is not a load testing tool. Attempting concurrent user simulation in Playwright produces misleading results.                                      | Out of scope per PROJECT.md. If needed later, use dedicated tools.                                                                                                                                                       |
| 32  | **Mutation/fuzz testing**             | Too advanced for a 2-week capstone timeline. High false-positive rate. Requires sophisticated tooling (Stryker, etc.).                                                                                              | Standard happy-path + error-case + edge-case coverage is sufficient for the grading rubric.                                                                                                                              |
| 33  | **Snapshot testing of API responses** | API response snapshots are brittle — any schema change breaks dozens of tests. Professors won't know if a snapshot change is intentional or a regression.                                                           | Explicit assertions: `expect(body).toMatchObject({ id: expect.any(Number), name: 'expected' })`. Each assertion is self-documenting.                                                                                     |
| 34  | **Testing implementation details**    | Don't test that a specific Prisma query was called, that middleware fired in a specific order, or that a service function throws a specific error class. These tests break on refactors that don't change behavior. | Test through the HTTP contract: request in → response out. Internal implementation is a black box from the E2E perspective.                                                                                              |
| 35  | **Testing Swagger/docs endpoints**    | The docs endpoints serve static OpenAPI specs. Testing them adds no value — they either serve the spec or don't. One smoke test (`GET /api/docs` returns 200) is sufficient.                                        | Don't test the content of Swagger docs. One existence check is enough.                                                                                                                                                   |

---

## Feature Dependencies

Understanding what testing capabilities depend on what infrastructure is critical for phase planning.

```
                    ┌──────────────────────────┐
                    │ playwright.config.ts  (1) │
                    │ webServer, baseURL, env   │
                    └─────────────┬────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ Global Setup / Teardown   │
                    │ Create test camp(s)       │
                    │ Create test users         │
                    │ Obtain JWT tokens         │
                    └─────────────┬────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ Auth Fixtures  (17)        │
                    │ adminRequest, campARequest │
                    │ campBRequest, noAuthReq    │
                    └─────────────┬────────────┘
                                  │
        ┌────────────┬────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼            ▼
    Happy Path   Auth Tests   Role Matrix  Workflow   Cross-Camp
    Tests  (3)      (4)         (14)       Tests (15)  Tests (13)
    Per endpoint  401/403
```

**Key dependency chains:**

1. **Config (1) → Global Setup → Auth Fixtures (17) → Everything else.** You can't write a single protected endpoint test without auth setup. This is the critical path.

2. **Global Setup → Cross-Camp Tests (13).** Need multiple camps created in setup before you can test isolation. If setup only creates one camp, cross-camp tests are impossible.

3. **Auth Fixtures (17) → Multi-Role Matrix (14).** Each role variant is a separate fixture. Build fixtures first, then write role-variant tests.

4. **Happy Path Tests (3) → Multi-Step Workflows (15).** Workflow tests compose happy-path operations. Get simple CRUD working first, then chain them.

5. **Validation Tests (7) → Edge Cases (22, 23, 24).** Validation tests prove bad input is rejected. Edge cases prove good-but-extreme input is accepted. Related but distinct.

**Independent (can be done in parallel after fixtures exist):**

- All per-module happy path tests
- All per-module error tests (401, 403, 404, 409)
- System endpoint test (no auth needed)
- Rate limiting test

---

## MVP Recommendation

For the June 1 capstone defense with ~2 weeks available, prioritize as follows:

### Phase 1: Foundation (Days 1-2)

Build what every test needs:

1. **Playwright config (1)** — working `playwright.config.ts` with `webServer`
2. **Global setup** — creates test camp, test users (admin + regular), obtains tokens
3. **Auth fixtures (17)** — `authenticatedRequest` factory function
4. **2-3 spec files as proof of pattern** — e.g., `auth.spec.ts`, `camps.spec.ts`, `system.spec.ts`

### Phase 2: Core Coverage (Days 3-7)

Cover every endpoint with at least happy-path + 401:

1. **Happy-path tests (3)** — all ~66 endpoints
2. **Auth boundary tests (4)** — 401 scenarios
3. **Not-found tests (6)** — all GET/PUT/DELETE by ID
4. **Test data factories (18)** — reusable data creation helpers

### Phase 3: Quality & Depth (Days 8-11)

Add what makes the suite stand out:

1. **Cross-camp isolation tests (13)** — highest impact for grading
2. **Multi-role tests (14)** — at least admin + camp_member coverage
3. **Validation tests (7)** — key invalid-input scenarios per module
4. **Conflict tests (8)** — duplicate detection
5. **HTML report (19)** — configure and verify it looks good

### Phase 4: Polish & Workflows (Days 12-14)

The "wow" factor for the defense presentation:

1. **Transfer workflow test (15)** — the full lifecycle
2. **Admission workflow test (15)** — AI evaluation through manual review
3. **Self-documenting test names (21)** — audit and rename all tests
4. **Edge cases (22-24)** — pagination, empty results, boundaries
5. **Session timeout test (16)** — if time permits

### Defer

- **AI admission mock (10)** → Too complex. Test admission without AI (mock/conditional) or test only the request/response shape.
- **Rate limiting test (20)** → Nice-to-have; admission module already has limited surface area.
- **Full multi-role matrix (all 56 permissions)** → Test representative roles, not exhaustive. Focus on admin + camp_manager + basic_role.

---

## Sources

- [Playwright API Testing docs](https://playwright.dev/docs/api-testing) — HIGH confidence (official, version 1.58 installed)
- [Playwright Fixtures docs](https://playwright.dev/docs/test-fixtures) — HIGH confidence (official)
- [Playwright Global Setup docs](https://playwright.dev/docs/test-global-setup-teardown) — HIGH confidence (official)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) — HIGH confidence (official)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions) — HIGH confidence (official)
- `.planning/codebase/ARCHITECTURE.md` — HIGH (project-specific, recently refreshed)
- `.planning/codebase/CONCERNS.md` — HIGH (project-specific, documents known bugs to test around)
- `./package.json` — HIGH (Playwright 1.58.2 already installed, Jest 30 for unit tests)
- `./src/index.ts` — HIGH (verified middleware chain, confirmed `NODE_ENV=test` suppresses cron)

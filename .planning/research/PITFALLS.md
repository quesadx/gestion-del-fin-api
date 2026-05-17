# Domain Pitfalls: E2E Testing a Multi-Tenant Express/Prisma API

**Domain:** API E2E testing with JWT auth, session timeout, RBAC, camp-scoping, AI integration
**Researched:** 2026-05-17
**Confidence:** HIGH (verified against actual codebase at `src/middlewares/`, `src/index.ts`, `src/ai/admission-evaluator.ts`, `prisma/schema.prisma`)

---

## Critical Pitfalls

Mistakes that cause rewrites, false passes, or test suite abandonment.

### Pitfall 1: Session Timeout Kills Long-Lived Test Tokens

**What goes wrong:** The `sessionMiddleware` (20-min inactivity timeout) checks `last_activity` against `new Date()`. If a test user is created/seeded and a token is generated at the start of a test run, the session expires after 20 minutes of real time — even if tests are still running. Tests begin failing with 401 `"Session expired"` partway through the suite because real clock time elapsed between token creation and later test execution.

**Why it happens:** `session.middleware.ts:38-39` computes `inactiveForMs = now.getTime() - user.last_activity.getTime()`. The `last_activity` field is set once at login (`auth.service.ts:62-65`) and refreshed on each _authenticated_ request (`session.middleware.ts:44-47`). If tests authenticate once and reuse the token across many `test()` blocks, the token's `last_activity` drifts past 20 minutes of wall-clock time.

**Consequences:** Intermittent 401 errors that don't reproduce when tests are re-run individually. Developers waste hours debugging "flaky" tests. The entire permission-testing phase becomes unreliable.

**Prevention:**

1. **Per-test authentication:** Never reuse a single token across `test()` blocks. Call `POST /api/auth/login` in `beforeEach` or a shared auth helper for every test. Each login call refreshes `last_activity`.
2. **Direct DB manipulation for session expiry tests:** The ONLY reliable way to test session expiry is to `await prisma.users.update({ where: {id}, data: { last_activity: new Date(Date.now() - 21 * 60 * 1000) } })` before the request. Do NOT use `setTimeout()` — CI runners have unpredictable timing.
3. **Disable session middleware in test mode:** Add a `NODE_ENV === 'test'` bypass in `session.middleware.ts` that skips the timeout check but keeps the `session_version` comparison (to still test logout invalidation).

**Detection:** Tests pass individually but fail when the full suite runs. Errors are 401 `"Session expired"` or `"Session terminated"`. The `last_activity` in the users table for the test user is more than 20 minutes behind `now()`.

**Phase to address:** Phase 1 (Auth test infrastructure) — establish the auth helper pattern before any module tests are written.

---

### Pitfall 2: Cross-Camp Data Leakage in Tests Masks Production Bugs

**What goes wrong:** The codebase has three KNOWN cross-camp data leakage bugs (`CONCERNS.md`): `getTransfers`, `getUsers`, and `getExplorations` return records from ALL camps with no `where` clause filtering. E2E tests that use a single camp or that don't explicitly assert cross-camp isolation will write tests that PASS even though the endpoints leak data in production.

**Why it happens:** Test authors naturally write tests for "my camp" data. A test that creates a person in Camp A, then reads it from the Camp A endpoint, then asserts it exists — passes. But the same endpoint returns Camp B's people too, and the test never checks that. The test gives a false sense of security while the security vulnerability remains.

**Consequences:** The defense presentation (June 1, graded requirement) could be undermined by a live demo showing cross-camp data leaking. The tests "pass" but the system is broken.

**Prevention:**

1. **Every list endpoint test MUST seed at least two camps** and assert that the response contains ONLY records belonging to the requesting camp. Pattern:
   ```typescript
   test('returns only requesting camp records', async () => {
     // Seed: Camp A (requesting), Camp B (other)
     await seedPerson({ campId: campA.id, name: 'Alice' });
     await seedPerson({ campId: campB.id, name: 'Bob' });
     // Act: GET /api/people as Camp A user
     const res = await authRequest(campAToken).get('/api/people');
     // Assert: only Alice, not Bob
     expect(res.data.map((p) => p.name)).toContain('Alice');
     expect(res.data.map((p) => p.name)).not.toContain('Bob');
   });
   ```
2. **Audit every list endpoint** against the `CONCERNS.md` known-leakage list before writing "happy path" tests. Write the isolation test FIRST.
3. **Use a shared test utility** `assertCampScoped(response, expectedCampId)` that validates all returned records have `camp_id === expectedCampId`.

**Detection:** Tests pass, but manual inspection of `GET /api/transfers` from a non-admin Camp A user shows transfers belonging to Camp C.

**Phase to address:** Phase 2-N (every module phase) — embed cross-camp isolation as a mandatory test case for every list/read endpoint.

---

### Pitfall 3: JWT Token Requires Exact Database State Match

**What goes wrong:** The JWT payload includes `sessionVersion` (from `users.session_version` at login time). The `sessionMiddleware` compares this against the live database value at `session.middleware.ts:30-32`. If a test seeds a user manually via Prisma with `session_version: 1` but then generates a token that doesn't match, or if a previous test's `logout()` incremented the version, the token is rejected with 401.

Similarly, `permissionMiddleware` does a live DB lookup of the user's role and permissions (`permission.middleware.ts:22-36`). If the test seeds a user with a role that lacks the required permission for a route, the middleware returns 403 before the controller ever runs — making it look like the endpoint itself is broken.

**Why it happens:** Direct Prisma inserts bypass the auth service's `login()` function, which computes `isAdmin`, sets `last_activity`, and signs the token atomically. Test seeders that create users in the DB and then manually call `jwt.sign()` must replicate all these fields exactly.

**Consequences:** Tests fail with 401/403 that look like auth bugs but are actually seed data inconsistencies. Developers waste time debugging middleware when the real issue is a `session_version` mismatch between seed and token.

**Prevention:**

1. **NEVER sign tokens manually in tests.** Always go through `POST /api/auth/login` with the seeded user's credentials:
   ```typescript
   const { token } = await loginAs('testuser', 'password123');
   ```
2. **Seed users with a known password via `bcryptjs`**, not raw hash strings. Use a shared `seedUser()` factory:
   ```typescript
   async function seedUser(overrides = {}) {
     const hash = await bcrypt.hash('testpass', 10);
     return prisma.users.create({
       data: {
         username: `testuser_${Date.now()}`,
         password_hash: hash,
         camp_id: defaultCampId,
         role_id: defaultRoleId,
         session_version: 1,
         is_active: true,
         ...overrides,
       },
     });
   }
   ```
3. **Seed role+permissions fully.** The `permissionMiddleware` loads `roles.role_permissions[].permissions.name`. A user with a role that has zero `role_permissions` records will fail ALL permission checks. Always seed at minimum:
   ```typescript
   await prisma.permissions.create({ data: { name: 'test.all' } });
   await prisma.role_permissions.create({ data: { role_id: roleId, permission_id: permId } });
   ```

**Detection:** `POST /api/auth/login` returns 401 with `"Invalid credentials"` or any protected endpoint returns 403 `"Forbidden"` despite the user seeming to have correct credentials.

**Phase to address:** Phase 1 (Auth test infrastructure) — build the seed + auth helper factory pair.

---

### Pitfall 4: Rate Limiting Breaks Comprehensive Test Suites

**What goes wrong:** The global rate limit (`rateLimit.middleware.ts:3-14`) is 200 requests per 15 minutes per IP. A full test suite across 14 modules, each with 5-10 test cases, can easily exceed 200 requests. Individual tests start failing with 429 `"Too many requests"` partway through the suite, with no indication that the endpoint logic is wrong.

Additionally, `admissionRateLimit` (10 req/min) on `POST /api/admission/camps/:campId` combined with `loginRateLimit` (5 failed attempts/15min) can lock out test users if auth tests fail repeatedly.

**Why it happens:** `express-rate-limit` uses `MemoryStore` by default (`rateLimit.middleware.ts` — no `store` option specified). State persists for the lifetime of the Express app process. E2E tests run against a single process, so all test requests count toward the same limit.

**Consequences:** Mid-suite test failures with 429 status codes. Developers can't tell if the endpoint is broken or they're rate-limited. Flaky CI runs because test order affects which tests hit the limit.

**Prevention:**

1. **Set `NODE_ENV=test` and disable rate limiting.** In `rateLimit.middleware.ts`, check `process.env.NODE_ENV === 'test'` and export a no-op middleware. Or configure Playwright's `baseURL` to hit a test-only port with rate limiting disabled.
2. **Add `skip: () => process.env.NODE_ENV === 'test'`** to each rate limiter instance. Or, more robustly, export a factory:
   ```typescript
   export const globalRateLimit = process.env.NODE_ENV === 'test'
     ? (_req, _res, next) => next()
     : rateLimit({ ... });
   ```
3. **At minimum, reset the rate limiter store between test files.** `express-rate-limit` supports `store.resetKey(key)`. At the start of each test file, reset the rate limiter store via an exposed `resetRateLimits()` utility.
4. **For the login rate limit specifically:** Never run auth tests that generate >5 failed login attempts per 15 minutes without explicit rate-limit reset. Each test file should either reset the limiter or have its own unique username.

**Detection:** Tests return 429 instead of expected status codes. The error body is `{"error": {"message": "Too many requests..."}}`. Test order matters — running `auth.spec.ts` first vs. last changes which tests fail.

**Phase to address:** Phase 1 (infrastructure setup) — configure rate-limiting bypass for test environment before any module tests.

---

### Pitfall 5: AI/ML Dependencies Cause Non-Deterministic Test Failures

**What goes wrong:** The admission workflow (`POST /api/admission/camps/:campId`) calls TWO external services:

1. **Groq LLM** (`admission-evaluator.ts:63-67`): Parses camp `ai_context_prompt` into structured `CampWeights` via `llama-3.3-70b-versatile`. This requires a valid `GROQ_API_KEY`.
2. **ML microservice** (`admission-evaluator.ts:88-98`): `POST http://localhost:8000/evaluate` with a 5-second timeout. Requires the Python FastAPI service to be running.

If either service is unavailable, the test fails. Even when available, the Groq LLM response is **non-deterministic** — the same camp context may produce slightly different weights on different calls, making `expect(result).toEqual(expectedResult)` assertions impossible.

**Why it happens:** The admission controller (`admission.controller.ts`) calls `evaluateAdmission()` which calls `parseCampWeights()` (Groq) and `evaluateWithDecisionTree()` (ML service) synchronously. There's no test-mode bypass or mock injection point.

**Consequences:** Tests fail when:

- `GROQ_API_KEY` is not set in CI
- Groq API rate limits or credits are exhausted
- Docker Compose ML service isn't running
- ML model produces different output after retraining

Tests pass locally but fail in CI. The June 1 defense demo could fail if any external service is down.

**Prevention:**

1. **Mock the Groq SDK client at the `ai` module level.** The `ai` instance in `src/lib/ai.ts` (`new Groq({ apiKey: ... })`) should be mockable from tests. Either:
   - Use dependency injection: `evaluateAdmission(data, ctx, professions, aiClient?)` with a default of the real client.
   - Use Playwright's `page.route()` to intercept the actual `POST https://api.groq.com/...` call and return a canned JSON response.
   - **Recommended:** Set `process.env.GROQ_API_KEY = 'test-mock-key'` in tests and mock at the HTTP layer via Playwright route interception.

2. **Mock the ML service at the HTTP level.** The `fetch()` call to `${ML_SERVICE_URL}/evaluate` is a plain `fetch` with no SDK. Mock using Playwright route interception within the test:

   ```typescript
   await page.route('http://localhost:8000/evaluate', async (route) => {
     await route.fulfill({
       status: 200,
       json: {
         decision: 'ACCEPTED',
         confidence: 0.92,
         reasoning_path: ['mock_reason_step'],
         profession_category: 'Medical',
       },
     });
   });
   ```

   Note: This requires `page` context in the test. If using `request` context (`Playwright API testing`), use `context.route()` from a `BrowserContext`.

3. **For admission-specific tests, seed a camp with a deterministic `ai_context_prompt`** that explicitly sets weights (e.g., `"Weight medical: 0.9"`). The Groq parser should extract these reliably enough for integration tests — but this is still fragile. Prefer mocking.

**Detection:** Admission tests fail with 502 `"Decision tree service unavailable"` or Groq-related errors. Tests pass inconsistently.

**Phase to address:** Phase that covers Admission module — build AI/ML mock infrastructure before writing admission E2E tests.

---

### Pitfall 6: Background Cron Jobs Mutate Test Data

**What goes wrong:** The daily rations cron job has the default expression `* * * * *` (every minute) in `scheduler.ts:7`. If `NODE_ENV` is not set to `"test"`, the job scheduler starts at `src/index.ts:93` and begins:

1. Distributing daily rations (modifying `inventory.quantity`, creating `inventory_log` records)
2. Running daily production (modifying `inventory.quantity`)
3. Checking resource alerts (creating log entries)

Tests that assert on inventory quantities will intermittently fail because the cron job changed the quantity between the seed and the assertion.

**Why it happens:** The job scheduler check at `src/index.ts:92` uses `NODE_ENV !== 'test'`. If the test runner doesn't set this env var, or if it's overridden by a `.env.test` file, cron jobs start and mutate state during test execution.

**Consequences:** Non-deterministic test failures in any inventory-related tests. A test that seeds `quantity: 100`, then expects `quantity: 100` after a GET, may find `quantity: 99.5` (due to ration distribution) or `quantity: 102.3` (due to production). Debugging this is maddening because the timing is probabilistic.

**Prevention:**

1. **ALWAYS set `NODE_ENV=test`** in the Playwright config and ensure no `.env.test` overrides it back.
2. **Verify no cron jobs are running BEFORE each test suite.** Add a `beforeAll` that queries `SELECT COUNT(*) FROM inventory_log WHERE logged_at > NOW() - INTERVAL '1 minute'` to confirm no recent cron activity.
3. **Make cron expressions configurable for tests.** If tests need to exercise cron logic, use a separate test where cron is explicitly triggered via a test-only endpoint (e.g., `POST /api/system/trigger-daily-rations`), not by real clock time.

**Detection:** Inventory quantity assertions fail with off-by-small-amount mismatches (like 0.5 or 1.0). Timing-dependent. `inventory_log` table grows with unexpected entries during test runs.

**Phase to address:** Phase 1 (infrastructure setup) — ensure `NODE_ENV=test` is enforced and verified.

---

## Moderate Pitfalls

### Pitfall 7: `campMiddleware` URL Parsing Creates Hidden Test Gaps

**What goes wrong:** `camp.middleware.ts:26-46` extracts camp IDs from URLs via a regex that hardcodes 12 URL patterns. If a test hits a route like `GET /api/expeditions/:id` before the expeditions module is properly registered in the regex, the camp middleware silently skips camp-scoping validation. The test "passes" because the middleware chain doesn't reject the request — but in production, bypassing camp-scoping is a security vulnerability.

**Why it happens:** The regex at line 28-30 must be manually updated whenever a new route pattern is added. Tests that don't explicitly verify the `campMiddleware` rejects cross-camp access won't catch a missing pattern.

**Prevention:**

1. **Test the camp middleware in isolation** with a variety of URL patterns. For each `extractCampIdFromUrl` pattern, verify it correctly returns the camp ID when a user from a DIFFERENT camp tries to access it.
2. **Every E2E test that accesses a camp-scoped resource should use a URL that includes the camp ID** (e.g., `/api/camps/5/people`) and verify the response is scoped. If a route works without a camp ID in the URL, the middleware regex is incomplete.

**Detection:** Cross-camp data leakage tests pass even though the endpoint leaks data — because the middleware's regex didn't match the tested URL.

**Phase to address:** Phase 1 (infrastructure) — add middleware isolation tests.

---

### Pitfall 8: Global Error Handler Hides Production-Mode 500 Details

**What goes wrong:** `error.middleware.ts:57-58` replaces error messages with `"Internal Server Error"` when `NODE_ENV === 'production'`. E2E tests running against a production-like environment will get 500 responses with no useful error details, making debugging test failures nearly impossible.

**Why it happens:** The intent is security (don't leak stack traces). But if the E2E test environment is configured with `NODE_ENV=production` to match a staging server, error responses become opaque.

**Prevention:**

1. **Run E2E tests with `NODE_ENV=test` or `NODE_ENV=development`.** NEVER run test suites against a `NODE_ENV=production` instance.
2. **Assert on `statusCode` not `message`** in error tests. The status code (401, 403, 404, 409) is always reliable; the message may change in different environments.

**Detection:** Tests expecting `"Invalid credentials"` get `"Internal Server Error"`. Error assertions fail with message mismatches.

**Phase to address:** Phase 1 (infrastructure) — document environment requirements for test runs.

---

### Pitfall 9: `permissionMiddleware` Returns 401 AND 403 — Tests Must Distinguish

**What goes wrong:** `permission.middleware.ts` returns **401** when the user doesn't exist or is inactive (lines 18-19, 38-39) but **403** when the user exists but lacks a specific permission (line 50-51). Tests that only check `"any error response"` will miss a critical distinction: a 401 means "your token is wrong/dead" while 403 means "you're authenticated but not authorized."

**Why it happens:** Test authors may write `expect(res.status).toBeGreaterThanOrEqual(400)` or `expect(res.status).not.toBe(200)` for permission-check tests. This passes for both 401 and 403, masking the permission middleware's actual behavior.

**Prevention:**

1. **Assert exact status codes** in all permission tests. `expect(res.status).toBe(403)` for missing permissions; `expect(res.status).toBe(401)` for invalid/missing auth.
2. **Test the full error taxonomy**: For each protected endpoint, write separate tests for:
   - No token → 401
   - Expired token → 401
   - Logged-out session → 401
   - Valid token but wrong role → 403
   - Valid token and correct role → 200/201
3. **Document the 401-vs-403 distinction** in the test convention docs so all test authors follow the same pattern.

**Detection:** A test for "user without permission can't access endpoint" passes with `res.status >= 400`, but the actual response is 401 (auth broken) instead of 403 (permission working correctly).

**Phase to address:** Phase 1 (auth infrastructure) — establish exact status code assertion conventions.

---

### Pitfall 10: Test Database Cleanup Leaves Orphaned Records

**What goes wrong:** Many tables use `onDelete: NoAction` (not `Cascade`). Deletion order matters. A test that tries to clean up by deleting a `camps` record fails because `users`, `persons`, `admission_requests`, etc. still reference it. The cleanup fails silently (or with a 400 from `handleForeignKeyError`), leaving test data in the database.

**Why it happens:** The Prisma schema's foreign key relations: `camps.id` is referenced by 7+ tables with `onDelete: NoAction`. Test teardown that deletes camps without first deleting children leaves orphaned data that contaminates subsequent test runs.

**Consequences:** Unique constraint violations in later tests (name conflicts on `camps.name`, `resource_type.name`, etc.). Tests that count records return unexpectedly high counts due to leftover data. The test database grows unboundedly.

**Prevention:**

1. **Use a dedicated test database that is truncated/dropped between suites.** Either:
   - Run migrations on a `gestion_del_fin_test` database and drop/recreate between test runs.
   - Use Prisma transactions that roll back: `await prisma.$transaction(async (tx) => { /* seed + test */ throw new RollbackError(); })` (the thrown error prevents commit).
   - **Recommended:** Use `prisma.$executeRawUnsafe('TRUNCATE TABLE ... RESTART IDENTITY CASCADE')` in `afterAll` for all tables in reverse dependency order.
2. **Seed with unique names always.** Append `Date.now()` or `crypto.randomUUID()` to all unique fields:
   ```typescript
   const camp = await prisma.camps.create({
     data: { name: `test-camp-${uuid()}`, location: 'Test', status: 'ACTIVE' },
   });
   ```
3. **Never assume a clean database at test start.** Always design tests to create their own data and tolerate existing data (use unique identifiers, count deltas rather than absolute counts).

**Detection:** Intermittent 409 errors on `camps.name_unique`, `resource_type.name_unique`, etc. Test A passes alone, fails when run after Test B.

**Phase to address:** Phase 1 (infrastructure) — define database isolation strategy before ANY E2E tests are written.

---

### Pitfall 11: `isAdmin` JWT Flag Causes Camp-Scoping Bypass in Tests

**What goes wrong:** If a test user is assigned the `admin.bypass_camp_scoping` permission, the JWT `isAdmin` flag is set to `true` (`auth.service.ts:50-52`). The `campMiddleware` at line 60-62 skips ALL camp-scoping validation for admin users: `if (isAdmin) return next();`. Tests that use admin tokens will never catch cross-camp data leakage because the middleware lets them see everything.

**Why it happens:** Test authors may default to admin users for convenience (one user can do everything). But admin users bypass the security boundary that tests are supposed to verify.

**Consequences:** Cross-camp isolation tests pass but only because the test user is an admin. The actual non-admin user path remains untested. Production security bugs go undetected.

**Prevention:**

1. **Separate test auth tokens by role:**
   - `adminToken` — for tests of admin-only endpoints (`/api/users`, `/api/roles`)
   - `memberToken` — for ALL camp-scoping tests (regular camp member with limited permissions)
   - `noPermissionToken` — for 403 error tests (user with role that has zero permissions for the tested endpoint)
2. **Cross-camp isolation tests MUST use a non-admin token.** Document this as a hard requirement.
3. **Add an assertion to the cross-camp test helper** that rejects admin tokens:
   ```typescript
   function assertCampScoped(response, expectedCampId, userIsAdmin) {
     if (userIsAdmin) throw new Error('Cross-camp tests must use non-admin tokens');
     // ... assertions
   }
   ```

**Detection:** Cross-camp isolation tests pass trivially because admin sees everything. Only detected by code review or if a professor manually tests with a non-admin account.

**Phase to address:** Phase 1 (auth infrastructure) — define test role taxonomy: admin / member / unprivileged.

---

### Pitfall 12: `validate` Middleware Double-Parse Causes False Negatives

**What goes wrong:** The `validate` middleware (`validate.middleware.ts`) performs TWO parsing attempts: first `safeParseAsync(req.body)` (body-only), then if that fails, `safeParseAsync({ body, params, query })` (structured object). If a test sends a request body that passes the first parse but the middleware's internal logic assigns parsed data to wrong properties, test assertions on the response body will pass but the controller received wrong/malformed data.

**Why it happens:** The dual-parse pattern at lines 7-17 is a fallback mechanism. If a Zod schema is designed to validate `{ body: ..., params: ... }` but the first `safeParseAsync(req.body)` succeeds on the raw body object (coincidentally matching a different schema), the middleware takes the first path and the structured parse never runs.

**Prevention:**

1. **Always test validation with both valid and invalid data.** Don't just assert 200/400 — for valid requests, include a `toEqual` check on the response body to verify the controller processed what the test sent.
2. **Test boundary values** that exercise the Zod schema exhaustively: empty strings, very long strings, negative numbers where positive is expected, missing required fields.
3. **For modules with complex nested validation** (admission, transfers), write a dedicated validation test that sends the raw JSON and verifies it was parsed correctly (not just that it wasn't rejected).

**Detection:** A test sends `{ name: "Test" }`, gets a 201, but the created resource has a different/wrong name. The validation middleware accepted the body without parsing it through the structured schema.

**Phase to address:** Each module phase — include validation border cases as standard test coverage.

---

## Minor Pitfalls

### Pitfall 13: `auditLog` Fire-and-Forget Causes Race Conditions

**What goes wrong:** `auditLog()` (`auditLog.ts:14-30`) uses `.then(() => {})` — a fire-and-forget promise. Tests that assert on `audit_log` table content immediately after an action may not find the log entry because the Prisma `create` hasn't completed yet.

**Prevention:** Add a small `await sleep(100)` before audit_log assertions, or query with retry logic. Better: in tests, `await prisma.audit_log.findFirst({ where: { action: 'LOGIN' }, orderBy: { created_at: 'desc' } })` with a polling loop.

**Phase to address:** Phase covering audit trail testing.

---

### Pitfall 14: `bcryptjs.hash()` Blocks Event Loop in Seeders

**What goes wrong:** `bcrypt.hash('password', 10)` is CPU-intensive. Seed functions that hash passwords for many users in a loop will block the event loop, slowing test startup significantly.

**Prevention:** Reduce salt rounds to 4 in test mode: `bcrypt.hash('testpass', process.env.NODE_ENV === 'test' ? 4 : 10)`. Or hash once and reuse the same hash for all test users (they all share the same test password anyway).

**Phase to address:** Phase 1 (seed infrastructure).

---

### Pitfall 15: `Winston` Daily Rotate Creates Log Files During Test Runs

**What goes wrong:** Winston's daily rotate file transport creates `logs/app-YYYY-MM-DD.log` and `logs/error-YYYY-MM-DD.log` files during test runs. These accumulate and may trigger CI artifact size limits or fill up developer disks over time.

**Prevention:** In test mode, disable file transports:

```typescript
// In logger/logger.ts or test setup
if (process.env.NODE_ENV === 'test') {
  logger.clear(); // Remove file transports
  logger.add(new winston.transports.Console({ silent: true }));
}
```

Or set `LOG_LEVEL=silent` for test runs.

**Phase to address:** Phase 1 (infrastructure).

---

## Phase-Specific Warnings

| Phase Topic              | Likely Pitfall                                                                               | Mitigation                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Auth test infrastructure | Pitfall 1 (session timeout), Pitfall 3 (token/DB mismatch), Pitfall 11 (admin bypass)        | Build auth helper that calls `POST /login` per test, never signs tokens manually                    |
| Database seeding         | Pitfall 10 (orphaned records), Pitfall 14 (bcrypt performance)                               | Use unique names + truncate between suites, reduce bcrypt rounds in test                            |
| Camp-scoping tests       | Pitfall 2 (known leakage bugs), Pitfall 7 (middleware regex gaps), Pitfall 11 (admin bypass) | Every list endpoint tests with 2+ camps + non-admin token; assert exact camp_id filtering           |
| RBAC/permission tests    | Pitfall 9 (401 vs 403 confusion), Pitfall 11 (admin bypass)                                  | Assert exact status codes (401/403/200); never use admin token for permission tests                 |
| Admission + AI tests     | Pitfall 5 (AI/ML non-determinism/availability)                                               | Mock Groq SDK and ML service; never depend on real AI for deterministic test pass/fail              |
| Transfer workflow tests  | Pitfall 2 (known leakage), Pitfall 10 (foreign key cleanup order)                            | Multi-step workflow needs DB snapshot isolation; test each transfer status transition independently |
| Rate limit tests         | Pitfall 4 (global rate limit exhaustion mid-suite)                                           | Reset rate limiter store between test files; isolate rate limit tests to their own file             |
| System/job tests         | Pitfall 6 (cron jobs mutate test data)                                                       | Always `NODE_ENV=test`; verify cron bypass when testing inventory endpoints                         |
| Full suite integration   | Pitfall 4 (rate limits), Pitfall 1 (token expiry over long runs)                             | CI should run tests in batches: auth first, then modules, with token-per-test pattern               |

---

## Sources

- **Codebase verification (HIGH):** All middleware files (`auth.middleware.ts`, `session.middleware.ts`, `camp.middleware.ts`, `permission.middleware.ts`, `rateLimit.middleware.ts`, `error.middleware.ts`, `validate.middleware.ts`) read and analyzed directly.
- **Codebase verification (HIGH):** `src/index.ts` middleware chain confirmed.
- **Codebase verification (HIGH):** `src/ai/admission-evaluator.ts` AI/ML integration flow confirmed.
- **Codebase verification (HIGH):** `prisma/schema.prisma` foreign key constraints (`onDelete: NoAction`) confirmed on 7+ relations.
- **Codebase verification (HIGH):** `src/shared/utils/jwt.ts` JWT payload structure confirmed.
- **Codebase verification (HIGH):** `.planning/codebase/CONCERNS.md` known bugs documented.
- **Codebase verification (HIGH):** `src/jobs/scheduler.ts` cron defaults confirmed.
- **Playwright API testing docs (MEDIUM):** [Playwright API testing guide](https://playwright.dev/docs/api-testing) — confirms `request` context for API-only E2E tests.
- **express-rate-limit docs (MEDIUM):** [express-rate-limit GitHub](https://github.com/express-rate-limit/express-rate-limit) — MemoryStore behavior, `skip` option, `resetKey` API.

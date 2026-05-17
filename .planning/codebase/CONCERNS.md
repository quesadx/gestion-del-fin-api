# Codebase Concerns

**Analysis Date:** 2026-05-17

## Security Concerns

### Admission single-entity endpoints lack camp scoping (cross-camp data leakage)

**What happens:** `GET /api/admission/:id` (`src/modules/admission/admission.routes.ts:38-43`) and `PATCH /api/admission/:id/review` (`src/modules/admission/admission.routes.ts:45-50`) do not include a campId in the URL path. The `campMiddleware` (`src/middlewares/camp.middleware.ts:84-87`) calls `extractCampIdFromUrl()` — the regex only matches patterns like `admission/camps/<id>`, NOT `admission/<id>`. Since `req.params.campId` is also undefined, camp scoping is silently skipped.

**Files:**
- `src/modules/admission/admission.routes.ts:38-43` (`GET /:id`) and `:45-50` (`PATCH /:id/review`)
- `src/middlewares/camp.middleware.ts:84-87` (bypass when extractCampIdFromUrl returns null)
- `src/modules/admission/admission.service.ts:88-92` — `getAdmissionsById` has NO `campId` filter
- `src/modules/admission/admission.service.ts:94-124` — `reviewAdmission` does not verify admission belongs to reviewer's camp

**Impact:** Any authenticated user with `ADMISSION_READ` or `ADMISSION_REVIEW` permission can read or review admission requests from ANY camp by numeric ID. With `ADMISSION_REVIEW`, they can also have a person created in ANY camp (via `createPerson(admission.camp_id, ...)` in `reviewAdmission` at line 110-121).

**Fix approach:** Add camp ownership checks: in `getAdmissionsById()` require `campId` param with `where: { id, camp_id: campId }`; in `reviewAdmission()` verify `admission.camp_id` matches the reviewer's camp before creating a person.

### Rate limiting applied AFTER permission check on admission endpoint

**What happens:** In `src/modules/admission/admission.routes.ts:13-24`, `permissionMiddleware` (hits DB to verify user permissions) is placed BEFORE `admissionRateLimit`. Every request — even those that would exceed the rate limit — triggers a `prisma.users.findUnique` query.

**Files:**
- `src/modules/admission/admission.routes.ts:14-24` (order: perm check → validate → rate limit → handler)

**Impact:** An attacker can trigger a DB query per request without hitting the rate limit guard first. With 60 requests per minute, that's 60 unnecessary DB queries before rate limiting kicks in.

**Fix approach:** Move `admissionRateLimit` before `permissionMiddleware` in the middleware chain.

### `isAdmin` JWT flag can become stale

**What happens:** The `isAdmin` flag is embedded in the JWT at login (`src/modules/auth/auth.service.ts:50-52`) for the full token lifetime (default 24h). If a user's `ADMIN_BYPASS_CAMP_SCOPING` permission is revoked, their JWT retains `isAdmin: true`. The `campMiddleware` (`src/middlewares/camp.middleware.ts:58-61`) bypasses ALL camp-scoping for `isAdmin` users.

**Files:**
- `src/modules/auth/auth.service.ts:45-52` (isAdmin baked into JWT)
- `src/middlewares/camp.middleware.ts:58-61` (admin bypass)

**Impact:** A user whose admin permission is revoked retains unrestricted cross-camp data access until token expiry (up to 24h) or re-login. The code acknowledges this (`src/modules/auth/auth.service.ts:45-48`), noting that `permissionMiddleware` re-checks from DB, so specific actions can't be abused — but the camp-scoping bypass is still active.

**Fix approach:** Re-check `ADMIN_BYPASS_CAMP_SCOPING` from DB in `campMiddleware` instead of trusting the JWT flag. Or introduce a short-lived admin token.

### Default JWT secret check runs only in production

**What happens:** `src/index.ts:83-90` validates the JWT secret only when `NODE_ENV === 'production'`. The default secret `dev-only-insecure-jwt-secret-change-me-12345` is silently accepted in development/staging.

**Impact:** Developers may deploy staging environments with the default secret if not running with `NODE_ENV=production`. Token-based auth would be trivially forgeable.

**Fix approach:** Run the check in all non-test environments, or hard-reject the default secret regardless of environment.

### Audit log fires-and-forgets with silent failures

**What happens:** `src/shared/utils/auditLog.ts:14-29` uses `.then(() => {}).catch(...)`. If the audit log insert fails, only a Winston log entry is written — no backpressure, retry, or compensation.

**Impact:** Audit trail can have silent gaps. Compliance-sensitive operations (LOGIN, CREATE_CAMP, CREATE_USER) may be unrecorded without detection. Missing action types: people CRUD, profession CRUD, resource CRUD, admission operations, expedition CRUD, inventory adjustments.

**Fix approach:** Consider including audit writes inside transactions where feasible, or implement a retry queue with monitoring.

### Rate limiting entirely bypassed in test mode

**What happens:** All rate limiters (`src/middlewares/rateLimit.middleware.ts:8,20-21,37`) use `skip: () => isTest` where `isTest = process.env.NODE_ENV === 'test'`. Rate limiting is completely disabled in E2E tests.

**Impact:** E2E tests never exercise rate-limit behavior. No regression detection if rate-limit config changes.

**Fix approach:** Use a configurable multiplier for test mode rather than complete skip, or add separate rate-limit integration tests.

---

## Data Integrity Risks

### Admission review creates person without camp verification

**What happens:** `src/modules/admission/admission.service.ts:94-124` (`reviewAdmission`) calls `createPerson(admission.camp_id, ...)` without verifying the admission belongs to the reviewer's camp. Combined with missing camp scoping on `PATCH /:id/review`, any user with `ADMISSION_REVIEW` can create persons in arbitrary camps.

**Files:**
- `src/modules/admission/admission.service.ts:110-121` (person created using `admission.camp_id` — not reviewer's camp)

**Impact:** A Camp A user can review Camp B's admission and have a person created in Camp B. Cross-camp data injection.

**Fix approach:** In `reviewAdmission`, verify `admission.camp_id` either matches a `campId` parameter or the reviewer's `campId` from JWT.

### Jobs process camps and resources sequentially — no error isolation

**What happens:** Daily rations (`src/jobs/daily-rations.job.ts:169-174`) and daily production (`src/jobs/daily-production.job.ts:120-128`) iterate camps with `for...of`/`await`. Within each camp, rations iterate resources. If one camp's processing throws, all subsequent camps are skipped (in rations — production has no error isolation either).

**Files:**
- `src/jobs/daily-rations.job.ts:169-174` (no try/catch per camp)
- `src/jobs/daily-production.job.ts:120-128` (no try/catch per camp)

**Impact:** A single camp failure blocks ration/production distribution for ALL remaining camps.

**Fix approach:** Use `Promise.allSettled` or per-camp try/catch with error logging.

### Daily rations processes each resource in its own transaction

**What happens:** `src/jobs/daily-rations.job.ts:120-127` calls `consumeInventoryWithLog` per resource — each call uses a separate transaction (`src/modules/inventory/inventory.service.ts:131`). If resource A's consumption succeeds but resource B's fails, the camp has partial distribution.

**Impact:** Inconsistent camp state — some rations distributed, others not. Acceptable for the current "best effort" design but not atomic.

**Fix approach:** Consider wrapping the entire camp's distribution in a single `$transaction` if atomicity is required.

### `updateExploration` (metadata-only) has no transaction

**What happens:** `src/modules/explorations/explorations.service.ts:448-455` updates expedition metadata with a single `prisma.expeditions.update` call. This is atomic at the DB level. Noted for consistency only — low risk.

### Login has race window: token issued before last_activity updated

**What happens:** `src/modules/auth/auth.service.ts:54-65` signs the JWT in memory first, then updates `last_activity` in a separate DB query. If the update fails, a valid token exists without a corresponding `last_activity` record.

**Impact:** A valid token could be issued without being tracked. The client gets an error despite having a valid token.

**Fix approach:** Update `last_activity` first, then sign the token using the updated session data.

---

## Performance Bottlenecks

### Unpaginated metrics endpoints

**What happens:**
- `GET /api/metrics/expeditions` calls `prisma.expeditions.findMany()` with NO `skip`/`take` (`src/modules/metrics/metrics.service.ts:163`)
- `GET /api/metrics/resources` loads ALL inventory rows (`src/modules/metrics/metrics.service.ts:62`)
- `GET /api/metrics/dashboard` loads ALL inventory rows twice (`src/modules/metrics/metrics.service.ts:29-38`)

**Impact:** With large datasets, these endpoints return increasingly large payloads and consume growing memory.

**Fix approach:** Add pagination or `take` limits to all metrics queries.

### Inventory audit loads all records then paginates in memory

**What happens:** `src/modules/inventory/inventory.service.ts:75-118` (`validateInventoryConsistency`) loads ALL inventory records and log aggregates for a camp. Then `getInventoryAudit` (`:322-369`) paginates the in-memory result.

**Impact:** Performance degrades linearly with resource type count.

**Fix approach:** Push pagination into the DB queries rather than loading everything into memory.

### Daily rations job: O(n*m) sequential transactions

**What happens:** For n camps × m ration resources, `consumeInventoryWithLog` is called n*m times, each opening a separate transaction. With 10 camps and 5 resources, 50 sequential transactions.

**Files:**
- `src/jobs/daily-rations.job.ts:157-159`

**Impact:** Job execution time scales linearly. Each transaction involves multiple round-trips (read, update, insert log).

### AI admission evaluation blocks the request synchronously

**What happens:** `src/modules/admission/admission.service.ts:51-55` calls `evaluateAdmission` which makes HTTP calls to Groq API (LLM) and the ML decision tree service (5s timeout). Both are synchronous from the request handler's perspective.

**Files:**
- `src/ai/admission-evaluator.ts:63-67` (Groq LLM — no timeout set)
- `src/ai/admission-evaluator.ts:88-98` (ML service — 5s timeout)
- `src/ai/admission-evaluator.ts:28-77` (parseCampWeights — also calls Groq)

**Impact:** Admission requests can block the Express event loop for several seconds. No fallback path if AI services are slow/down (returns 502 from `admission-evaluator.ts:101`).

**Fix approach:** Consider queue-based processing or add a circuit breaker. Also add `AbortSignal.timeout` to the Groq call.

---

## Technical Debt

### Stub file: `camp-rules.ts`

**What happens:** `src/shared/constants/camp-rules.ts` contains only `// TODO: implement`. Planned camp-specific business rules never implemented.

**Files:**
- `src/shared/constants/camp-rules.ts:1`

**Impact:** Dead code. Either implement or remove.

### `asNumber()` helper duplicated across 4+ service files

**What happens:** Identical `function asNumber(value: unknown): number { return Number(value); }` defined in:
- `src/modules/transfers/transfers.service.ts:19-21`
- `src/modules/explorations/explorations.service.ts:21-23`
- `src/modules/inventory/inventory.service.ts:8-10`
- `src/modules/metrics/metrics.service.ts:5-7`

**Impact:** Violates DRY. Changes must be propagated manually.

**Fix approach:** Extract to `src/shared/utils/number.ts`.

### `(tx as unknown as typeof prisma)` cast pattern repeated ~20+ times

**What happens:** Transaction functions use `const client = tx as unknown as typeof prisma` repeatedly across `transfers.service.ts`, `explorations.service.ts`, `inventory.service.ts`, `people.service.ts`.

**Impact:** Verbose boilerplate. A known Prisma limitation when passing transaction clients.

**Fix approach:** Create a typed transaction helper that wraps the cast.

### Controller re-parses request body after middleware validation

**What happens:** `src/modules/admission/admission.controller.ts:33` calls `reviewAdmissionSchema.parse(req.body)` even though the `validate()` middleware already validated it against the same schema (`src/modules/admission/admission.routes.ts:47-48`).

**Impact:** Redundant Zod parse operation on every admission review request.

### `handleUniqueConstraintError` and `handleForeignKeyError` re-throw non-matching errors

**What happens:** `src/shared/utils/handlePrismaError.ts:3-9,11-16` only handles P2002 (unique constraint) and P2003 (foreign key). All other Prisma errors (P2025 not found, etc.) are re-thrown to the caller, where they may or may not be caught. In several services (e.g., `explorations.service.ts:421-423`, `camps.service.ts:43-45`), this catch block wraps the entire function body, so non-P2002 errors propagate up unmodified.

**Impact:** Prisma P2025 errors slip through service-level handling and land in the global error handler (`src/middlewares/error.middleware.ts:46-49`), which maps them to 404. This may mask the actual error context.

### `role.middleware.ts` is dead code

**What happens:** `src/middlewares/role.middleware.ts` is exported but never imported by any route. The project uses `permission.middleware.ts` exclusively for access control.

**Files:**
- `src/middlewares/role.middleware.ts` (full file, exported but unused)

**Impact:** Dead code. Also has incorrect HTTP semantics — returns 401 for insufficient role instead of 403.

**Fix approach:** Remove `role.middleware.ts`.

### Achievements tables exist in schema with no API

**What happens:** `prisma/schema.prisma` defines `achievements` and `user_achievements` tables (`:11-18`, `:372-382`) but there are no routes, services, or controllers for achievements.

**Impact:** Schema dead weight. Adds migration complexity. Might be planned for future.

### Swagger spec may not resolve in production builds

**What happens:** `src/docs/swagger.ts:6-7` resolves the OpenAPI YAML file relative to `__dirname` at runtime. In development (`tsx watch`), this resolves to `src/docs/openapi.yaml`. In production (compiled to `/dist`), it resolves to `/dist/docs/openapi.yaml` — which won't exist unless the YAML file is explicitly copied.

**Files:**
- `src/docs/swagger.ts:6-8`
- `package.json` build script (need to check if YAML is copied)

**Impact:** Swagger UI produces 404 in production.

---

## Testing Gaps

### Zero unit tests

**What happens:**
- `tests/unit/ai/placeholder` — empty file
- `tests/unit/jobs/placeholder` — empty file
- No `tests/unit/**/*.spec.ts` files exist
- `jest.config.ts` matches `tests/unit/**/*.spec.ts` but none match

**Impact:** Import business logic (status transitions in expeditions, date validation, resource aggregation, permission logic) is only verifiable through slow E2E tests. Service-layer regressions go undetected.

**Fix approach:** Add unit tests for core services: expedition status transitions, inventory math, Prisma error handling, camp member validation.

### No AI mocking strategy

**What happens:** `src/ai/admission-evaluator.ts:143-150` returns hardcoded `ACCEPTED` in test mode. There's no way to test: AI rejection, service failure (502), parsing errors, or non-default decision paths.

**Files:**
- `tests/e2e/admission.spec.ts` — only tests happy path, no AI-failure scenarios
- `src/ai/admission-evaluator.ts:143-150` — test mode bypass

**Impact:** The admission flow's error handling is untested. A regression in AI service integration would be caught only in production.

### E2E tests cover only happy path + 401

**What happens:** All E2E test files (`tests/e2e/*.spec.ts`) test CRUD success and unauthenticated (401) rejection. Missing test scenarios:
- **403 permission denial** — no test verifies that a user without a specific permission gets 403
- **Session timeout** — no test for 20-min inactivity timeout
- **Concurrent operations** — no race condition tests for transfers, inventory adjustments
- **Pagination** — no test that `page` and `pageSize` parameters work
- **Data integrity** — no test that invalid status transitions return 400
- **Admin bypass** — no test that admin can cross camps and non-admin cannot

**Impact:** Permission enforcement (the project's primary access control mechanism) has no test coverage.

### No admission-to-person creation verification in E2E

**What happens:** `tests/e2e/admission.spec.ts:74-82` tests that `PATCH /:id/review` with `ACCEPTED` returns success, but does NOT verify that a person was actually created (e.g., by subsequently calling `GET /api/camps/:campId/people`).

**Impact:** The admission review's most important side effect is untested.

### No load/stress testing

**What happens:** The grading criteria (`docs/proyecto-programado.md`) requires stress testing ("Sistema maneja volumen de datos realista sin degradación"), but no load test scripts or tools exist.

**Impact:** No baseline for concurrent capacity. Performance regression goes undetected.

---

## Operational Risks

### AI services have no graceful degradation

**What happens:**
- Groq API call (`src/ai/admission-evaluator.ts:63-67`) has NO timeout — could hang indefinitely
- ML service call (`src/ai/admission-evaluator.ts:88-98`) has 5s timeout, but failure returns 502 with no fallback
- If either service is down, ALL admission requests fail

**Files:**
- `src/ai/admission-evaluator.ts:63-67` (Groq — no timeout)
- `src/ai/admission-evaluator.ts:88-101` (ML service — 5s timeout, throws 502)
- `src/lib/ai.ts:3` (Groq client instantiated at import time)

**Impact:** A single admission request can hang the server if Groq is slow. If ML service is down, no admission requests can be processed at all.

**Fix approach:** Add `timeout` to Groq constructor options. Add a fallback deterministic decision path when AI services are unavailable.

### Groq API key not validated at startup

**What happens:** `src/lib/ai.ts:3` creates the Groq client at module import time. If `GROQ_API_KEY` is missing or invalid, the error surfaces only at runtime when the first admission is evaluated.

**Impact:** A misconfigured deployment starts successfully but silently fails on the first admission request.

**Fix approach:** Validate `GROQ_API_KEY` at startup (format check or test call).

### Logger uses relative path

**What happens:** `src/logger/logger.ts:19` resolves log files as `process.env.LOG_FILE || './logs/app.log'`. If the app is started from a different working directory, logs are written to unexpected locations or silently fail.

**Files:**
- `src/logger/logger.ts:18-24`

**Impact:** Lost log files in production deployments with different working directories.

**Fix approach:** Use absolute path based on `__dirname` or a well-defined directory.

### Database password defaults to empty string

**What happens:** When using individual DB env vars (not `DATABASE_URL`), `src/lib/prisma.ts:14` defaults `DB_PASSWORD` to `''`. PostgreSQL will attempt password-less authentication.

**Files:**
- `src/lib/prisma.ts:11-15`

**Impact:** Risk of deploying with no DB password if individual env vars are used.

### No health check beyond server time

**What happens:** The only system endpoint is `GET /api/system/time` (`src/modules/system/system.routes.ts`). There's no health check for DB connectivity, AI service availability, or job scheduler status.

**Impact:** No way to probe whether the service is truly healthy (DB connected, AI service reachable).

### Server time is system-clock dependent

**What happens:** `src/shared/utils/server-time.ts:4-6` returns `new Date()`. All time-dependent operations (session timeouts, rations, expedition dates) depend on accurate server clock.

**Impact:** If server clock drifts (container without NTP), session timeouts, ration scheduling, and date validation operate on incorrect time. By design, but worth noting.

### Swagger YAML path resolution may fail in production

**What happens:** `src/docs/swagger.ts:7` resolves `openapi.yaml` relative to compiled `__dirname`. In production (`/dist/docs/`), the YAML file (in `src/docs/`) is not automatically copied to the dist directory.

**Impact:** Swagger UI returns 404 in production builds.

---

## Fixed Since Previous Audit

The following issues from the previous CONCERNS.md (pre-2026-05-17) have been resolved:

| Old Issue | Current Status |
|-----------|---------------|
| Cross-camp data leak in transfers | **FIXED** — `getTransfers()` now filters by `requesting_camp` OR `target_camp` (`src/modules/transfers/transfers.service.ts:638-644`) |
| Cross-camp data leak in explorations | **FIXED** — `getExplorations()` now filters by `camp_id` (`src/modules/explorations/explorations.service.ts:602`) |
| Cross-camp data leak in users | **FIXED** — `getUsers()` now filters by `camp_id` (`src/modules/users/users.service.ts:112`) |
| Helmet not applied | **FIXED** — helmet is imported and configured (`src/index.ts:32-39`) |
| No general rate limiting | **FIXED** — `globalRateLimit` (200/15min) applied to all routes (`src/index.ts:55`) |
| No login rate limiting | **FIXED** — `loginRateLimit` (5/15min) applied to POST /auth/login (`src/modules/auth/auth.routes.ts:10`) |
| E2E tests all skipped | **FIXED** — Real E2E tests exist for all 11 modules (`tests/e2e/*.spec.ts`) |
| Missing audit trail | **FIXED** — `auditLog()` implemented (`src/shared/utils/auditLog.ts`) with LOGIN/LOGOUT + camp/transfer/user CRUD actions |
| `CORS_ORIGIN` undocumented | Still undocumented in `.env.example` (low severity) |

---

*Concerns audit: 2026-05-17*

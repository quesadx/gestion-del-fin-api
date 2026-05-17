# Codebase Concerns

**Analysis Date:** 2026-05-17

---

## CRITICAL: Cross-Camp Data Leakage (Unresolved)

All three list/read endpoints return records from **all camps** without filtering by the authenticated user's camp. A user from Camp A can see all transfers, users, and expeditions across the entire system.

### `getTransfers` — No Camp Filter

- Issue: `prisma.camp_transfers.findMany()` with no `where` clause
- Files: `src/modules/transfers/transfers.service.ts` line 568
- Impact: Any authenticated user from any camp can paginate through **all system transfers**, including those involving camps they don't belong to. Leaks inter-camp transfer details, resource movements, and personnel transfers.
- Fix approach: Add `WHERE requesting_camp = :campId OR target_camp = :campId` to the query, passing `campId` from `req` through the controller. The controller at `transfers.controller.ts:20-25` (`listTransfersHandler`) currently passes no campId to the service.

### `getUsers` — No Camp Filter

- Issue: `prisma.users.findMany()` with no `where` clause
- Files: `src/modules/users/users.service.ts` line 87
- Impact: Any authenticated user can see all users in the system, including their camp assignments, roles, and activity status. Exposes the full user roster.
- Fix approach: Add `{ where: { camp_id: campId } }` to the query. Update `users.controller.ts:28-33` (`getUsersHandler`) to extract `campId` from `AuthenticatedRequest` and pass it.

### `getExplorations` — No Camp Filter

- Issue: `prisma.expeditions.findMany()` with no `where` clause
- Files: `src/modules/explorations/explorations.service.ts` line 603
- Impact: Any authenticated user can see all expeditions across all camps, including destinations, member rosters, and allocated resources.
- Fix approach: Add `{ where: { camp_id: campId } }` to the query. Update the controller at `explorations.controller.ts` to extract `campId` from `AuthenticatedRequest`.

---

## CRITICAL: Zero Test Coverage (Unresolved)

- Issue: No executable tests exist in the repository.
- Files:
  - `tests/e2e/auth.spec.ts` — `describe.skip` stub
  - `tests/e2e/people.spec.ts` — `describe.skip` stub
  - `tests/e2e/resources.spec.ts` — `describe.skip` stub
  - `tests/unit/jobs/placeholder` — empty placeholder file
  - `tests/unit/ai/placeholder` — empty placeholder file
  - No `tests/unit/**/*.spec.ts` files found at all
- Impact: Any code change can silently break existing functionality. The three unresolved cross-camp data leakage bugs above are evidence that untested endpoints harbor security vulnerabilities.
- Jest config: `jest.config.ts` matches `tests/unit/**/*.spec.ts` but none exist. `--passWithNoTests` flag in `package.json` masks the problem.
- Priority: **Highest**. Every unprotected endpoint needs at minimum: 1 happy-path test + 1 cross-camp isolation test.

---

## HIGH: Role Middleware Returns 401 Instead of 403 (Unresolved)

- Issue: `role.middleware.ts` returns `AppError('Unauthorized', 401)` for ALL failure modes — missing user (line 14, 28, 33) AND insufficient role (line 37). An insufficient role should return **403 Forbidden**, not 401 (which implies authentication failure rather than authorization failure).
- Files: `src/middlewares/role.middleware.ts` lines 14, 28, 33, 37
- Impact: Confusing error semantics. Clients cannot distinguish "you aren't logged in" from "you don't have permission." Also, `role.middleware.ts` is **dead code** — it is exported but never imported or used by any route. The project uses `permission.middleware.ts` instead.
- Note: `permission.middleware.ts` **correctly** returns 403 at line 51 for insufficient permissions. However, it still returns 401 at lines 19 and 39 for auth/user-not-found scenarios (which is appropriate for those cases).

---

## HIGH: Daily Rations Cron Runs Every Minute by Default (Unresolved)

- Issue: The default cron expression for daily rations is `* * * * *` (every minute).
- Files: `src/jobs/scheduler.ts` line 7: `const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '* * * * *';`
- Impact: In any environment where `DAILY_RATIONS_CRON` is not explicitly set, the system distributes daily rations **every minute** instead of once per day. This rapidly depletes inventory and generates massive `inventory_log` records. The `daily-production.job.ts` counterpart correctly defaults to `0 5 * * *` (once daily at 5 AM).
- Fix approach: Change the default to `'0 1 * * *'` (daily at 1 AM) or similar. This was likely intended to be a TODO-override for testing but slipped through.

---

## HIGH: Comprehensive Rate Limiting Missing

- Issue: Rate limiting exists only on `POST /api/admission/camps/:campId` (the AI evaluation endpoint). All other endpoints — including auth login, transfers CRUD, user management — have no rate limiting.
- Files:
  - `src/middlewares/rateLimit.middleware.ts` — defines `admissionRateLimit` only (10 req/min, MemoryStore)
  - `src/modules/admission/admission.routes.ts` line 63 — only route that applies it
- Impact: Auth brute-force, enumeration, and denial-of-service on unprotected endpoints.
- Additional concern: Uses default `MemoryStore`. State resets on server restart. Acceptable for single-instance deployment but problematic for horizontal scaling.
- Fix approach: Add `express-rate-limit` middleware at the Express app level in `src/index.ts` for general protection, plus specific stricter limits on auth endpoints. Consider Redis-backed store for multi-instance.

---

## MEDIUM: Helmet Installed but Not Applied (Unresolved)

- Issue: `helmet` v8.1.0 is in `package.json` dependencies but never imported or used in `src/index.ts`.
- Files: `package.json` line 36, `src/index.ts` (no import or `app.use(helmet())`)
- Impact: Missing security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.). The API is vulnerable to basic web security header attacks.
- Fix approach: Add `import helmet from 'helmet';` and `app.use(helmet());` early in the middleware chain in `src/index.ts`.

---

## MEDIUM: `isAdmin` Flag Static in JWT Token (Unresolved, by Design)

- Issue: The `isAdmin` flag is computed once at login (`auth.service.ts` lines 49-51) and baked into the JWT. If a user's admin permission is revoked after login, the JWT's `isAdmin` remains `true` until the token expires or the user re-logs.
- Files:
  - `src/modules/auth/auth.service.ts` lines 49-51
  - `src/middlewares/camp.middleware.ts` line 52 (reads `isAdmin` from JWT)
- Impact: A demoted admin retains camp-scoping bypass for up to the JWT lifetime (default 24h). However, `permission.middleware.ts` re-checks permissions from DB on each request, so no actual data access is leaked — the admin bypass only affects which camp scope is enforced, not which actions can be performed.
- Mitigation: The code contains a detailed comment at `auth.service.ts:44-48` acknowledging this trade-off. Session version invalidation forces re-login if desired.
- Recommendation: Add a `POST /api/auth/refresh` endpoint that can regenerate the token with current permissions without requiring re-authentication.

---

## MEDIUM: `camp-rules.ts` Still a TODO Stub (Unresolved)

- Issue: File contains only `// TODO: implement` with no implementation.
- Files: `src/shared/constants/camp-rules.ts`
- Impact: Unknown. The file is not imported anywhere, so it's dead code. Either it needs to be implemented with camp constraint rules (e.g., max population, resource limits) or removed.

---

## MEDIUM: No General User-Action Audit Trail

- Issue: No centralized audit logging of user actions (who did what, when, on which resource).
- Files: Audit-adjacent code exists in `src/modules/inventory/inventory.service.ts` (inventory audit endpoint) and `src/shared/constants/permissions.ts` (`INVENTORY_AUDIT_READ` permission), but these only cover inventory movements.
- Existing audit-like tables:
  - `inventory_log` — tracks resource deltas with `logged_by`, `log_type`, timestamp
  - `person_status_log` — tracks person status changes with `changed_by`, reason
- Missing: No log of which user created/updated/deleted camps, users, expeditions, transfers, etc. The grading criteria explicitly require an "Audit Trail."
- Fix approach: Add an `audit_log` table with fields: `actor_id`, `action` (CREATE/UPDATE/DELETE), `entity_type`, `entity_id`, `changes` (JSON diff), `timestamp`. Log via Winston or direct DB write.

---

## MEDIUM: Missing Swagger Documentation for Transfers

- Issue: The Swagger spec in `src/docs/swagger.ts` does not include a `Transfers` tag. The tags array (lines 106-117) lists: System, Auth, Camps, Resources, People, Inventory, Admission, Users, Professions, Explorations — but no Transfers, Metrics, Roles, or Permissions.
- Files: `src/docs/swagger.ts` lines 106-117
- Impact: API consumers cannot discover transfer endpoints via Swagger UI. Incomplete documentation fails the "Documentation" grading criterion.
- Note: The JSDoc `@openapi` annotations exist in `transfers.routes.ts`, so basic endpoint docs appear — but the `tags` array is missing the Transfers category.

---

## LOW: Groq SDK No Explicit Timeout

- Issue: The Groq SDK client (`src/lib/ai.ts`) is instantiated without a timeout option: `new Groq({ apiKey: process.env.GROQ_API_KEY })`.
- Files: `src/lib/ai.ts` line 3
- Impact: If the Groq API hangs (used in `admission-evaluator.ts:63-67` for `parseCampWeights`), the request blocks indefinitely. The ML service call (`admission-evaluator.ts:88-98`) has a 5-second timeout via `AbortSignal.timeout(5000)`, but the Groq call to parse camp weights has no timeout.
- Fix approach: Add `timeout: 15000` or similar to the Groq constructor options. Consider a reasonable max (15-30 seconds) for AI response generation.

---

## NEW ISSUES (Post-Update)

### NEW — Medium: ML Microservice Has No Authentication

- Issue: The FastAPI service at `ml-service/main.py` exposes `/evaluate` and `/health` endpoints with no authentication whatsoever.
- Files: `ml-service/main.py`
- Impact: Any client with network access to port 8000 can invoke admission evaluations. The service is exposed on the host machine via `docker-compose.yml` port mapping (line 36: `'8000:8000'`).
- Docker compose: Port 8000 is mapped to the host, not just to the internal Docker network.
- Fix approach: Add a shared secret or JWT validation to the ML service. Configure the Node.js backend to pass a service token. Alternatively, do not expose port 8000 in production docker-compose (use internal networking).

### NEW — Medium: ML Service Dockerfile Runs as Root

- Issue: The Dockerfile at `ml-service/Dockerfile` does not create a non-root user. The container runs as root.
- Files: `ml-service/Dockerfile`
- Impact: If the ML service is compromised (e.g., via malicious input), the attacker has root access within the container.
- Fix approach: Add `RUN adduser --disabled-password --gecos '' appuser` and `USER appuser` before the CMD instruction.

### NEW — Medium: ML Service Accepts Arbitrary `camp_weights` Dict

- Issue: The Pydantic model `AdmissionRequest` (`ml-service/main.py:20`) defines `camp_weights: dict = {}` without any field validation. The Node.js backend sends validated weights (via Zod in `admission-evaluator.ts:13-23`), but the ML service itself has no defense-in-depth.
- Files: `ml-service/main.py` line 20, `ml-service/decision_tree.py` lines 106-138
- Impact: A malicious actor bypassing the Node.js API could send arbitrary dict structures to the ML service, potentially causing unexpected behavior or errors.
- Fix approach: Add a Pydantic model for `CampWeights` with typed fields mirroring the Zod schema in `admission-evaluator.ts` (weight_technical, weight_medical, etc.). Use `model_validate` to reject unknown fields.

### NEW — Low: `role.middleware.ts` Is Dead Code

- Issue: `role.middleware.ts` is exported but never imported by any route or other middleware. The entire project has migrated to `permission.middleware.ts` for access control.
- Files: `src/middlewares/role.middleware.ts` (exported, never used)
- Impact: Confusion for future developers. Dead code adds maintenance burden.
- Fix approach: Either remove `role.middleware.ts` or mark it as deprecated with a JSDoc comment.

### NEW — Low: `createExpedition` Alias in Explorations Service

- Issue: `explorations.service.ts:579` exports `createExpedition` as an alias for `createExploration`. Other functions use "Exploration" naming. Inconsistent internal naming.
- Files: `src/modules/explorations/explorations.service.ts` line 579
- Impact: No functional impact. Confusing for developers reading the code.

### NEW — Low: `CORS_ORIGIN` Environment Variable Typo-Like Name

- Issue: The environment variable is `CORS_ORIGIN` (not `CORS_ORIGIN`) in `src/index.ts:36` and does not appear in `.env.example`. The `.env.example` file lists no CORS configuration at all.
- Files: `src/index.ts` line 36, `.env.example` (no CORS entry)
- Impact: Developers must discover this variable name by reading source code. Not documented.
- Fix approach: Add `CORS_ORIGIN=http://localhost:5173` to `.env.example`.

---

## Dependency Risks

### `python:3.12-slim` Docker Image

- Risk: No pinned digest/SHA in `ml-service/Dockerfile`. Uses `FROM python:3.12-slim` which floats with the latest 3.12 slim image.
- Impact: Builds are non-deterministic. A breaking upstream change could break ML service builds.
- Fix approach: Pin to a digest: `FROM python:3.12-slim@sha256:...`

### `scikit-learn==1.5.2` and `numpy==1.26.4`

- Risk: These are pinned but `scikit-learn` 1.5.x has known CVEs in older patch versions. Current 1.5.2 may be vulnerable.
- Impact: Security scanning tools may flag these.
- Fix approach: Upgrade to latest patch versions of scikit-learn, numpy, and pandas.

---

## Architecture / Code Quality Notes

### Fragile Camp ID Extraction in `camp.middleware.ts`

- Issue: The `extractCampIdFromUrl` function (`camp.middleware.ts:26-46`) uses a complex regex to parse camp IDs from URL patterns. Adding new module routes requires updating this regex.
- Files: `src/middlewares/camp.middleware.ts` lines 26-46
- Risk: If a new module route pattern is missed in this regex, camp-scoping validation is silently skipped.
- Safe modification: When adding new camp-scoped routes, always update the regex. Consider refactoring to use a route-param-based approach instead of URL parsing.

### `getCamps` Endpoint Returns All Camps

- Issue: `camps.service.ts:64-83` (`getCamps`) returns ALL camps with no filtering. This is by design (camps need to be visible for transfer targeting), but means camp data is not strictly scoped.
- Note: The swagger docs tag `Camps` exists. This is intentional for the multi-camp system.

---

*Concerns audit: 2026-05-17*

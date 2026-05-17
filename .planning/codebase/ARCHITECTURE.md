<!-- refreshed: 2026-05-17 -->
# Architecture

**Analysis Date:** 2026-05-17

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         HTTP Clients                                 │
│                        (web / mobile)                                │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Express API (Node.js 20)                         │
│                      `src/index.ts`                                  │
├──────────────────────────────────────────────────────────────────────┤
│  CORS → express.json() → Routes (with middleware chains) → ErrorHandler│
│                                                                      │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │ /api/system 🔓    │  │ /api/auth 🔓     │  │ /api/camps 🔒     │ │
│  │ `system/`         │  │ `auth/`          │  │ `camps/`          │ │
│  └───────────────────┘  └──────────────────┘  └───────────────────┘ │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │ /api/resources 🔒 │  │ /api/people 🔒   │  │ /api/inventory 🔒 │ │
│  │ `resources/`      │  │ `people/`        │  │ `inventory/`      │ │
│  └───────────────────┘  └──────────────────┘  └───────────────────┘ │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │ /api/expeditions🔒│  │ /api/admission 🔒│  │ /api/transfers 🔒 │ │
│  │ `explorations/`   │  │ `admission/`     │  │ `transfers/`      │ │
│  └───────────────────┘  └──────────────────┘  └───────────────────┘ │
│  ┌───────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │ /api/professions🔒│  │ /api/users 🔒    │  │ /api/metrics 🔒   │ │
│  │ `professions/`    │  │ `users/`         │  │ `metrics/`        │ │
│  └───────────────────┘  └──────────────────┘  └───────────────────┘ │
│  ┌───────────────────┐  ┌──────────────────┐                        │
│  │ /api/roles 🔒     │  │ /api/permissions🔒│                       │
│  │ `roles/`          │  │ `permissions/`   │                        │
│  └───────────────────┘  └──────────────────┘                        │
└────────┬────────────┬───────────────────────┬────────────────────────┘
         │            │                       │
         ▼            ▼                       ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────────────────────────┐
│  PostgreSQL  │ │  Groq LLM    │ │  ML Decision Tree Service        │
│  (Prisma ORM)│ │  (llama-3.3) │ │  (Python/FastAPI + scikit-learn) │
│  `lib/prisma │ │  `lib/ai.ts` │ │  `ml-service/`                   │
│   .ts`       │ │              │ │  port 8000                       │
└──────────────┘ └──────────────┘ └─────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App bootstrap | Server startup, middleware mounting, graceful shutdown, JWT prod check | `src/index.ts` |
| Auth Middleware | JWT token verification, attach user to `req` | `src/middlewares/auth.middleware.ts` |
| Session Middleware | 20-min inactivity timeout, session version enforcement | `src/middlewares/session.middleware.ts` |
| Camp Middleware | Camp-scoping enforcement, admin bypass, URL-based camp ID extraction | `src/middlewares/camp.middleware.ts` |
| Permission Middleware | Fine-grained permission checks via role→permission DB lookup | `src/middlewares/permission.middleware.ts` |
| Role Middleware | Role-based access control (coarse-grained) | `src/middlewares/role.middleware.ts` |
| Rate Limit Middleware | Admission endpoint throttling (10 req/min/IP) | `src/middlewares/rateLimit.middleware.ts` |
| Validate Middleware | Zod schema validation for body/params/query | `src/middlewares/validate.middleware.ts` |
| Error Handler | Global catch-all: AppError, ZodError, Prisma errors, 500 fallback | `src/middlewares/error.middleware.ts` |
| Camps Module | Camp CRUD, camp-scoped resource management | `src/modules/camps/` |
| Auth Module | Login/logout, credential validation, JWT issuance | `src/modules/auth/` |
| Admission Module | Refugee evaluation (AI+ML), manual review, auto person creation | `src/modules/admission/` |
| Transfers Module | Inter-camp resource/person transfers with approval workflow | `src/modules/transfers/` |
| Metrics Module | Dashboard analytics — survivors, resources, expeditions | `src/modules/metrics/` |
| Roles Module | Role CRUD, RBAC management | `src/modules/roles/` |
| Permissions Module | Permission CRUD, fine-grained access control | `src/modules/permissions/` |
| AI Evaluator | Groq LLM camp weight parsing + ML decision tree call | `src/ai/admission-evaluator.ts` |
| ML Service | scikit-learn DecisionTree admission classifier | `ml-service/main.py` |
| Job Scheduler | cron-based daily rations, production, resource alerts | `src/jobs/scheduler.ts` |

## Pattern Overview

**Overall:** Layered architecture with per-module encapsulation

**Key Characteristics:**
- **Canonical CRUD pattern**: Routes → Controller (thin, no try/catch) → Service (business logic) → Global Error Handler
- **Module encapsulation**: Each domain module is self-contained with `routes.ts`, `controller.ts`, `service.ts`, `schema.ts`
- **Middleware-gated authorization**: Protective middleware chain with cascading fall-through (auth → session → camp → permissions)
- **External ML microservice**: Python/FastAPI service called via HTTP for admission decisions, supplementing (not replacing) the Groq LLM pipeline
- **Camp-scoped data isolation**: All protected endpoints enforce camp boundaries; no cross-camp data leakage
- **Prisma transactions**: Multi-step mutations (e.g., admission review → person creation) wrapped in `$transaction`

## Middleware Chain (Execution Order)

The middleware chain in `src/index.ts`:

```
1. cors()                          # Global — CORS headers
2. express.json()                  # Global — Body parsing
3. /api/system routes 🔓           # Public — no auth
4. /api/auth routes 🔓             # Public — no auth (except /logout has authMiddleware inline)
5. Protected routes 🔒:            # Applied per module mount:
   authMiddleware                  #   JWT verification, attach user to req
   → sessionMiddleware             #   20-min inactivity check
   → campMiddleware                #   Camp-scoping enforcement
   → [route module]                #   Zod validate() + permissionMiddleware() per route
6. /api/docs (Swagger UI)          # Public
7. errorHandler                    # Global catch-all — must be LAST
```

**Key detail:** `admissionRateLimit` is NOT global — it is applied only on `POST /api/admission/camps/:campId` inside `admission.routes.ts`, positioned after `permissionMiddleware` and `validate()` but before the controller. Other modules do NOT have rate limiting.

**No helmet:** Despite `helmet` being in `package.json`, it is NOT imported in `src/index.ts` — not currently applied.

## Layers

**HTTP Layer (Routes):**
- Purpose: Define API contract, apply Zod validation and permission middleware, route to controllers
- Location: `src/modules/{module}/{module}.routes.ts`
- Contains: Express Router definitions with OpenAPI comments, `validate()`, `permissionMiddleware()`
- Depends on: Controllers, schemas, shared HTTP schemas, permission constants
- Used by: `src/index.ts` (mounted with auth middleware chain)

**Controller Layer:**
- Purpose: Thin HTTP handlers — extract params, call service, format response
- Location: `src/modules/{module}/{module}.controller.ts`
- Contains: Async handler functions, `parseIdParam()`, `res.json()`/`res.status(201)`, NO try/catch
- Depends on: Service functions, `AuthenticatedRequest` for user context
- Used by: Routes

**Service Layer:**
- Purpose: Business logic, Prisma operations, error handling, cross-service calls
- Location: `src/modules/{module}/{module}.service.ts`
- Contains: Prisma queries, existence checks before updates, `handleUniqueConstraintError()`/`handleForeignKeyError()`, transactions
- Depends on: Prisma client (`lib/prisma.ts`), Zod DTOs, `AppError`
- Used by: Controllers, other services (e.g., admission calls people service)

**Data Layer:**
- Purpose: Database access via Prisma ORM
- Location: `src/lib/prisma.ts` (client), `prisma/schema.prisma` (schema)
- Contains: Single `prisma` export, PostgreSQL adapter (`@prisma/adapter-pg`)
- Depends on: `DATABASE_URL`
- Used by: Services, middlewares (session, camp, role, permission)

**AI/ML Layer:**
- Purpose: Admission decision-making — Groq LLM for camp context parsing, scikit-learn DecisionTree for classification
- Location: `src/ai/admission-evaluator.ts` (orchestrator), `src/lib/ai.ts` (Groq client), `ml-service/` (Python microservice)
- Contains: Camp weight extraction via LLM, ML service HTTP call, profession mapping
- Depends on: Groq API key, ML service URL (`ML_SERVICE_URL`)
- Used by: Admission service

**Job Layer:**
- Purpose: Scheduled cron tasks — daily rations, daily production, resource alerts
- Location: `src/jobs/scheduler.ts` (orchestrator), `src/jobs/*.job.ts` (individual jobs)
- Contains: node-cron schedule registration, Winston logging on start/finish/failure
- Depends on: Prisma, logger
- Used by: `src/index.ts` (started on boot, stopped on graceful shutdown)

## Data Flow

### Primary Request Path (Canonical CRUD — e.g., Update Camp)

1. `PUT /api/camps/42` → Express route matches → authMiddleware validates JWT → sessionMiddleware checks inactivity → campMiddleware validates camp access (`src/index.ts:47` + middleware chain)
2. `camps.routes.ts` applies `validate(z.object({ params: idParamsSchema, body: updateCampSchema }))` — validates `42` as positive int, validates body (`src/modules/camps/camps.routes.ts`)
3. `camps.controller.ts` → `updateCampHandler` calls `parseIdParam(req.params.id)` → calls `updateCamp(id, req.body)` → `res.json(result)` (`src/modules/camps/camps.controller.ts:11-13`)
4. `camps.service.ts` → `updateCamp()` checks existence with `findUnique`, throws `AppError('Camp not found: 42', 404)` if missing, updates with Prisma, catches unique constraint errors (`src/modules/camps/camps.service.ts:37-49`)
5. Response flows back through Express to client

### Admission with AI + ML Decision Tree

1. `POST /api/admission/camps/1` → auth → session → camp → permissionMiddleware(`ADMISSION_CREATE`) → Zod validate → `admissionRateLimit` (10/min) → `createAdmissionHandler` (`src/modules/admission/admission.routes.ts:54-65`)
2. Controller parses `campId`, calls `service.createAdmission(campId, body)` (`src/modules/admission/admission.controller.ts:7-12`)
3. Service loads camp (for `ai_context_prompt`) and professions list (`src/modules/admission/admission.service.ts:32-44`)
4. Service calls `evaluateAdmission()` in `src/ai/admission-evaluator.ts` (`src/modules/admission/admission.service.ts:49-53`)
5. Evaluator calls Groq LLM to parse camp context → extracts structured `camp_weights` JSON via Zod (`src/ai/admission-evaluator.ts:28-77`)
6. Evaluator sends POST to `ml-service:8000/evaluate` with applicant data + camp weights, 5s timeout (`src/ai/admission-evaluator.ts:79-112`)
7. ML service (`ml-service/decision_tree.py`) extracts features, auto-accepts minors (<18), runs DecisionTree `predict()` → returns `{decision, confidence, reasoning_path, profession_category}` (`ml-service/decision_tree.py:106-138`)
8. Evaluator maps `profession_category` to DB profession via keyword matching (`src/ai/admission-evaluator.ts:114-136`)
9. Service creates `admission_requests` record with AI results (`src/modules/admission/service.ts:55-57`)
10. On review (`PATCH /:id/review` with `final_decision: ACCEPTED`), service creates a `persons` record in a `$transaction` (`src/modules/admission/admission.service.ts:92-119`)

### Inter-camp Transfer Lifecycle

1. `POST /api/transfers` → create with items (resources/people), status `PENDING`
2. `PATCH /:id/schedule` → set scheduled delivery date and leader
3. `PATCH /:id/approve-source` → source camp admin approves
4. `PATCH /:id/approve-target` → target camp admin approves
5. `PATCH /:id/complete` → finalize: update inventory for both camps
6. `PATCH /:id/reject` → reject at any point before completion

**State Management:**
- JWT token carries `userId`, `campId`, `role`, `sessionVersion`, `isAdmin`
- Session version stored in DB (`users.session_version`); incremented on logout → invalidates old tokens
- Admin bypass in `campMiddleware` uses `isAdmin` from JWT (not DB role lookup) so role renames don't break admin access

## Key Abstractions

**AppError:**
- Purpose: Domain-specific error with HTTP status code
- Examples: `throw new AppError('Not found', 404)`, `throw new AppError('Unauthorized', 401)`
- File: `src/shared/utils/appError.ts`
- Pattern: Extends `Error`, carries `statusCode`, caught by global error handler

**parseIdParam:**
- Purpose: Safe numeric ID extraction from route params
- Files: `src/shared/utils/parseIdParam.ts`
- Pattern: Coerces string/array to number, validates positive integer, throws `AppError(400)` on failure

**handlePrismaError utilities:**
- Purpose: Convert Prisma constraint errors to AppError with proper status codes
- Files: `src/shared/utils/handlePrismaError.ts`
- Pattern: `handleUniqueConstraintError(error)` → throws `AppError('field already exists', 409)` for P2002; `handleForeignKeyError(error)` → throws `AppError('Cannot delete...', 409)` for P2003

**AuthenticatedRequest:**
- Purpose: TypeScript interface extending Express `Request` with decoded JWT user
- Files: `src/middlewares/auth.middleware.ts` (exported interface)
- Pattern: `(req as AuthenticatedRequest).user` provides `{ userId, campId, role, sessionVersion, isAdmin }`

**validate() middleware factory:**
- Purpose: Zod schema validation with progressive parsing (body → both body+params+query)
- Files: `src/middlewares/validate.middleware.ts`
- Pattern: `validate(z.object({ body: createSchema, params: idParamsSchema }))` — parses body first, falls back to compound parse for params/query

**permissionMiddleware() factory:**
- Purpose: Fine-grained permission gate using DB role→permission lookup
- Files: `src/middlewares/permission.middleware.ts`
- Pattern: `permissionMiddleware(PERMISSIONS.TRANSFERS_CREATE)` checks user's role has the required permission via `role_permissions` join table

**ID params and pagination schemas (shared):**
- Purpose: Reusable Zod schemas for common HTTP patterns
- Files: `src/shared/schemas/http.schema.ts`
- Pattern: `idParamsSchema` validates `{ id: positive int }`, `paginationQuerySchema` validates `{ page: positive int, pageSize: positive int }`

## Entry Points

**HTTP Server:**
- Location: `src/index.ts`
- Triggers: `npm run dev` (tsx watch), `npm start` (compiled dist)
- Responsibilities: Mount all middleware, import and mount all 14 route modules, start Express on PORT, init job scheduler, handle graceful shutdown (SIGINT/SIGTERM)

**Swagger API Docs:**
- Location: `src/docs/swagger.ts`
- Triggers: `GET /api/docs` (UI) and `GET /api/docs.json` (raw spec)
- Responsibilities: Serve OpenAPI 3.0 specification generated from JSDoc comments in route files

**Job Scheduler:**
- Location: `src/jobs/scheduler.ts`
- Triggers: Server startup (auto), configurable cron expressions
- Responsibilities: Register daily-rations, daily-production, resource-alerts cron jobs

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop — no worker threads. Jobs run async inline.
- **Global state:** Prisma client singleton (`src/lib/prisma.ts`), Groq AI client singleton (`src/lib/ai.ts`), Winston logger singleton (`src/logger/logger.ts`), ML decision tree in-memory singleton (`ml-service/decision_tree.py`: `admission_tree`). Job scheduler tasks stored as module-level variables in `src/jobs/scheduler.ts`.
- **Camp scoping enforcement:** Every protected endpoint must enforce `campId` filtering. Camp middleware validates URL camp ID matches JWT camp ID; services filter by `camp_id` in queries. Admin (`isAdmin: true`) bypasses camp check.
- **Circular imports:** None detected. Module imports flow one direction: routes → controllers → services → lib/utils.
- **Server time only:** All date calculations use server time via `serverTime.now()` or `new Date()`. Client never trusted for time. `GET /api/system/time` provides server time for clock sync.
- **No global rate limiting:** Rate limiting only on `POST /api/admission/camps/:campId` (10 req/min). `express-rate-limit` is available as dependency.

## Anti-Patterns

### Direct Prisma Access in Controller

**What happens:** Some controllers import `AuthenticatedRequest` and pass user context directly, but the standard pattern keeps controllers thin (only parseIdParam + call service + res.json). The `reviewAdmissionHandler` in `admission.controller.ts` calls `reviewAdmissionSchema.parse(req.body)` directly instead of using `validate()` middleware — this is intentional for the review flow but inconsistent with the rest of the codebase.
**Why it's inconsistent:** Other routes use `validate()` middleware for body parsing; this controller does it inline.
**Acceptable variation:** The pattern is consistent within the admission module. Body parsing in the controller is acceptable when the schema depends on runtime data not available at middleware definition time.

### Unused Dependencies

**What happens:** `helmet` (v8.1.0) is declared in `package.json` dependencies but never imported in `src/index.ts` or any other file.
**Why it's wrong:** Dead dependency inflates `node_modules` and `package-lock.json`. Security headers (CSP, HSTS, etc.) are not being applied.
**Do this instead:** Either import and apply `helmet()` early in the Express chain or remove the dependency.

### Placeholder Test Files

**What happens:** `tests/unit/ai/placeholder` and `tests/unit/jobs/placeholder` are empty/placeholder files — no actual test logic.
**Why it's wrong:** Zero test coverage for AI evaluation logic and cron jobs, which are critical paths (admission decision-making, daily resource distribution).
**Do this instead:** Implement unit tests for `admission-evaluator.ts` and `scheduler.ts`/job files. Mock external services (Groq, ML service HTTP calls).

## Error Handling

**Strategy:** Throw-through with global catch-all

**Error class hierarchy:**
1. `AppError(message, statusCode)` — application-level errors (404, 409, 401, etc.)
2. Zod `ZodError` — thrown by `validate()` middleware or explicit `schema.parse()` calls
3. Prisma `PrismaClientKnownRequestError` — thrown by Prisma on constraint violations (P2002, P2003, P2025)

**Global error handler** (`src/middlewares/error.middleware.ts`) catches in order:
1. `AppError` → respond with `{ error: { message, statusCode } }`
2. `ZodError` → respond with `{ error: { message: 'Validation failed', statusCode: 400, details: issues } }`
3. Prisma errors → map to HTTP codes: P2002→409, P2003→409, P2025→404, default→400
4. Errors with `statusCode` + `message` properties (express-rate-limit, etc.) → pass through
5. Unknown → 500, masked message in production, logged with stack trace via Winston

**Service-level error patterns:**
- Existence check before mutation: `if (!record) throw new AppError('Not found', 404)`
- Prisma constraint wrapping: `handleUniqueConstraintError(error)` / `handleForeignKeyError(error)` — catches P2002/P2003 and re-throws as AppError
- Controller pattern: NEVER try/catch — let errors bubble to global handler

## Cross-Cutting Concerns

**Logging:** Winston with DailyRotateFile transport. Console + file in dev (`HH:mm:ss` format), JSON in production. Error logs separate to `logs/error-YYYY-MM-DD.log`. Logger instance from `src/logger/logger.ts` imported everywhere. Log level from `LOG_LEVEL` env var.

**Validation:** Zod schemas per module (create/update DTOs). Applied via `validate()` middleware in routes. Shared schemas in `src/shared/schemas/http.schema.ts` (ID params, pagination). Progressive parsing: body-only first (common case), then compound (body + params + query) as fallback.

**Authentication:** JWT with `jsonwebtoken`. Token payload: `{ userId, campId, role, sessionVersion, isAdmin }`. `authMiddleware` verifies and attaches to `req`. `sessionMiddleware` checks 20-min inactivity via `users.last_activity` and `users.session_version` (optimistic locking via `updateMany` count check).

**Authorization (RBAC + Permissions):**
- `roleMiddleware(allowedRoles)` — coarse-grained: checks user's DB role name against allowed list
- `permissionMiddleware(required)` — fine-grained: checks user's role→permissions for specific permission string (e.g., `transfers.create`)
- `campMiddleware` — data isolation: ensures user's JWT camp matches URL camp ID (admin bypass via `isAdmin`)
- Permission constants in `src/shared/constants/permissions.ts` (56 permissions covering all domains)

---

*Architecture analysis: 2026-05-17*

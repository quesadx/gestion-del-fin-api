<!-- refreshed: 2026-05-17 -->
# Architecture

**Analysis Date:** 2026-05-17

## System Overview

Gestión del Fin API is a Node.js/Express 5 modular monolith using TypeScript strict mode with ES modules. Each domain (camps, people, resources, admissions, transfers, etc.) is encapsulated in `src/modules/{module}/` with a canonical 4-file pattern: `routes.ts` → `controller.ts` → `service.ts` → `schema.ts`. All data access goes through a single Prisma 7.8 ORM client targeting PostgreSQL. The architecture enforces camp-scoped data isolation via a layered middleware chain (JWT auth → 20-min session timeout → camp scoping → permission-based RBAC), server-side time authority for all business logic, and external AI/ML services for admission decisions.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         HTTP Clients                                     │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Express 5 API (Node.js 20)                            │
│                         src/index.ts                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  helmet(relaxed) → cors → express.json() → globalRateLimit (200/15min)    │
│                                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │ /api/system 🔓 │  │ /api/auth 🔓  │  │ /api/docs 🔓  │  │ 14 modules │ │
│  │ (no middleware) │  │ (login only)  │  │ (Swagger UI)  │  │  🔒 auth +  │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  │ session +   │ │
│                                                             │ camp + perm │ │
│  For each protected module:                                 └────────────┘ │
│    authMiddleware → sessionMiddleware → campMiddleware → [module routes]   │
│                              └→ per-route: permissionMiddleware + validate │
└─────────────────────────┬─────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────────┐
          ▼               ▼                   ▼
┌─────────────────┐ ┌─────────────┐ ┌──────────────────────┐
│  PostgreSQL      │ │ Groq LLM   │ │ Python ML Service    │
│  (Prisma 7.8)    │ │ (llama-3.3)│ │ (FastAPI + sklearn)  │
│  lib/prisma.ts   │ │ lib/ai.ts  │ │ ml-service/ port 8000│
└─────────────────┘ └─────────────┘ └──────────────────────┘
```

## Middleware Chain (Execution Order)

```
1. helmet(relaxed CSP/CORS)         ← Global — security headers
2. cors(origin: CORS_ORIGIN env)    ← Global — CORS
3. express.json()                   ← Global — body parser
4. globalRateLimit (200/15min)      ← Global — rate limiting
5. 🔓 /api/system routes            ← PUBLIC — no middleware
6. 🔓 /api/auth routes              ← PUBLIC — login only (loginRateLimit inline)
7. 🔒 /api/resources → auth → session → camp → [module routes]
8. 🔒 /api/expeditions → auth → session → camp → [module routes]
9. 🔒 /api/camps → auth → session → camp → [module routes]
10. 🔒 /api/users → auth → session → camp → [module routes]
11. 🔒 /api/roles → auth → session → camp → [module routes]
12. 🔒 /api/permissions → auth → session → camp → [module routes]
13. 🔒 /api/professions → auth → session → camp → [module routes]
14. 🔒 /api/inventory → auth → session → camp → [module routes]
15. 🔒 /api/admission → auth → session → camp → [module routes]
16. 🔒 /api/transfers → auth → session → camp → [module routes]
17. 🔒 /api/metrics → auth → session → camp → [module routes]
18. 🔓 /api/docs (Swagger UI)
19. errorHandler ← MUST be last
```

Per-route inside each module: `permissionMiddleware(PERMISSIONS.XXX)` → `validate(ZodSchema)` → controller handler.

## Module Architecture

Each module follows the convention: `{module}.routes.ts` → `{module}.controller.ts` → `{module}.service.ts` → Prisma. Zod schemas in `{module}.schema.ts`.

### Canonical CRUD Flow (Reference: `camps` module)

```
Request
  ↓
Route (Zod validation + permission middleware)
  ↓
Controller (thin, no try/catch, parseIdParam, res.json())
  ↓
Service (business logic, Prisma, existence checks, AppError throws)
  ↓
Global Error Middleware (catches all, returns 400/404/409/500)
```

### Module Inventory (14 modules)

| Module | Route Prefix | Files | Key Endpoints | Responsibility |
|--------|-------------|-------|---------------|----------------|
| **auth** | `/api/auth` | schema, routes, controller, service | `POST /login`, `POST /logout` | JWT issuance, credential verification, session version invalidation |
| **camps** | `/api/camps` | schema, routes, controller, service | CRUD `/camps/:id`, `GET /camps` | Camp CRUD, metadata, AI context prompt, nested people routes |
| **people** | `/api/camps/:campId/people` | schema, routes, controller, service | CRUD `/:id`, `POST /status-log`, `POST /profession-reassignments`, `POST /contribution-overrides` | Survivor records, status transitions, profession history, production overrides |
| **professions** | `/api/professions` | schema, routes, controller, service | CRUD `/professions/:id` | Job catalog definitions, resource production amounts per profession |
| **resources** | `/api/resources` | schema, routes, controller, service | CRUD `/resources/:id` | Resource type definitions (name, unit, daily_ration, minimum_stock, auto_daily) |
| **inventory** | `/api/inventory` | schema, routes, controller, service | `GET /:campId`, `GET /audit/:campId`, `POST /adjustment` | Per-camp stock tracking, movement audit, manual adjustments |
| **admission** | `/api/admission` | schema, routes, controller, service | `POST /camps/:campId`, `GET /camps/:campId`, `GET /:id`, `PATCH /:id/review` | AI+ML refugee evaluation, manual override, auto person creation on accept |
| **explorations** | `/api/expeditions` | schema, routes, controller, service | `POST /`, `GET /:id`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id` | Expedition lifecycle, resource allocation/collection, member tracking |
| **transfers** | `/api/transfers` | schema, routes, controller, service | `POST /`, `GET /:id`, `PATCH /:id/schedule`, `/approve-source`, `/approve-target`, `/complete`, `/reject` | Inter-camp resource/person movement, 6-step approval workflow |
| **users** | `/api/users` | schema, routes, controller, service | CRUD `/users/:id` | System user management, role/camp assignment |
| **roles** | `/api/roles` | schema, routes, controller, service | CRUD `/roles/:id` | Role catalog (`system_admin`, `worker`, `resource_manager`, `travel_coordinator`) |
| **permissions** | `/api/permissions` | schema, routes, controller, service | CRUD `/permissions/:id` | Fine-grained permission definitions, role→permission assignment |
| **metrics** | `/api/metrics` | schema, routes, controller, service | `GET /dashboard`, `/resources`, `/people`, `/expeditions` | Dashboard analytics, resource/people/expedition aggregates |
| **system** | `/api/system` | routes, controller, service | `GET /time` | Server time for client clock sync (public, no middleware) |

**`system` module is the exception** — only 3 files (no schema), unauthenticated, no middleware.

## Middleware Detail

### `authMiddleware` (`src/middlewares/auth.middleware.ts`)
- Extracts JWT from `Authorization: Bearer <token>` header
- Decodes via `jsonwebtoken.verify()`, validates payload fields (userId, campId, role, sessionVersion, isAdmin)
- Attaches decoded payload as `req.user: AuthenticatedRequest`
- Throws 401 on missing/invalid/expired token via `next(error)`

### `sessionMiddleware` (`src/middlewares/session.middleware.ts`)
- Enforces 20-minute inactivity timeout (`INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000`)
- Fetches user from DB: checks active status, session_version match (session invalidation on logout)
- Updates `last_activity` timestamp via `prisma.users.updateMany` with optimistic concurrency (checks update count)
- Throws 401 on timeout, inactive user, session_version mismatch, or concurrent session conflict

### `campMiddleware` (`src/middlewares/camp.middleware.ts`)
- Non-admin users: verifies camp exists and status is `ACTIVE`
- URL-based cross-camp access prevention: extracts camp ID from URL path using a regex covering 12 route families (`camps/`, `inventory/audit/`, `inventory/`, `admission/camps/`, `resources/`, `expeditions/`, `professions/`, `transfers/`, `users/`, `roles/`, `permissions/`, `metrics/`)
- Strips query strings before URL matching to prevent injection via query params
- Admin bypass: if `isAdmin` flag in JWT, skips all camp validation

### `permissionMiddleware` (`src/middlewares/permission.middleware.ts`)
- Factory function: `permissionMiddleware(required: string | string[])`
- Queries user's role → `role_permissions` join → permission names
- Returns 403 if any required permission is missing
- 56 permission constants defined in `src/shared/constants/permissions.ts`

### `roleMiddleware` (`src/middlewares/role.middleware.ts`)
- Legacy middleware for coarse role-name checking
- Superseded by `permissionMiddleware` in most routes
- Still available for simple role gating

### Rate Limit Middleware (`src/middlewares/rateLimit.middleware.ts`)
- `globalRateLimit`: 200 requests/15min (applied globally)
- `loginRateLimit`: 5 requests/15min (applied on POST /login)
- `admissionRateLimit`: 10 requests/1min (applied on POST admission, inside admission.routes.ts)
- All skip in test mode

### `validate` Middleware (`src/middlewares/validate.middleware.ts`)
- Accepts Zod schema, parses `req.body` first (fast path)
- If body parsing fails, falls back to compound parse of `{ body, params, query }`
- Mutates `req.body` (and optionally `req.query`/`req.params`) with parsed/coerced data
- Throws `ZodError` on invalid input → caught by global handler as 400

## Error Handling

**Strategy:** Throw-through with global catch-all (`src/middlewares/error.middleware.ts`)

| Error Type | Status | How Handled |
|-----------|--------|-------------|
| `AppError` | Custom (400/401/403/404/409) | Direct response: `{ error: { message, statusCode } }` |
| `ZodError` | 400 | `{ error: { message: 'Validation failed', details: issues } }` |
| Prisma P2002 | 409 | `mapPrismaError` → `'Unique constraint violation'` |
| Prisma P2003 | 409 | `mapPrismaError` → `'Foreign key constraint violation'` |
| Prisma P2025 | 404 | `mapPrismaError` → `'Record not found'` |
| Other Prisma errors | 400 | `'Database operation failed'` |
| Error with `statusCode` + `message` | varies | Pass-through (e.g., express-rate-limit 429) |
| Unknown/Unhandled | 500 | Logged with stack, message masked in production |

**Service error patterns:**
- Existence checks: `if (!record) throw new AppError('Not found', 404)`
- Prisma constraint handling: `handleUniqueConstraintError(error)` / `handleForeignKeyError(error)` from `src/shared/utils/handlePrismaError.ts`
- Controllers NEVER catch — errors bubble to `errorHandler`

**`AppError`** (`src/shared/utils/appError.ts`):
```typescript
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) { ... }
}
```

## Data Flow

### Primary Request Path (Canonical CRUD — Update Camp)

1. `PUT /api/camps/42` → Express matches → `authMiddleware` validates JWT → `sessionMiddleware` checks 20-min inactivity → `campMiddleware` validates camp access (`src/index.ts:61`)
2. `camps.routes.ts` → `permissionMiddleware(PERMISSIONS.CAMPS_UPDATE)` → `validate({ params: idParamsSchema, body: updateCampSchema })` (`src/modules/camps/camps.routes.ts:34-38`)
3. `camps.controller.ts:updateCampHandler` → `parseIdParam('42')` → calls `updateCamp(42, data, userId, campId)` → `res.json(result)` (`src/modules/camps/camps.controller.ts:12-17`)
4. `camps.service.ts:updateCamp` → `prisma.camps.findUnique({ where: { id: 42 } })` → throws `AppError('Camp not found: 42', 404)` if missing → `prisma.camps.update(...)` → catches unique constraint via `handleUniqueConstraintError` → writes `auditLog` (`src/modules/camps/camps.service.ts:48-75`)
5. Global error middleware sends JSON response

### Admission AI + ML Flow

```
POST /api/admission/camps/1
  → authMiddleware → sessionMiddleware → campMiddleware
  → permissionMiddleware(ADMISSION_CREATE)
  → validate({ params: campId, body: CreateAdmissionDTO })
  → admissionRateLimit (10/min)
  → admissionController.createAdmissionHandler
  → admissionService.createAdmission(campId, body)
     → loads camp.ai_context_prompt + all professions
     → calls evaluateAdmission(data, campContext, professions)
        → parseCampWeights(campContext) via Groq LLM (llama-3.3-70b-versatile)
          → prompt injection sanitization (strip "ignore instructions", max 500 chars)
          → response_format: json_object → Zod validated (campWeightsSchema)
        → evaluateWithDecisionTree(data, weights) via HTTP POST to ML service
          → ml-service:8000/evaluate (5s timeout)
          → returns { decision, confidence, reasoning_path, profession_category }
        → mapCategoryToProfession(category, professions) via keyword matching
     → admissionAIResult parsed via Zod
     → creates admission_requests record
```

### Transfer Lifecycle (6-step workflow)

```
1. POST / → status=PENDING, source camp creates with items
2. PATCH /:id/schedule → set delivery_date + leader
3. PATCH /:id/approve-source → source approves
4. PATCH /:id/approve-target → target approves
5. PATCH /:id/complete → finalize: update both camps' inventory via $transaction
6. PATCH /:id/reject → cancel at any point
```

### Audit Trail

- Fire-and-forget: `auditLog()` writes to `audit_logs` table without `await` (`src/shared/utils/auditLog.ts`)
- Covers: camp CRUD, user CRUD, login/logout, transfer lifecycle events
- Errors logged to Winston (non-blocking)

### Job Execution Flow

Three `node-cron` scheduled tasks (`src/jobs/scheduler.ts`):

1. **Daily Rations** (`daily-rations.job.ts`): Distributes resources per person. Priority: children → doctors → explorers → everyone. Default cron: `* * * * *` (every minute, configurable).
2. **Daily Production** (`daily-production.job.ts`): Calculates resource production per profession + contribution overrides. Default cron: `0 5 * * *`.
3. **Resource Alerts** (`resource-alerts.job.ts`): Logs warnings when inventory below `minimum_stock`. Default cron: `0 * * * *`.

All jobs iterate over all camps via `getAllCamps()`.

### State Management

- **JWT** carries `{ userId, campId, role, sessionVersion, isAdmin }`
- **Session version** in DB (`users.session_version`), incremented on logout → invalidates all tokens with old version
- **Admin bypass** in `campMiddleware` uses `isAdmin` JWT flag (not DB role lookup) to avoid breakage on role renames
- **Server time** via `serverTime.now()` from `src/shared/utils/server-time.ts` — client time never trusted

## Data Model Essentials

**Key relationships** (from `prisma/schema.prisma`, 20 models, 8 enums):
- `camps` → many `users`, `people`, `inventories`, `admission_requests`, `expeditions`, `audit_logs`, `camp_transfers` (as source/target)
- `people` (aka `persons`) → one `camp`, one `profession`, has status logs, profession history, contribution overrides, expedition membership
- `resource_types` → defines unit, daily_ration, minimum_stock, auto_daily flag; linked to inventories, inventory_logs, expedition resources, profession amounts
- `inventories` → unique per `(camp_id, resource_type_id)`, tracks current quantity
- `inventory_logs` → audit trail for all inventory movements (daily ration, daily gain, manual in/out, expedition in/out, transfer in/out)
- `camp_transfers` → multi-step workflow: PENDING → APPROVED_SOURCE → APPROVED_TARGET → COMPLETED or REJECTED; items are resources or people
- `users` → one `camp`, one `role`; tracks `session_version`, `last_activity`, `is_active`
- `roles` ↔ `permissions` via `role_permissions` join table
- `admission_requests` → one `camp`, optional reviewer + profession + person

## JWT Token

```typescript
interface AccessTokenPayload {
  userId: number;
  campId: number;
  role: string;            // "system_admin" | "worker" | "resource_manager" | "travel_coordinator"
  sessionVersion: number;   // incremented on logout
  isAdmin: boolean;
}
```
- Signed with `JWT_SECRET`, expiry from `JWT_EXPIRY` (default `1d`)
- Session timeout is separate (20min inactivity via `sessionMiddleware`)

## Key Abstractions

| Abstraction | File | Purpose |
|-------------|------|---------|
| `AppError` | `src/shared/utils/appError.ts` | Domain error with HTTP status code |
| `parseIdParam()` | `src/shared/utils/parseIdParam.ts` | Safe positive integer extraction |,/
| `handleUniqueConstraintError()` | `src/shared/utils/handlePrismaError.ts` | Prisma P2002 → 409 AppError |
| `handleForeignKeyError()` | `src/shared/utils/handlePrismaError.ts` | Prisma P2003 → 409 AppError |
| `validate()` | `src/middlewares/validate.middleware.ts` | Zod schema validation middleware |
| `permissionMiddleware()` | `src/middlewares/permission.middleware.ts` | Fine-grained RBAC via role→permission lookup |
| `AuthenticatedRequest` | `src/middlewares/auth.middleware.ts` | Express Request extension with user payload |
| `auditLog()` | `src/shared/utils/auditLog.ts` | Fire-and-forget action logging |
| `serverTime` | `src/shared/utils/server-time.ts` | Server time utilities (now, today, ISO) |
| `idParamsSchema` / `paginationQuerySchema` | `src/shared/schemas/http.schema.ts` | Reusable Zod schemas for HTTP patterns |

## Entry Points

| Entry Point | File | Trigger | Responsibility |
|-------------|------|---------|----------------|
| HTTP Server | `src/index.ts` | `npm run dev` / `npm start` | Bootstrap Express, mount middleware + 14 route modules, start jobs, graceful shutdown |
| Swagger Docs | `src/docs/swagger.ts` | `GET /api/docs` | Serve OpenAPI 3.0 spec from YAML |
| Job Scheduler | `src/jobs/scheduler.ts` | Auto on startup | Register cron tasks for rations/production/alerts |
| ML Service | `ml-service/main.py` | `uvicorn` via docker | FastAPI server for admission decision tree |

## Cross-Cutting Concerns

**Logging:** Winston with DailyRotateFile (`src/logger/logger.ts`). Console + file in dev, JSON in prod. Error logs to separate file. Singleton import.

**Validation:** Zod schemas per module. Applied via `validate()` middleware. Shared schemas in `src/shared/schemas/http.schema.ts`. Progressive parsing: body-only then compound.

**Authentication:** JWT via `jsonwebtoken`. `authMiddleware` verifies + attaches user. `sessionMiddleware` checks 20-min inactivity + session_version concurrency.

**Authorization:** Two-layer: `permissionMiddleware` (fine-grained, via role→permission DB join) supersedes legacy `roleMiddleware` (coarse role name check). `campMiddleware` enforces data isolation.

**Server-side time:** All business logic uses `serverTime.now()`. Client clock sync via `GET /api/system/time`. No client date trusted.

## Architectural Constraints

- **Camp isolation**: All queries filtered by `campId`. `campMiddleware` prevents cross-camp URL access. Admin bypass via `isAdmin` JWT flag.
- **Controllers are throw-through**: Never catch in controllers. Errors bubble to global handler.
- **Global error handler must be last**: Registered after all route groups in `src/index.ts:78`.
- **Singleton instances**: Prisma client (`lib/prisma.ts`), Groq AI client (`lib/ai.ts`), Winston logger (`logger/logger.ts`).
- **ESM modules**: `"type": "module"`, all imports use `.js` extensions.
- **Generated Prisma client**: Output to `src/generated/prisma/` (not `node_modules/.prisma`), committed to repo.
- **No domain-specific error classes**: All use `AppError`.
- **Single-threaded**: No worker threads. Jobs run async inline in event loop.
- **Server time only**: `new Date()` always server-local. Client time never used for business logic.

## Anti-Patterns

### Helmet Not Applied
- `helmet` v8.1.0 is in `package.json` dependencies but never imported or applied in `src/index.ts`. Security headers (CSP, HSTS, X-Frame-Options, etc.) are not set. Either apply `app.use(helmet())` or remove dependency.

### Placeholder Unit Tests
- `tests/unit/ai/placeholder` and `tests/unit/jobs/placeholder` are empty files — no actual unit tests for AI evaluation logic or cron jobs, which are critical paths.

### camp-rules.ts Not Implemented
- `src/shared/constants/camp-rules.ts` contains only `// TODO: implement`. Intended for camp rule definitions but never built.

---

*Architecture analysis: 2026-05-17*

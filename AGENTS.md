---
model: claude
---

# AGENTS.md: Gestión del Fin API

## Project Overview

**Gestión del Fin** is a Node.js/Express backend API for a university capstone project (EIF209, 2026) managing multiple survival camps in a zombie apocalypse scenario. The system coordinates resource distributed, personnel management, expeditions, inter-camp transfers, and AI-driven admission decisions.

- **Scope**: Multi-camp survivor management, resource tracking, automated daily tasks (food distribution), AI-assisted decisions
- **Audience**: Agents working on backend features, architecture reviews, security validation, test implementation
- **Key Concern**: Server-side time consistency, role-based access control, data integrity across camps

---

## Stack & Entry Point

| Layer             | Tool                           | Note                                                                       |
| ----------------- | ------------------------------ | -------------------------------------------------------------------------- |
| **Runtime**       | Node.js 20+, Express 5.2.1     | `/src/index.ts` is entry; 13 route modules mounted                         |
| **Language**      | TypeScript (strict mode)       | Compiles to `/dist`, runs via `node` or `tsx watch`                        |
| **Database**      | MariaDB + Prisma 7.8           | Schema in `/prisma/schema.prisma`; migrations in `/prisma/migrations/`     |
| **Auth**          | JWT (jsonwebtoken), bcryptjs   | 20-min session timeout via `session.middleware.ts`                         |
| **Validation**    | Zod                            | schemas in `{module}.schema.ts`; applied via `validate(Schema)` middleware |
| **Logging**       | Winston                        | general logs + daily rotate; audit log captures user actions               |
| **Job Scheduler** | node-cron                      | daily-rations, resource-alerts jobs in `/src/jobs/`                        |
| **AI**            | Groq SDK                       | admission evaluator + role assigner; context prompt stored per camp        |
| **Testing**       | Jest (unit) + Playwright (E2E) | `/tests/unit/` and `/tests/e2e/`                                           |

---

## Architectural Patterns

### Canon CRUD Flow (Reference: `camps` module)

```
Request
  ↓
Route (Zod validation + middleware)
  ↓
Controller (thin, no try/catch, parseIdParam, res.json())
  ↓
Service (business logic, Prisma, error handling)
  ↓
Global Error Middleware (catches all, returns 400/404/500)
```

**Key Rules**:

- Controllers **never catch exceptions**; async errors bubble to global handler
- Services **check existence** before update/delete; throw `new AppError(msg, code)` for domain errors
- Catch Prisma constraint violations only via `handleUniqueConstraintError()` or `handleForeignKeyError()`
- All incoming IDs validated with `parseIdParam()` from `/shared/utils/`

### Example Controller Pattern

```typescript
export async function getOne(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await Service.getById(id);
  return res.json(result);
}
```

### Example Service Pattern

```typescript
import { handleUniqueConstraintError } from '../../shared/utils/handlePrismaError.js';
import { AppError } from '../../shared/utils/appError.js';

export async function create(data: CreateDto) {
  try {
    return await prisma.model.create({ data: prepareData(data) });
  } catch (error) {
    handleUniqueConstraintError(error); // throws AppError if constraint violated
  }
}

export async function update(id: number, data: UpdateDto) {
  const existing = await prisma.model.findUnique({ where: { id } });
  if (!existing) throw new AppError('Not found', 404);
  return await prisma.model.update({ where: { id }, data });
}
```

---

## Middleware Chain & Security

**Applied to all routes except `POST /api/auth/*` and `GET /api/system/**`:\*\*

1. `authMiddleware` — verifies JWT token; throws 401 if invalid/missing
2. `sessionMiddleware` — enforces 20-min inactivity timeout; throws 401 if expired
3. `campMiddleware` — extracts camp from token/header; attaches to `req.camp`; validatesaccess
4. `roleMiddleware` — (selective) enforces role-based access; throws 403 if insufficient

**Auth Flow:**

- `POST /api/auth/login` → validates credentials, returns JWT (no session timeout on login endpoint)
- Token payload includes: `sub` (userId), `role`, `campId`, `iat`, `exp`
- Token expiry: environment-driven (default 24h for JWT, but session resets on inactivity)

---

## Module Inventory

| Module           | Domain               | Key Endpoints                                      | Responsibilities                                                 |
| ---------------- | -------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| **auth**         | Authentication       | `POST /login`, `POST /register`, `POST /logout`    | User credentials, JWT issuance, session validation               |
| **camps**        | Camp Management      | `GET/POST/PUT/DELETE /camps/:id`                   | Camp CRUD, metadata, AI context prompt per camp                  |
| **people**       | Personnel            | `GET/POST/PUT/DELETE /people/:id`                  | Survivor records, profession, status (healthy/injured/absent)    |
| **professions**  | Job Catalog          | `GET/POST/PUT/DELETE /professions/:id`             | Profession definitions (e.g., "Scavenger", "Medic")              |
| **resources**    | Inventory            | `GET/POST/PUT/DELETE /resources/:id`               | Resource types, quantities, alert thresholds                     |
| **inventory**    | Stock Tracking       | `GET /inventory`, `POST /inventory/adjust`         | Per-camp resource balances, inflow/outflow logs                  |
| **admission**    | Ingress Decisions    | `POST /admission/evaluate`, `GET /admission/:id`   | AI evaluation of refugees, manual override capability            |
| **explorations** | Expeditions          | `GET/POST/PUT /expeditions/:id`, `PUT /status`     | Expedition scheduling, resource consumption, date tracking       |
| **transfers**    | Inter-camp Transfers | `POST /transfers`, `PUT /approve`, `PUT /complete` | Resource/people movement, approval workflow, delivery scheduling |
| **users**        | System Users         | `GET/POST /users`, role/camp assignment            | Admin user management                                            |
| **system**       | Health & Config      | `GET /system/time`                                 | Server time (critical for client sync)                           |

---

## Data Model Essentials

### Key Relationships

- `Camp` → many `User`, many `Person`, many `Resource`
- `Person` → one `Camp`, one `Profession`, one `User`
- `Resource` → one `Camp`
- `Exploration` → one `Camp`, many `Person` (participants)
- `Transfer` → from `Camp`, to `Camp`, many `Resource`
- `Admission` → one `Camp`, references external refugee data

### Camp-Scoped Operations

**All data retrieval scoped to `req.camp.id`**. E.g., `prisma.person.findMany({ campId: req.camp.id })` ensures no cross-camp leakage.

### Server-Side Time

- All date calculations use server time (no client time trusted)
- `GET /api/system/time` returns server's current timestamp for client clock sync
- Exploration scheduling and job runs respect server time only

---

## Error Handling Conventions

| Error                               | Code | Origin                        |
| ----------------------------------- | ---- | ----------------------------- |
| Invalid token or missing auth       | 401  | `auth.middleware`             |
| Session timeout (20 min inactivity) | 401  | `session.middleware`          |
| Insufficient role permission        | 403  | `role.middleware`             |
| Resource not found                  | 404  | Service 404 check             |
| Unique constraint violation         | 409  | `handleUniqueConstraintError` |
| Foreign key violation               | 400  | `handleForeignKeyError`       |
| Validation failure                  | 400  | Zod middleware                |
| Unexpected error                    | 500  | Global error handler          |

**Global error middleware** (`error.middleware.ts`) wraps all async errors, logs to Winston, returns formatted JSON with `{ error, statusCode, requestId }`.

---

## File Naming Conventions

```
{module}/
  {module}.routes.ts       → Route definitions + Zod validate() middleware
  {module}.controller.ts   → Thin HTTP handlers (no business logic)
  {module}.service.ts      → Business logic, Prisma calls, error handling
  {module}.schema.ts       → Zod schemas for request bodies
```

**Never create:**

- domain-specific error classes (use `AppError`)
- custom middleware beyond the standard 5
- new logger instances (import shared `logger`)

---

## New Module Checklist

1. [ ] Create `/src/modules/{name}/` directory
2. [ ] `{name}.schema.ts` → Zod definitions for all DTOs
3. [ ] `{name}.routes.ts` → Router, `validate(Schema)` middleware per route
4. [ ] `{name}.controller.ts` → HTTP handlers, no try/catch, `parseIdParam()` for IDs, `res.json()`
5. [ ] `{name}.service.ts` → Prisma calls, existence checks before update/delete, `handlePrismaError` utilities
6. [ ] Register in `/src/index.ts` → Import routes, mount on app (add middleware chain if protected)
7. [ ] Tests → Unit tests in `/tests/unit/{name}/`, E2E in `/tests/e2e/{name}.spec.ts`

---

## Key Code Locations

| Concern                       | File                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Middleware chain & auth logic | `/src/middlewares/auth.middleware.ts`, `session.middleware.ts`, `camp.middleware.ts` |
| Error handling                | `/src/shared/utils/appError.ts`, `/src/middlewares/error.middleware.js`              |
| Prisma setup                  | `/src/lib/prisma.ts`                                                                 |
| Logger instance               | `/src/logger/logger.ts`                                                              |
| Constants (roles, camp rules) | `/src/shared/constants/`                                                             |
| Shared utilities              | `/src/shared/utils/parseIdParam.ts`, `handlePrismaError.ts`                          |
| AI integration                | `/src/ai/admission-evaluator.ts`, `/src/ai/role-assigner.ts`                         |
| Job scheduler                 | `/src/jobs/scheduler.ts`                                                             |
| Database schema               | `/prisma/schema.prisma`                                                              |

---

## Validation & Zod Patterns

```typescript
// schema.ts
export const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().optional(),
});
export type CreateDto = z.infer<typeof createSchema>;

// routes.ts
router.post('/', validate(createSchema), createHandler);
```

The `validate()` middleware:

- Parses `req.body` against schema
- Returns 400 with validation errors if invalid
- Passes clean data to controller if valid

---

## Running & Testing

| Command            | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start server with hot-reload (tsx watch) |
| `npm run build`    | Compile TypeScript → `/dist`             |
| `npm run start`    | Run compiled server from `/dist`         |
| `npm run lint`     | Check code style                         |
| `npm run test`     | Jest unit tests                          |
| `npm run test:e2e` | Playwright E2E tests                     |

---

## Decision Making for Agents

### When to add a new module:

- Feature is a **domain** (people, resources, expeditions, etc.)
- Multiple CRUD operations expected
- Requires separate database entity/relations

### When to extend existing module:

- Feature is a **sub-operation** of existing domain (e.g., `PUT /expeditions/:id/status` extends explorations)
- Shares same authorization/scoping rules
- Shares same database entity

### When to implement service-level function vs. route:

- **Route** if exposed to external clients (API contract)
- **Service function** if internal orchestration (called by jobs, other services)

### When to use AI:

- Admission decisions (evaluate refugee eligibility)
- Role assignment (match person to profession based on data)
- Avoid AI for deterministic business logic (resource math, status transitions)

---

## Project Goals (Grading Criteria)

From `docs/proyecto-programado.md`:

1. **Auth + Session Management** — 20-min timeout, role-based access, secure token issuance
2. **Admission with AI** — Evaluate refugee eligibility, show reasoning, allow manual override
3. **Resource Tracking** — Daily ration distribution, consumption tracking, auto-alerts below min
4. **Expeditions** — Schedule, track duration, consume rations, log returns
5. **Inter-camp Transfers** — Resource/people movement, approval workflow
6. **Audit Trail** — Log user actions for security review
7. **Stress Testing** — System handles realistic data volume without degradation
8. **Documentation** — Code clarity, API documentation (Swagger), runbook

---

## Common Gotchas

1. **Cross-camp data leakage**: Always filter queries by `campId: req.camp.id`. No global queries.
2. **Client time trust**: Never use `new Date()` client-side for business logic; always sync via `/api/system/time`.
3. **Session timeout edge case**: Session expires after 20 min of inactivity, not 20 min total; refresh on each request.
4. **Prisma unique constraint**: Catch and re-throw as `AppError(msg, 409)` so client knows it's a conflict, not a 500.
5. **Role checks**: Verify role in controller _or_ route middleware; inconsistency causes authorization bypass.
6. **Error handler placement**: Global error handler must be mounted **last** in the Express chain.

---

## Useful Queries & Patterns

```typescript
// Count by camp
const count = await prisma.person.count({ where: { campId: req.camp.id } });

// Paginate
const skip = (page - 1) * pageSize;
const records = await prisma.resource.findMany({ skip, take: pageSize });

// Aggregate resource quantities
const totals = await prisma.inventoryLog.groupBy({ by: ['resourceId'], _sum: { quantity: true } });

// Find with relations
const camp = await prisma.camp.findUnique({
  where: { id: campId },
  include: { people: true, resources: true }
});

// Transaction (atomic operation)
const result = await prisma.$transaction(async (tx) => {
  await tx.resource.update(...);
  await tx.inventoryLog.create(...);
  return result;
});
```

---

## Configuration

Key environment variables (in `.env`):

- `DATABASE_URL` — MariaDB connection string
- `JWT_SECRET` — Signing key for tokens
- `JWT_EXPIRY` — Token lifetime (e.g., "24h")
- `CORS_ORIGIN` — Frontend origin for CORS
- `LOG_LEVEL` — Winston logging level (info, debug, error)
- `GROQ_API_KEY` — API key for AI service
- `NODE_ENV` — "development" or "production"

---

## For Backend Architects

- **Respect the camp boundary**: Every public endpoint should enforce camp-scoping. No exceptions.
- **Use services, not queries in controllers**: Controllers orchestrate; services encapsulate logic.
- **Validate schema before business logic**: Zod middleware first, then controller, then service checks.
- **Log actions asynchronously**: Don't block response on audit logging.
- **Test happy path + edge cases**: At least one happy-path test per endpoint, one error case.
- **Prefer Prisma transactions** for multi-step updates (e.g., transfer approval chain).
- **Reference `camps` module** for CRUD patterns; don't invent new module structures.

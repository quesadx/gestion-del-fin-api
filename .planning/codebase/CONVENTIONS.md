# Coding Conventions

**Analysis Date:** 2026-05-17

## Naming Patterns

**Files:**
- `{module}.{type}.ts` — e.g., `permissions.controller.ts`, `permissions.service.ts`, `permissions.schema.ts`, `permissions.routes.ts`
- Middleware files: `{name}.middleware.ts` — e.g., `auth.middleware.ts`, `camp.middleware.ts`, `validate.middleware.ts`
- Config: `eslint.config.js`, `jest.config.ts`, `playwright.config.ts`, `tsconfig.json`
- Prisma schema: `prisma/schema.prisma`
- Constants: `src/shared/constants/{domain}.ts`

**Functions:**
- Controller handlers: `{action}{Module}Handler` — e.g., `createPermissionHandler`, `getCampsHandler`, `deleteCampHandler`
- Service functions: `{action}{Module}` — e.g., `createCamp`, `getCamps`, `updateTransfer`
- Internal service helpers: `prepare{Entity}CreateData`, `prepare{Entity}UpdateData`
- Middleware factories: `permissionMiddleware(required)`, `validate(schema)`

**Variables:**
- camelCase for locals and params: `campId`, `pageSize`, `effectiveLimit`, `permissionIds`
- UPPER_SNAKE for constants: `PERMISSIONS`, `ROLES`
- Prisma select objects: as-const objects with `satisfies`

**Types:**
- PascalCase DTOs: `CreateCampDto`, `UpdateTransferDto`, `LoginInput`
- Zod inferred types exported alongside schemas: `export type CreateCampDto = z.infer<typeof createCampSchema>`
- Prisma payload types: `Prisma.camp_transfersGetPayload<{ include: { ... } }>`

**Enums:**
- Zod enums for string statuses: `campStatusEnum`, `transferStatusEnum`, `personStatusEnum`
- Permission constants as `as const` object with dot-delimited strings: `'camps.create'`, `'transfers.approve_source'`
- Role names as const tuple: `['system_admin', 'worker', 'resource_manager', 'travel_coordinator'] as const`

## Code Style

**Formatting:**
- Tool: Prettier (`.prettierrc`)
- Semicolons: required (`semi: true`)
- Quotes: single (`singleQuote: true`)
- Trailing commas: everywhere (`trailingComma: "all"`)
- Print width: 100 characters (`printWidth: 100`)
- Indentation: 2 spaces, no tabs (`tabWidth: 2`, `useTabs: false`)
- Arrow parens: always (`arrowParens: "always"`)
- Bracket spacing: true
- End of line: auto

**Linting:**
- Tool: ESLint (`eslint.config.js`) with `@typescript-eslint/eslint-plugin` and `eslint-plugin-prettier`
- Rules:
  - `prettier/prettier: error` — integrates Prettier via ESLint
  - `@typescript-eslint/no-unused-vars: warn` — warns on unused imports/variables
  - `@typescript-eslint/explicit-function-return-type: off` — return types not required
- Ignored: `src/generated/prisma/**`

**Spell Checking:**
- Tool: cspell (`cspell.json`)
- Run: `npm run spell` — checks `src/**/*.ts`
- Custom dictionary includes Spanish terms for the zombie apocalypse domain

**Editor config (`.vscode/settings.json`):**
- `formatOnSave: true`
- Default formatter: `esbenp.prettier-vscode`
- `source.fixAll` on save (lint-on-save)
- ESLint validates TypeScript, TypeScript React, JavaScript

## Import Organization

**Order (observed across all modules):**
1. Node builtins / third-party: `import { Router, Request, Response } from 'express'`, `import { z } from 'zod'`
2. Local controller imports: `import * as controller from './module.controller.js'`
3. Local schema imports: `import { createSchema, updateSchema } from './module.schema.js'`
4. Middleware: `import { validate } from '../../middlewares/validate.middleware.js'`
5. Shared schemas: `import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js'`
6. Permission middleware: `import { permissionMiddleware } from '../../middlewares/permission.middleware.js'`
7. Permission constants: `import { PERMISSIONS } from '../../shared/constants/permissions.js'`

**Path Aliases:**
- No path aliases configured. All imports use relative paths with `.js` extension (ESM — `"type": "module"` in package.json).

## Controller Patterns

Controllers are **thin** HTTP handlers. Key rules from all modules:

```typescript
// Standard pattern — no try/catch, async errors bubble to global error handler
export async function createCampHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const result = await createCamp(req.body, authReq.user.userId, authReq.user.campId);
  return res.status(201).json(result);     // 201 for creates
}

export async function updateCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateCamp(id, req.body);
  return res.json(result);                 // 200 (default)
}

export async function deleteCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteCamp(id);
  return res.status(204).send();           // 204 for deletes, empty body
}

export async function getCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getCamp(id);
  return res.json(result);
}

export async function getCampsHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getCamps(page, pageSize);
  return res.json(result);
}
```

**Key controller rules:**
- Use `parseIdParam()` from `src/shared/utils/parseIdParam.ts` for all numeric IDs — validates positive integer, throws `AppError` on invalid
- Controllers **never catch exceptions** — errors bubble to `errorHandler` in `src/middlewares/error.middleware.ts`
- Cast `req` to `AuthenticatedRequest` when accessing `req.user` (tokens mapped by `authMiddleware`)
- Default pagination: page=1, pageSize=20, capped at 100

## Service Patterns

Services contain business logic. Patterns from all service files:

```typescript
// 1. Check existence before update/delete
const camp = await prisma.camps.findUnique({ where: { id } });
if (!camp) throw new AppError(`Camp not found: ${id}`, 404);

// 2. Try/catch Prisma operations for constraint violations
try {
  return await prisma.camps.create({ data: prepareData(data) });
} catch (error: any) {
  handleUniqueConstraintError(error);  // re-throws 409 AppError
}

// 3. Use Prisma $transaction for multi-table operations
return prisma.$transaction(async (tx) => {
  const role = await tx.roles.create({ data: ... });
  await tx.role_permissions.createMany({ data: ... });
  return tx.roles.findUnique({ ... });
});

// 4. Pagination pattern (consistent across all list endpoints)
const effectiveLimit = Math.min(pageSize, 100);  // cap page size
const skip = (page - 1) * effectiveLimit;
const [records, total] = await Promise.all([...findMany, ...count]);
return {
  data: records,
  pagination: { page, pageSize: effectiveLimit, total,
    hasNextPage: page * effectiveLimit < total,
    totalPages: Math.ceil(total / effectiveLimit) },
};
```

**Internal helper naming:**
- `prepare{Entity}CreateData` / `prepare{Entity}UpdateData` — shape DTO into Prisma input

## Schema Patterns

All modules use consistent Zod patterns in `{module}.schema.ts`:

```typescript
// Standard create schema
export const createCampSchema = z.object({
  name: z.string({ message: 'name is required' }).trim().min(1).max(100),
  location: z.string().max(100).optional(),
  status: campStatusEnum.optional(),
  ai_context_prompt: z.string().optional(),
});

// Update schema — partial with empty-body guard
export const updateCampSchema = createCampSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// DTO exports
export type CreateCampDto = z.infer<typeof createCampSchema>;
export type UpdateCampDto = z.infer<typeof updateCampSchema>;
```

**Cross-field validation:** Use `.superRefine()` for complex validations:
- `src/modules/transfers/transfers.schema.ts` — validates item_type-dependent fields, no self-transfer, no duplicates
- `src/modules/explorations/explorations.schema.ts` — validates date ordering

## Route Patterns

All routes follow a consistent structure:

```typescript
const router = Router();

/**
 * @openapi
 * /api/camps:
 *   post:
 *     tags: [Camps]
 *     summary: Create a camp
 */
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.CAMPS_CREATE),
  validate(z.object({ body: createCampSchema })),
  campsController.createCampHandler,
);

export default router;
```

**Validation patterns in routes:**
- Body-only: `validate(z.object({ body: createSchema }))`
- Params-only: `validate(z.object({ params: idParamsSchema }))`
- Query-only: `validate(z.object({ query: paginationQuerySchema }))`
- Combined: `validate(z.object({ params: idParamsSchema, body: updateSchema }))`

**Nested routes:** `camps` module mounts people routes: `router.use('/:campId/people', peopleRoutes)` with `Router({ mergeParams: true })`.

## Rate Limiting

Configured in `src/middlewares/rateLimit.middleware.ts`:

```typescript
export const admissionRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,               // 10 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many admission requests', statusCode: 429 } },
});
```

Currently only applied to admission routes in `src/modules/admission/admission.routes.ts`.

## Prisma Usage

**Client:** Single instance exported from `src/lib/prisma.ts`:

```typescript
const adapter = new PrismaPg({ connectionString: getConnectionUrl() });
export const prisma = new PrismaClient({ adapter });
```

**Select objects:** Define reusable as-const select objects for query optimization.

**Transaction pattern:** Used extensively:
- `src/modules/roles/roles.service.ts` — transactional role+permission updates
- `src/modules/transfers/transfers.service.ts` — transfer creation, approval, completion
- `src/modules/admission/admission.service.ts` — review + auto-create person

**Query optimization:**
- Parallel queries with `Promise.all()` for counts + records
- `findUnique({ where: { id }, select: { id: true } })` for minimal existence checks
- `updateMany` with optimistic concurrency: `where: { id, session_version }` for session management

**Soft delete:** `src/modules/users/users.service.ts` — `deleteUser` sets `is_active: false` and increments `session_version` rather than hard-deleting.

## Error Handling

**AppError class** in `src/shared/utils/appError.ts`:
```typescript
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) { ... }
}
```

**Prisma error handlers** in `src/shared/utils/handlePrismaError.ts`:
- `handleUniqueConstraintError` — catches P2002, throws 409 AppError
- `handleForeignKeyError` — catches P2003, throws 409 AppError

**Global error middleware** (`src/middlewares/error.middleware.ts` — last in Express chain):
- `AppError` → returns `{ error: { message, statusCode } }`
- `ZodError` → 400 with `error.issues`
- `PrismaClientKnownRequestError` → maps P2002 (409), P2003 (409), P2025 (404)
- Unknown → 500 (`'Internal Server Error'` in production)

**Error codes reference:**

| Error | Code | Origin |
|-------|------|--------|
| Invalid/missing token | 401 | `auth.middleware.ts` |
| Session timeout (20 min) | 401 | `session.middleware.ts` |
| Insufficient permissions | 403 | `permission.middleware.ts` |
| Resource not found | 404 | Service existence check |
| Unique constraint | 409 | `handleUniqueConstraintError` |
| FK constraint on delete | 409 | `handleForeignKeyError` |
| Validation failed | 400 | Zod middleware / global handler |
| Rate limit exceeded | 429 | `express-rate-limit` |
| Unexpected | 500 | Global error handler |

## Logging

**Framework:** Winston with daily rotate (`src/logger/logger.ts`)
- Console transport always on
- Daily rotating files: `app-YYYY-MM-DD.log` (14d retention, 20MB max)
- Error-only log: `error-YYYY-MM-DD.log` (30d retention)
- Dev format: colorized, timestamped, with stack traces
- Prod format: JSON
- Log level via `LOG_LEVEL` env (default: "info")

**Usage:** Import shared `logger` from `src/logger/logger.ts`. Never create new instances.

**Audit logging:** `src/shared/utils/auditLog.ts` — logs user actions (CREATE_CAMP, UPDATE_TRANSFER, etc.) to database for security trail.

## Module Structure

**All 14 domain modules follow the same structure:**
```
src/modules/{name}/
  {name}.routes.ts       # Router, Zod validation, permissionMiddleware, Swagger JSDoc
  {name}.controller.ts   # Thin HTTP handlers
  {name}.service.ts      # Business logic, Prisma queries, error handling
  {name}.schema.ts       # Zod schemas + DTO types
```

**Modules that deviate:**
- `src/modules/system/` — simple routes, no full CRUD (just server time endpoint)
- `src/modules/metrics/` — read-only dashboard endpoints, no Zod validation on routes
- `src/modules/admission/` — uses custom campId params, rate limiting, AI integration (Groq SDK)
- `src/modules/inventory/` — custom routes (`/adjustment`, `/audit`), non-standard endpoints

**Exports:**
- Routes files: `export default router`
- Controller files: named exports, one per handler
- Service files: named exports, one per operation
- Schema files: named exports (schemas + DTO types)
- Middleware files: named exports

## Middleware Chain

**Applied to all routes except `POST /api/auth/*` and `GET /api/system/**`:**

1. `authMiddleware` — verifies JWT token; throws 401 if invalid/missing
2. `sessionMiddleware` — enforces 20-min inactivity timeout; throws 401 if expired
3. `campMiddleware` — extracts camp from token; attaches to `req.camp`
4. `permissionMiddleware` — enforces permission-based access; throws 403 if missing

**Mounted in `src/index.ts`:**
```typescript
app.use('/api/camps', authMiddleware, sessionMiddleware, campMiddleware, campsRoutes);
```

## Security Patterns

- **JWT authentication** required on all routes except `auth/*` and `system/**`
- **Session timeout** after 20 minutes of inactivity (`src/middlewares/session.middleware.ts`)
- **Camp-scoped queries** — all data retrieval scoped to `req.camp.id`
- **Permission-based access** via `permissionMiddleware` (`src/middlewares/permission.middleware.ts`)
- **No client time trusted** — all date calculations use server time
- **Rate limiting** on admission endpoints (`src/middlewares/rateLimit.middleware.ts`)

## Python Conventions (ml-service/)

**Location:** `ml-service/` — separate FastAPI microservice (not integrated into Node.js codebase)

**Framework:** FastAPI with Pydantic models + scikit-learn DecisionTreeClassifier

**Naming:**
- Modules: `snake_case.py`
- Classes: `PascalCase`
- Functions: `snake_case`
- Constants: `UPPER_SNAKE`

**No Python tests exist.** No linter/formatter configuration.

---

*Convention analysis: 2026-05-17*

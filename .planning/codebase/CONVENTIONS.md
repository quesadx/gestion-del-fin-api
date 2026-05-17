# Coding Conventions

**Analysis Date:** 2026-05-17

## Naming Patterns

**Files:**
- `{module}.{type}.ts` — e.g., `permissions.controller.ts`, `permissions.service.ts`, `permissions.schema.ts`, `permissions.routes.ts`
- Middleware files: `{name}.middleware.ts` — e.g., `permission.middleware.ts`, `rateLimit.middleware.ts`
- Config: `eslint.config.js`, `jest.config.ts`, `tsconfig.json`
- Prisma schema: `prisma/schema.prisma`
- Constants: `src/shared/constants/{domain}.ts`

**Functions:**
- Controller handlers: `{action}{Module}Handler` (e.g., `createPermissionHandler`, `updateRoleHandler`, `getUsersHandler`). Some older modules use shorter names (e.g., `getCampsHandler`).
- Service functions: `{action}{Module}` (e.g., `createPermission`, `getRoles`, `createTransfer`), exported individually.
- Internal service helpers: `prepare{Module}{Action}Data`, `ensure{Resource}Exists`, `map{Role}`, `normalize{Permission}Ids`
- Middleware factories: `permissionMiddleware(required)`, `validate(schema)`, `admissionRateLimit` (constant export).

**Variables:**
- camelCase for locals and params: `campId`, `pageSize`, `effectiveLimit`, `permissionIds`
- UPPER_SNAKE for constants: `INACTIVITY_TIMEOUT_MS`, `SALT_ROUNDS`, `PERMISSIONS`, `ROLES`
- Prisma select objects: as-const objects, e.g., `userSelectWithoutPassword`, `roleSelect`

**Types:**
- PascalCase DTOs: `CreatePermissionDto`, `UpdateRoleDto`, `CreateTransferDto`, `LoginInput`
- Zod inferred types exported alongside schemas: `export type CreatePersonDto = z.infer<typeof createPersonSchema>`
- Prisma payload types: `Prisma.camp_transfersGetPayload<{ include: { ... } }>`
- Transaction types: `type TransferTransactionClient = Prisma.TransactionClient`

**Enums:**
- Zod enums for string statuses: `transferStatusEnum`, `expeditionStatusEnum`, `personStatusEnum`
- Permission constants as `as const` object with dot-delimited strings: `'camps.create'`, `'transfers.approve_source'`
- Role names as const tuple: `['system_admin', 'worker', 'resource_manager', 'travel_coordinator'] as const`

## Code Style

**Formatting:**
- Tool: Prettier (`.prettierrc`)
- semi: true, singleQuote: true, trailingComma: "all", printWidth: 100, tabWidth: 2
- Also available as ESLint rule via `eslint-plugin-prettier`

**Linting:**
- Tool: ESLint (`eslint.config.js`) with `@typescript-eslint/eslint-plugin` and `eslint-plugin-prettier`
- Rules: `prettier/prettier: error`, `@typescript-eslint/no-unused-vars: warn`, `@typescript-eslint/explicit-function-return-type: off`
- Ignored: `src/generated/prisma/**`

**Spell Checking:**
- Tool: cspell (`cspell.json`)
- Run: `npm run spell`
- Dictionary includes custom words (Spanish terms, Prisma relation names like `Tocamps`)

## Import Organization

**Order (observed across all modules):**
1. Express types: `import { Router, Request, Response } from 'express'`
2. Framework/validator imports: `import { z } from 'zod'`
3. Local controller imports: `import * as controller from './module.controller.js'`
4. Local schema imports: `import { createSchema, updateSchema } from './module.schema.js'`
5. Middleware: `import { validate } from '../../middlewares/validate.middleware.js'`
6. Shared schemas: `import { idParamsSchema, paginationQuerySchema } from '../../shared/schemas/http.schema.js'`
7. Permission middleware: `import { permissionMiddleware } from '../../middlewares/permission.middleware.js'`
8. Permission constants: `import { PERMISSIONS } from '../../shared/constants/permissions.js'`

**Path Aliases:**
- No path aliases configured. All imports use relative paths with `.js` extension (ESM).

## Controller/Service/Schema Patterns

### Schema Conventions

All modules follow a consistent Zod schema pattern in `{module}.schema.ts`:

```typescript
// Newer modules: use z.object wrapping for validate middleware
export const createPermissionSchema = z.object({
  name: permissionNameSchema,    // Reusable sub-schema
  description: permissionDescriptionSchema,
});
export const updatePermissionSchema = createPermissionSchema.partial();

// Older/alternate pattern: extra refine for update schemas
export const updateRoleSchema = createRoleSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// DTO exports
export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionDto = z.infer<typeof updatePermissionSchema>;
```

**Cross-field validation:** Use `.superRefine()` for complex validations:
- `src/modules/transfers/transfers.schema.ts` — `transferItemSchema.superRefine()` validates item_type-dependent required fields
- `src/modules/transfers/transfers.schema.ts` — `createTransferSchema.superRefine()` enforces business rules (no self-transfer, item type consistency, no duplicates)
- `src/modules/explorations/explorations.schema.ts` — validates date ordering

### Controller Conventions

Controllers are **thin** HTTP handlers. Key rules from `src/modules/permissions/permissions.controller.ts`, `src/modules/roles/roles.controller.ts`, `src/modules/users/users.controller.ts`:

```typescript
// Standard pattern — no try/catch, async errors bubble to global handler
export async function createPermissionHandler(req: Request, res: Response) {
  const result = await createPermission(req.body);
  return res.status(201).json(result);     // 201 for creates
}

export async function updatePermissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updatePermission(id, req.body);
  return res.json(result);                 // 200 (default)
}

export async function deletePermissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deletePermission(id);
  return res.status(204).send();           // 204 for deletes, no body
}

export async function getPermissionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getPermission(id);
  return res.json(result);
}

export async function getPermissionsHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getPermissions(page, pageSize);
  return res.json(result);
}
```

**Key controller rules:**
- Use `parseIdParam()` from `src/shared/utils/parseIdParam.ts` for all numeric IDs — validates positive integer, throws `AppError` on invalid
- Controllers **never catch exceptions** — errors bubble to `errorHandler` in `src/middlewares/error.middleware.ts`
- Cast `req` to `AuthenticatedRequest` when accessing `req.user` (tokens mapped by `authMiddleware`)
- Manual Zod re-parsing in controllers is an anti-pattern (seen in `admission.controller.ts` line 33: `reviewAdmissionSchema.parse(req.body)`) — validation middleware should handle this
- Default pagination: page=1, pageSize=20

### Service Conventions

Services contain business logic. Patterns from `src/modules/permissions/permissions.service.ts`, `src/modules/roles/roles.service.ts`, `src/modules/transfers/transfers.service.ts`:

```typescript
// 1. Check existence before update/delete
const permission = await prisma.permissions.findUnique({ where: { id } });
if (!permission) throw new AppError(`Permission not found: ${id}`, 404);

// 2. Try/catch Prisma operations for constraint violations
try {
  return await prisma.permissions.create({ data: ... });
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

**Internal helper naming conventions in services:**
- `prepare{Entity}CreateData` / `prepare{Entity}UpdateData` — shape DTO into Prisma input
- `ensure{Resource}Exists` — validate related entities, throw `AppError` on missing
- `map{Role}` — transform Prisma result with relations into API shape
- `normalizePermissionIds` — deduplicate arrays
- `buildNotes` — concatenate audit notes
- `apply{Resource/People}Transfer` — composite operations within transactions

### Route Conventions

All routes follow a consistent structure. Reference `src/modules/permissions/permissions.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Each route: JSDoc swagger comment → permissionMiddleware → validate → controller
/**
 * @openapi
 * /api/permissions:
 *   post:
 *     tags: [Permissions]
 *     summary: Create permission
 *     description: Creates a permission definition.
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  permissionMiddleware(PERMISSIONS.PERMISSIONS_CREATE),
  validate(z.object({ body: createPermissionSchema })),
  permissionsController.createPermissionHandler,
);

export default router;
```

**Validation patterns in routes:**
- Body-only: `validate(z.object({ body: createSchema }))`
- Params-only: `validate(z.object({ params: idParamsSchema }))`
- Query-only: `validate(z.object({ query: paginationQuerySchema }))`
- Combined: `validate(z.object({ params: idParamsSchema, body: updateSchema }))`
- Custom camp-scoped params: `validate(z.object({ params: z.object({ campId: z.coerce.number().int().positive() }), body: createAdmissionSchema }))`

**Nested routes:** `camps` module mounts people routes: `router.use('/:campId/people', peopleRoutes)` with `Router({ mergeParams: true })`.

## Rate Limiting

**NEW pattern** in `src/middlewares/rateLimit.middleware.ts`:

```typescript
import rateLimit from 'express-rate-limit';

export const admissionRateLimit = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 10,                     // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many admission requests, please try again later',
      statusCode: 429,
    },
  },
});
```

Applied as route-level middleware in `src/modules/admission/admission.routes.ts`:
```typescript
router.post(
  '/camps/:campId',
  permissionMiddleware(PERMISSIONS.ADMISSION_CREATE),
  validate(...),
  admissionRateLimit,    // rate limit AFTER validation but BEFORE controller
  admissionController.createAdmissionHandler,
);
```

Currently only used for admission endpoints. Named export pattern makes it reusable.

## Prisma Usage Patterns

**Client:** Single instance exported from `src/lib/prisma.ts`, using `@prisma/adapter-pg` with PostgreSQL adapter:
```typescript
const adapter = new PrismaPg({ connectionString: getConnectionUrl() });
export const prisma = new PrismaClient({ adapter });
```

**Select objects:** Define reusable `as const` select objects:
```typescript
// src/modules/users/users.service.ts
const userSelectWithoutPassword = {
  id: true, camp_id: true, role_id: true, session_version: true,
  username: true, is_active: true, last_activity: true, created_at: true,
} as const;

// src/modules/roles/roles.service.ts
const roleSelect = {
  id: true, name: true, description: true,
  role_permissions: {
    select: { permissions: { select: { id: true, name: true, description: true } } },
  },
} as const;
```

**Transaction pattern:** Used extensively across newer modules:
- `src/modules/roles/roles.service.ts` — create/update role with permission_ids in transactions
- `src/modules/transfers/transfers.service.ts` — transfer creation, approval, completion all use `prisma.$transaction`
- `src/modules/admission/admission.service.ts` — review + auto-create person in transaction
- Transaction clients typed as `Prisma.TransactionClient`

**Query optimization:**
- Parallel queries with `Promise.all()` for counts + records
- `findUnique({ where: { id }, select: { id: true } })` for existence checks (minimal data)
- `updateMany` with optimistic concurrency: `where: { id: userId, session_version: ... }` (session middleware)

**Soft delete:** `src/modules/users/users.service.ts` line 104-109 — `deleteUser` sets `is_active: false` and increments `session_version` rather than `prisma.users.delete()`.

## Error Handling Conventions

**AppError class** in `src/shared/utils/appError.ts`:
```typescript
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) { ... }
}
```

**Prisma error handlers** in `src/shared/utils/handlePrismaError.ts`:
```typescript
// handleUniqueConstraintError — P2002 → 409 AppError
// handleForeignKeyError — P2003 → 409 AppError
```

**Global error middleware** in `src/middlewares/error.middleware.ts` — last in Express chain:
- `AppError` → returns `{ error: { message, statusCode } }`
- `ZodError` → 400 with `error.issues` as details
- `PrismaClientKnownRequestError` → maps P2002 (409), P2003 (409), P2025 (404)
- Unknown → 500 (`'Internal Server Error'` in production, message leak in dev)
- Winston logging for unhandled errors

**Error from controllers:** Thrown by services via `throw new AppError(msg, code)`, caught by global handler. Controllers do not try/catch.

**Error codes reference:**
| Error | Code | Origin |
|-------|------|--------|
| Invalid/missing token | 401 | `auth.middleware` |
| Session timeout (20 min) | 401 | `session.middleware` |
| Insufficient permissions | 403 | `permission.middleware` |
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

**Usage:** Import shared `logger` from `src/logger/logger.ts`. Never create new instances. Log level via `LOG_LEVEL` env (default: "info").

## Comments

**JSDoc for Swagger:** All route files use `/** @openapi */` JSDoc blocks for swagger-jsdoc. These are inline API documentation, not code comments. Swagger config: `src/docs/swagger.ts` — OpenAPI 3.1.1, scans `./src/modules/**/*.routes.ts`.

**When to comment:**
- JSDoc on routes for API documentation (mandatory)
- `// cspell:ignore` pragmas for spell-check exceptions (e.g., `// cspell:ignore Toprofessions` in `people.service.ts`)
- Section divider comments in data/configuration files (e.g., `# ── Strong skills + good health → ACCEPTED ──` in `ml-service/data.py`)

**TODO markers:** Only one in the codebase: `src/shared/constants/camp-rules.ts` — `// TODO: implement` (entire file is a stub).

## Module Design

**Exports:**
- Routes files: `export default router`
- Controller files: named exports, one per handler
- Service files: named exports, one per operation
- Schema files: named exports (schemas + DTO types)
- Middleware files: named exports (factory functions or middleware instances)

**No barrel files** except `src/shared/types/index.ts` (re-exports `RoleName`).

**Module structure consistent across all 14 modules:**
```
src/modules/{name}/
  {name}.routes.ts       # Router, Zod validation, permissionMiddleware, Swagger JSDoc
  {name}.controller.ts   # Thin HTTP handlers
  {name}.service.ts      # Business logic, Prisma queries, error handling
  {name}.schema.ts       # Zod schemas + DTO types
```

**Modules that deviate:**
- `src/modules/system/` — has `system.service.ts` (server time) but simple routes, no full CRUD
- `src/modules/metrics/` — read-only dashboard endpoints, no create/update/delete, uses `permission.middleware` but no Zod validation on routes
- `src/modules/admission/` — uses custom `campId` params, rate limiting, AI integration
- `src/modules/inventory/` — custom routes (`/adjustment`, `/audit`), non-standard endpoints

## Python Conventions (ml-service/)

**Location:** `ml-service/` — separate FastAPI microservice (not integrated into Node.js codebase)

**Framework:** FastAPI with Pydantic models
- `main.py` — FastAPI app with lifespan handler for model training
- `decision_tree.py` — scikit-learn `DecisionTreeClassifier` wrapper as singleton
- `data.py` — synthetic training data generator (pandas DataFrame)
- `trainer.py` — standalone training/evaluation script

**Naming in Python:**
- Modules: `snake_case.py`
- Classes: `PascalCase` — `AdmissionRequest`, `AdmissionResponse`, `AdmissionDecisionTree`
- Functions: `snake_case` — `extract_features`, `detect_profession_category`, `get_training_data`
- Constants: `UPPER_SNAKE` — `FEATURE_NAMES`, `SKILL_KEYWORDS`, `DANGEROUS_HEALTH_KEYWORDS`

**API pattern:**
```python
@app.post("/evaluate", response_model=AdmissionResponse)
def evaluate(request: AdmissionRequest):
    try:
        result = admission_tree.predict(...)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Dependencies:** Listed in `requirements.txt` — fastapi, uvicorn, scikit-learn, pandas, numpy, pydantic
**Container:** `ml-service/Dockerfile` — Python 3.12-slim, pip install, uvicorn on port 8000

**No Python tests exist.** No linter/formatter configuration (no `pyproject.toml`, no `.pylintrc`, no `ruff.toml`).

---

*Convention analysis: 2026-05-17*

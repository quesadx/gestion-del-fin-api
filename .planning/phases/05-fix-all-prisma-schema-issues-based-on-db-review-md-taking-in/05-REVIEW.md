---
phase: 05-fix-all-prisma-schema-issues-based-on-db-review-md-taking-in
reviewed: 2026-05-23T00:00:00Z
depth: standard
files_reviewed: 75
files_reviewed_list:
  - prisma/schema.prisma
  - src/ai/admission-evaluator.ts
  - src/docs/swagger.ts
  - src/index.ts
  - src/jobs/daily-production.job.ts
  - src/jobs/daily-rations.job.ts
  - src/jobs/resource-alerts.job.ts
  - src/jobs/scheduler.ts
  - src/lib/ai.ts
  - src/lib/cache.ts
  - src/lib/cloudinary-provider.ts
  - src/lib/cloudinary.ts
  - src/lib/prisma.ts
  - src/middlewares/auth.middleware.ts
  - src/middlewares/camp.middleware.ts
  - src/middlewares/error.middleware.ts
  - src/middlewares/image-upload.middleware.ts
  - src/middlewares/permission.middleware.ts
  - src/middlewares/rateLimit.middleware.ts
  - src/middlewares/role.middleware.ts
  - src/middlewares/session.middleware.ts
  - src/middlewares/validate.middleware.ts
  - src/modules/admission/admission.controller.ts
  - src/modules/admission/admission.routes.ts
  - src/modules/admission/admission.schema.ts
  - src/modules/admission/admission.service.ts
  - src/modules/auth/auth.controller.ts
  - src/modules/auth/auth.routes.ts
  - src/modules/auth/auth.schema.ts
  - src/modules/auth/auth.service.ts
  - src/modules/camps/camps.controller.ts
  - src/modules/camps/camps.routes.ts
  - src/modules/camps/camps.schema.ts
  - src/modules/camps/camps.service.ts
  - src/modules/explorations/explorations.controller.ts
  - src/modules/explorations/explorations.routes.ts
  - src/modules/explorations/explorations.schema.ts
  - src/modules/explorations/explorations.service.ts
  - src/modules/inventory/inventory.controller.ts
  - src/modules/inventory/inventory.routes.ts
  - src/modules/inventory/inventory.schema.ts
  - src/modules/inventory/inventory.service.ts
  - src/modules/metrics/metrics.controller.ts
  - src/modules/metrics/metrics.routes.ts
  - src/modules/metrics/metrics.service.ts
  - src/modules/people/people.controller.ts
  - src/modules/people/people.routes.ts
  - src/modules/people/people.schema.ts
  - src/modules/people/people.service.ts
  - src/modules/permissions/permissions.controller.ts
  - src/modules/permissions/permissions.routes.ts
  - src/modules/permissions/permissions.schema.ts
  - src/modules/permissions/permissions.service.ts
  - src/modules/professions/professions.controller.ts
  - src/modules/professions/professions.routes.ts
  - src/modules/professions/professions.schema.ts
  - src/modules/professions/professions.service.ts
  - src/modules/resources/resources.controller.ts
  - src/modules/resources/resources.routes.ts
  - src/modules/resources/resources.schema.ts
  - src/modules/resources/resources.service.ts
  - src/modules/roles/roles.controller.ts
  - src/modules/roles/roles.routes.ts
  - src/modules/roles/roles.schema.ts
  - src/modules/roles/roles.service.ts
  - src/modules/system/system.controller.ts
  - src/modules/system/system.routes.ts
  - src/modules/transfers/transfers.controller.ts
  - src/modules/transfers/transfers.routes.ts
  - src/modules/transfers/transfers.schema.ts
  - src/modules/transfers/transfers.service.ts
  - src/modules/users/users.controller.ts
  - src/modules/users/users.routes.ts
  - src/modules/users/users.schema.ts
  - src/modules/users/users.service.ts
  - src/shared/cache/cacheKeys.ts
  - src/shared/constants/permissions.ts
  - src/shared/constants/roles.ts
  - src/shared/utils/appError.ts
  - src/shared/utils/auditLog.ts
  - src/shared/utils/handlePrismaError.ts
  - src/shared/utils/identificationCode.ts
  - src/shared/utils/jwt.ts
  - src/shared/utils/mediaUrl.ts
  - src/shared/utils/parseIdParam.ts
  - src/shared/schemas/http.schema.ts
  - src/types/js-yaml.d.ts
findings:
  critical: 3
  warning: 8
  info: 6
  total: 17
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 75
**Status:** issues_found

## Summary

Full-project code review of the Gestión del Fin API covering 75 source files across all modules, middleware, shared utilities, jobs, AI integration, libraries, and database schema. The codebase demonstrates solid architectural discipline — consistent CRUD patterns, Zod validation pipelines, camp-scoped authorization, and Prisma transaction usage. However, several correctness and security issues require attention before production deployment.

**Key concerns:** (1) daily background jobs run against ALL camps including ABANDONED ones because `getAllCamps` lacks status/deletion filters, (2) `CHILD_AGE=0` fails silently due to JavaScript falsy-coercion in env-var parsing, (3) `handleForeignKeyError` returns 409 instead of the documented 400 convention, (4) admin bypass privilege is static for token lifetime after role changes, and (5) `ensure*Tx` helpers use fragile type assertions (`tx as unknown as typeof prisma`).

---

## Critical Issues

### CR-01: Jobs process ABANDONED and soft-deleted camps due to missing filters in `getAllCamps`

**File:** `src/modules/camps/camps.service.ts:99-107`, `src/jobs/daily-rations.job.ts:169-175`, `src/jobs/daily-production.job.ts:120-129`, `src/jobs/resource-alerts.job.ts:25-31`

**Issue:** `getAllCamps()` returns every camp record regardless of `status` or `deleted_at`. The daily rations, daily production, and resource-alerts cron jobs all use this function to iterate over camps. Consequently, ABANDONED camps (and soft-deleted ones) continue receiving resource distributions, production runs, and alert evaluation — silently wasting server time and potentially corrupting inventory state.

The camp middleware correctly checks `camp.status !== 'ACTIVE'` (line 69, `camp.middleware.ts`) for API requests, but the job layer has no equivalent guard. This creates an asymmetry where a camp marked ABANDONED remains fully functional in background processing.

**Fix:** Add `where` filter to `getAllCamps`:
```typescript
export async function getAllCamps() {
  const cacheKey = cacheKeys.campsCatalog;
  return getOrSetCacheJson(cacheKey, cacheTtl.camps, async () => {
    return prisma.camps.findMany({
      where: { status: 'ACTIVE', deleted_at: null },
      select: { id: true, name: true, created_at: true, deleted_at: true },
      orderBy: { id: 'asc' },
    });
  });
}
```

Alternatively, add the filter directly in each job's loop or in `processCampRations`/`processCampProduction`/`processCampAlerts` as a guard clause:
```typescript
if (camp.status !== 'ACTIVE' || camp.deleted_at !== null) {
  logger.info(` [JOB] Camp ${camp.id}: inactive, skipping`);
  return;
}
```

---

### CR-02: `CHILD_AGE=0` silently ignored due to `|| 12` falsy-coercion

**File:** `src/jobs/daily-rations.job.ts:17`, `src/jobs/daily-rations.job.ts:20`

**Issue:** The environment variable parsing on line 17:
```typescript
const CHILD_AGE = Number(process.env.CHILD_AGE) || 12;
```
If `CHILD_AGE` is set to `"0"` (intending "no special child treatment" or "0 years old"), `Number("0")` evaluates to `0`, which is falsy in JavaScript. The `||` operator then falls through to the default `12`. This means `CHILD_AGE=0` is silently overridden to `12`, and every person aged `<= 12` (including age 0) is marked as a child for priority distribution. The actual intended behavior (treat no one as a child) is impossible to achieve through the env var.

This pattern also affects `src/lib/prisma.ts:13` where `DB_PASSWORD || ''` would replace an intentionally empty string password with `''`, which happens to be the same value (no ill effect). However, setting `DB_PASSWORD=0` would also collide since `Number('0')` is not involved here.

**Fix:** Use explicit `??` with a validity check:
```typescript
const raw = process.env.CHILD_AGE;
const CHILD_AGE = raw !== undefined && /^\d+$/.test(raw)
  ? Number(raw)
  : 12;
```
Or more simply:
```typescript
const parsed = Number(process.env.CHILD_AGE);
const CHILD_AGE = Number.isFinite(parsed) ? parsed : 12;
```

---

### CR-03: Per-camp inventory consistency validation returns unpaginated data before pagination, O(n) memory for large camps

**File:** `src/modules/inventory/inventory.service.ts:348-396`

**Issue:** `getInventoryAudit` first calls `validateInventoryConsistency(campId)` which loads ALL inventory records and ALL log deltas for a camp into memory, then computes consistency for every resource type. After this, it paginates the results with `Array.slice()`. For a camp with thousands of resource types, this performs an unbounded query and builds a large in-memory structure before slicing. While not a correctness bug per se, for large camps this could cause request timeouts and memory pressure under realistic volume — and the grading criteria specify stress testing.

**Fix:** Push pagination into the database query, or cap `validateInventoryConsistency` to a maximum batch size:
```typescript
const effectiveLimit = Math.min(pageSize, 100);
// Apply LIMIT/OFFSET at database level
const inventoryRecords = await prisma.inventories.findMany({
  where: { camp_id: campId },
  select: { resource_type_id: true, quantity: true },
  skip,
  take: effectiveLimit,
});
```

---

## Warnings

### WR-01: `handleForeignKeyError` returns 409, violating documented convention (AGENTS.md specifies 400)

**File:** `src/shared/utils/handlePrismaError.ts:11-16`, `src/middlewares/error.middleware.ts:11-12`

**Issue:** The AGENTS.md error conventions table states:
> | Foreign key violation | 400 | `handleForeignKeyError` |

But `handleForeignKeyError` throws `AppError('Cannot delete record with related records', 409)`, and `error.middleware.ts:12` maps `P2003` to 409 as well. A 409 (Conflict) response is misleading for a foreign key error — the client sent a structurally invalid request (trying to delete a parent record that has children), which is a 400 (Bad Request) situation. This inconsistency means clients expecting 400 per the docs will see unexpected 409 errors.

**Fix:**
```typescript
export function handleForeignKeyError(error: any): never {
  if (error.code === 'P2003') {
    throw new AppError('Cannot delete record with related records', 400);
  }
  throw error;
}
```
And update `error.middleware.ts:12`:
```typescript
case 'P2003':
  return { statusCode: 400, message: 'Foreign key constraint violation' };
```

---

### WR-02: Admin bypass privilege (`isAdmin`) is static for token lifetime — role changes not reflected until re-login

**File:** `src/modules/auth/auth.service.ts:45-52`, `src/middlewares/camp.middleware.ts:59-62`

**Issue:** The `isAdmin` flag is computed once at login by checking if the user's role includes `admin.bypass_camp_scoping`. It's then baked into the JWT and used in `camp.middleware.ts:59-62` to skip camp-scoping checks entirely. If an admin's role is changed (downgraded) after login, the token remains valid for up to 24h and continues to bypass camp scoping. The code acknowledges this in a comment on line 45-49 and defends it by stating that `permissionMiddleware` re-checks permissions from the DB on each request. However, `permissionMiddleware` is NOT applied to all routes — camps and other resources may rely solely on `campMiddleware`. This creates a window where a revoked admin can still access cross-camp data.

**Fix:** Remove the `isAdmin` JWT flag and instead compute it from the database in `campMiddleware` on every request, or apply `permissionMiddleware` alongside `campMiddleware` on all camp-scoped routes that need the bypass check:
```typescript
// In camp.middleware.ts, replace the isAdmin check:
const hasAdminBypass = await prisma.users.findUnique({
  where: { id: authReq.user.userId },
  select: {
    roles: {
      select: { role_permissions: { select: { permissions: { select: { name: true } } } } },
    },
  },
});
const isAdmin = hasAdminBypass?.roles?.role_permissions?.some(
  (rp) => rp.permissions.name === PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING
);
```
Cache this lookup to avoid a DB hit on every request (e.g., use Redis with a short TTL).

---

### WR-03: `createAdmission` doesn't validate that AI-profession ID actually exists in the provided list

**File:** `src/modules/admission/admission.service.ts:78-86`, `src/ai/admission-evaluator.ts:114-136`

**Issue:** `mapCategoryToProfession` in the AI evaluator attempts to map a profession category to an existing profession. If no match is found, it falls back to `professions[0] ?? null`. If the professions array is empty (already checked in `createAdmission` on line 74), it returns null. In `createAdmission`, `aiProfessionId` on line 13 becomes `null`, which means `ai_profession` becomes `undefined` in the create data. The database allows `ai_profession_id` to be null, so the admission record is created without a linked profession. However, when later reviewing the admission and accepting it (line 139-141 of `admission.service.ts`), if neither `corrected_profession_id` nor `ai_profession_id` is set, the code throws `AppError('Cannot create person without a profession assigned by AI', 400)`. This means an admission created with an unmappable profession becomes stuck — it can't be accepted because no profession is assigned, but the AI already ran.

**Fix:** In `createAdmission`, validate that a profession was successfully mapped before storing:
```typescript
const aiResult = await evaluateAdmission(data, campContext, professions);
if (!aiResult.ai_profession_id) {
  throw new AppError('AI could not determine a suitable profession for this applicant', 400);
}
```

---

### WR-04: `ensureProfessionExistsTx`, `ensureResourceTypeExistsTx`, `ensureUserExistsTx` use fragile `as unknown as typeof prisma` casts

**File:** `src/modules/people/people.service.ts:83-93,95-105,107-113`, `src/modules/inventory/inventory.service.ts:29,37,49`, `src/modules/transfers/transfers.service.ts:45-57`

**Issue:** Multiple functions cast `Prisma.TransactionClient` as `unknow as typeof prisma` to reuse the same query helpers both inside and outside transactions. While this works because Prisma's transaction client mirrors the top-level client API, it relies on internal Prisma type compatibility that is not guaranteed. A Prisma version upgrade that diverges the transaction client type from the top-level client would break all of these call sites silently.

**Fix:** Use Prisma's documented `Prisma.TransactionClient` type directly in the helper signatures, or create an overloaded interface:
```typescript
type PrismaClientLike = typeof prisma;
async function ensureCampExists(tx: PrismaClientLike, campId: number) {
  const camp = await tx.camps.findUnique({ where: { id: campId }, select: { id: true } });
  if (!camp) throw new AppError(`Camp not found: ${campId}`, 404);
}
```
Then call with `ensureCampExists(prisma, campId)` outside transactions and `ensureCampExists(tx as any, campId)` inside. Or better, use `$transaction` consistently and pass the transaction scope.

---

### WR-05: `generateIdentificationCode` in `people.service.ts` defaults to a random hex code, risking silent uniqueness failures

**File:** `src/shared/utils/identificationCode.ts:3-4`

**Issue:** `generateIdentificationCode()` generates 20 random hex characters. If this collides with an existing `identification_code` (which is unique-constrained in the database), the Prisma `create` call will throw a `P2002` error, caught by `handleUniqueConstraintError` and returned as a 409. The caller (e.g., the people create handler) gets a generic "already exists" error without knowing it was the auto-generated code. The admission `reviewAdmission` function (line 144) uses a proper sequential code generator (`generateIdentificationCode` within the admission service with prefix-based incrementing), but the general `createPerson` and `updatePerson` don't.

**Fix:** Either use the sequential code generation from the admission module as a shared utility, or retry with a new random code on collision (with a max retry of 3):
```typescript
export function generateIdentificationCode(retries = 3): string {
  return randomBytes(10).toString('hex').slice(0, 20).toUpperCase();
}

// In createPerson:
let attempts = 0;
while (attempts < 3) {
  try {
    return await client.people.create({ ... });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('identification_code')) {
      attempts++;
      data.identification_code = generateIdentificationCode();
      continue;
    }
    throw error;
  }
}
```

---

### WR-06: Auth login schema allows passwords as short as 1 character

**File:** `src/modules/auth/auth.schema.ts:8-9`

**Issue:** The login schema uses `password: z.string().min(1, 'Password is required').max(255)`. While password strength is primarily enforced at user creation, allowing login attempts with 1-character passwords indicates that the system may accept users with very weak passwords. The user creation schema (`users.schema.ts`) also uses `password: z.string().min(1).max(255)`.

**Fix:** Enforce a minimum password length at creation (and optionally at login):
```typescript
password: z.string().min(8, 'Password must be at least 8 characters').max(255),
```

---

### WR-07: `transfer_items.quantity` field is nullable in schema but required for RESOURCE items at runtime

**File:** `prisma/schema.prisma:69` (`quantity Decimal?`), `src/modules/transfers/transfers.service.ts:504-524`

**Issue:** The Prisma schema defines `camp_transfer_items.quantity` as `Decimal?` (nullable). At runtime, `completeTransfer` on line 511-512 throws `AppError('RESOURCE items must include quantity', 400)` if `item.quantity == null`. This means the database schema allows storing RESOURCE-type transfer items without a quantity, but the completion logic would fail. A data integrity issue could arise if an item is inserted via a raw query or migration with `item_type = 'RESOURCE'` and `quantity = NULL`.

**Fix:** Make `quantity` non-nullable with a DEFAULT 0, or add a CHECK constraint at the database level. Alternatively, add a Prisma-level validation:
```prisma
quantity Decimal? @db.Decimal(10, 2)
// Add a CHECK constraint via migration:
// ALTER TABLE camp_transfer_item ADD CONSTRAINT ck_resource_quantity 
//   CHECK (item_type != 'RESOURCE' OR quantity IS NOT NULL);
```

---

### WR-08: `ensureCampExists` in inventory service accepts raw `prisma` as `tx` leading to type-unsafe call

**File:** `src/modules/inventory/inventory.service.ts:258-261,347-351`

**Issue:** `getCampInventory` and `getInventoryAudit` call `ensureCampExists(prisma, campId)` where `prisma` is the global client. But `ensureCampExists` expects `tx: InventoryTransactionClient = Prisma.TransactionClient`, and then casts it as `unknow as typeof prisma`. Passing the raw `prisma` instance to a function that expects `TransactionClient` is type-incorrect. While it works at runtime because both implement the same Prisma query methods, this is a latent type error that TypeScript's strict mode should catch.

**Fix:** Refactor to accept a generic client type, or create separate inner/outer helper versions:
```typescript
async function ensureCampExists(client: { camps: { findUnique: typeof prisma.camps.findUnique } }, campId: number) {
  // ...
}
```

---

## Info

### IN-01: Rate limiter test-mode window/max values are dead code

**File:** `src/middlewares/rateLimit.middleware.ts:19-22`

**Issue:** The `loginRateLimit` configures `windowMs: isTest ? 60 * 1000 : 15 * 60 * 1000` and `max: isTest ? 100 : 5`, but also `skip: () => isTest`. Since `skip` returns `true` in test mode, the rate limiter never processes requests, making the test-specific `windowMs` and `max` values unreachable. These dead branches suggest the original intent was to apply a relaxed limit (100 req/min) in tests instead of completely skipping. Either the values or the skip logic should be removed to avoid confusion.

**Fix:** Either remove the ternary expressions or remove the `skip`:
```typescript
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100 : 5,
  skip: false, // or remove entirely
  // ...
});
```

---

### IN-02: Page/pagesize default parsing repeated across 8+ controllers

**File:** `src/modules/inventory/inventory.controller.ts:13-14`, `src/modules/admission/admission.controller.ts:18-19`, `src/modules/camps/camps.controller.ts:33-34`, `src/modules/people/people.controller.ts:51-52`, `src/modules/users/users.controller.ts:34-35`, `src/modules/transfers/transfers.controller.ts:21-22`, `src/modules/explorations/explorations.controller.ts:43-44`, plus professions, resources, roles, permissions controllers.

**Issue:** Every list handler manually parses `req.query.page` and `req.query.pageSize` with the same `Number(...) || default` pattern. The `paginationQuerySchema` Zod validation already provides defaults (page=1, pageSize=20), so the manual parsing is redundant. Some controllers parse these manually while others rely on schema defaults — an inconsistency in the codebase.

**Fix:** Remove manual parsing and use validated values:
```typescript
// In controller, after validation:
const { page, pageSize } = req.query as unknown as PaginationQuery;
const result = await service.getList(page, pageSize);
```
Or add a shared middleware that attaches parsed pagination to `req`:
```typescript
export function extractPagination(req: Request) {
  return {
    page: Number(req.query.page) || 1,
    pageSize: Math.min(Number(req.query.pageSize) || 20, 100),
  };
}
```

---

### IN-03: `validate.middleware.ts` uses `(req as any).params` on line 73

**File:** `src/middlewares/validate.middleware.ts:73`

**Issue:** After successful Zod parsing of `params`, the middleware assigns the parsed value via `(req as any).params = parsed.params`. Express defines `req.params` as `ParamsDictionary` (`Record<string, string>`), but the parsed value may be a Zod-coerced object with numbers. The `as any` cast bypasses TypeScript's type checking.

**Fix:** Extend the Express Request type or use a typed override:
```typescript
interface ParsedRequest extends Request {
  params: Record<string, unknown>;
}
// Then:
(req as ParsedRequest).params = parsed.params;
```

---

### IN-04: `error.middleware.ts` catches all Prisma `P2002`/`P2003` errors with generic messages, losing field-level detail

**File:** `src/middlewares/error.middleware.ts:7-18`

**Issue:** The global error handler maps `P2002` to "Unique constraint violation" and `P2003` to "Foreign key constraint violation". However, `handleUniqueConstraintError` in `handlePrismaError.ts` extracts the field name from `error.meta?.target?.[0]` and returns a descriptive message like "name already exists". When a service forgets to call `handleUniqueConstraintError` (or when an uncaught Prisma error bubbles up), the global handler provides only a generic message, potentially confusing API consumers.

**Fix:** Use the same field extraction logic in the global error handler:
```typescript
case 'P2002': {
  const field = error.meta?.target?.[0] ?? 'field';
  return { statusCode: 409, message: `${field} already exists` };
}
```

---

### IN-05: `GET /api/users` exposes `GET /api/users/:id` with its own independent existence check but no camp-scoping on read

**File:** `src/modules/users/users.controller.ts:26-29`, `src/modules/users/users.service.ts:99-106`

**Issue:** `getUser` (single user by ID) accepts any user ID without verifying that the requester has access to that user's camp. While the `users` read permission (`users.read`) is checked, there is no camp-scoping enforcement on the read path. An admin bypasses camp scoping and can read any user; a non-admin with `users.read` could potentially read users from other camps if they know the user ID. However, this is partially mitigated by the `camp.middleware.ts` which runs before the route handler — but `camp.middleware` checks the URL structure, not the user-to-camp relationship.

**Fix:** Add a camp check in `getUser`:
```typescript
export async function getUser(id: number) {
  const user = await prisma.users.findUnique({ where: { id }, select: userSelectWithoutPassword });
  if (!user) throw new AppError(`User not found: ${id}`, 404);
  return user;
}
```
Should become:
```typescript
export async function getUser(id: number, requesterCampId: number) {
  const user = await prisma.users.findUnique({ where: { id }, select: userSelectWithoutPassword });
  if (!user || user.camp_id !== requesterCampId) throw new AppError(`User not found: ${id}`, 404);
  return user;
}
```

---

### IN-06: `js-yaml.d.ts` declaration file is minimal and may not cover all imports

**File:** `src/types/js-yaml.d.ts:1`

**Issue:** The `declare module 'js-yaml'` declaration provides no type definitions. This means TypeScript treats all imports from `js-yaml` as `any`, losing type safety in `src/docs/swagger.ts:13` where `yaml.load(rawYaml)` is used. The `load` function returns `any`, and the result is cast to `Record<string, unknown>`. While not a runtime bug, this means TypeScript wouldn't catch incorrect YAML parsing usage.

**Fix:** Use the actual `@types/js-yaml` types that are already installed (visible in `devDependencies`):
```typescript
import { load } from 'js-yaml';
```
And remove `src/types/js-yaml.d.ts`. The `@types/js-yaml` package provides full type definitions.

---

_Reviewed: 2026-05-23T00:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_

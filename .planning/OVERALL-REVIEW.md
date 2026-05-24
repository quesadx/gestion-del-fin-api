---
phase: overall
reviewed: 2026-05-23T16:00:00Z
depth: standard
files_reviewed: 107
files_reviewed_list:
  - prisma/schema.prisma
  - src/ai/admission-evaluator.ts
  - src/docs/swagger.ts
  - src/jobs/daily-production.job.ts
  - src/jobs/daily-rations.job.ts
  - src/jobs/resource-alerts.job.ts
  - src/jobs/scheduler.ts
  - src/lib/ai.ts
  - src/lib/cache.ts
  - src/lib/cloudinary-provider.ts
  - src/lib/cloudinary.ts
  - src/lib/prisma.ts
  - src/logger/logger.ts
  - src/middlewares/auth.middleware.ts
  - src/middlewares/camp.middleware.ts
  - src/middlewares/error.middleware.ts
  - src/middlewares/image-upload.middleware.ts
  - src/middlewares/permission.middleware.ts
  - src/middlewares/rateLimit.middleware.ts
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
  - src/modules/metrics/metrics.schema.ts
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
  - src/modules/system/system.service.ts
  - src/modules/transfers/transfers.controller.ts
  - src/modules/transfers/transfers.routes.ts
  - src/modules/transfers/transfers.schema.ts
  - src/modules/transfers/transfers.service.ts
  - src/modules/users/users.controller.ts
  - src/modules/users/users.routes.ts
  - src/modules/users/users.schema.ts
  - src/modules/users/users.service.ts
  - src/shared/cache/cacheKeys.ts
  - src/shared/constants/camp-rules.ts
  - src/shared/constants/permissions.ts
  - src/shared/constants/roles.ts
  - src/shared/schemas/http.schema.ts
  - src/shared/types/index.ts
  - src/shared/utils/appError.ts
  - src/shared/utils/auditLog.ts
  - src/shared/utils/handlePrismaError.ts
  - src/shared/utils/identificationCode.ts
  - src/shared/utils/jwt.ts
  - src/shared/utils/mediaUrl.ts
  - src/shared/utils/parseIdParam.ts
  - src/shared/utils/server-time.ts
  - src/types/js-yaml.d.ts
findings:
  critical: 7
  warning: 12
  info: 6
  total: 25
status: issues_found
---

# Overall: Code Review Report

**Reviewed:** 2026-05-23T16:00:00Z
**Depth:** standard
**Files Reviewed:** 107
**Status:** issues_found

## Summary

Reviewed the entire codebase at standard depth: 107 TypeScript/Prisma source files spanning 15 modules, 8 middlewares, 3 jobs, 5 utility libraries, 6 shared utilities, the AI evaluator, Prisma schema, Swagger docs, and shared configuration. The architecture follows the documented Canon CRUD pattern well in most modules — controllers are thin, services own business logic, Zod validates input, and Prisma handles persistence.

However, several critical issues were found:

1. The **camp middleware** has a fundamental design defect: `extractCampIdFromUrl()` treats resource IDs (expedition IDs, profession IDs, transfer IDs, etc.) as camp IDs, causing incorrect 403 denials on ~20 endpoints.
2. The **daily-rations job** defaults to running every minute (not daily) with no concurrency guard, enabling overlapping executions that corrupt inventory counts.
3. A **TOCTOU race condition** in `createPerson` when called inside a transaction validates foreign keys outside the transaction boundary.
4. The **admission photo_url** validation is misaligned with the DB column size.
5. Jobs have **no overlap protection**, allowing concurrent inventory mutations from multiple cron invocations.

Multiple warnings around fragile type casts, redundant cross-camp validation, and missing bound checks are also documented below.

---

## Critical Issues

### CR-01: Camp middleware URL extraction treats resource IDs as camp IDs — blocks ~20 endpoints for non-admin users

**File:** `src/middlewares/camp.middleware.ts:53-72`

**Issue:** The `extractCampIdFromUrl()` function uses a regex that extracts ANY numeric ID from URL path segments and treats it as a camp ID. Only 4 of the 12 capture groups (`camps/(\d+)`, `inventory/audit/(\d+)`, `inventory/(\d+)`, `admission/camps/(\d+)`) actually extract camp IDs. The remaining 8 groups extract **resource-specific IDs** (expedition ID, profession ID, transfer ID, user ID, role ID, permission ID, etc.).

The middleware then compares this extracted number directly to `authReq.user.campId`. For routes like `GET /expeditions/5`, the extracted value is `5` (the expedition ID) — compared against the user's camp ID (e.g., `3`) — and the middleware returns 403 Forbidden even when expedition `5` belongs to camp `3`.

**Affected routes (all return 403 for legitimate non-admin requests):**

| Route Pattern | Extracted ID is actually... |
|---|---|
| `GET /expeditions/:id` | expedition ID |
| `PUT /expeditions/:id` | expedition ID |
| `PATCH /expeditions/:id/status` | expedition ID |
| `DELETE /expeditions/:id` | expedition ID |
| `GET /transfers/:id` | transfer ID |
| `PATCH /transfers/:id/schedule` | transfer ID |
| `PATCH /transfers/:id/approve-source` | transfer ID |
| `PATCH /transfers/:id/approve-target` | transfer ID |
| `PATCH /transfers/:id/complete` | transfer ID |
| `PATCH /transfers/:id/reject` | transfer ID |
| `GET /professions/:id` | profession ID (global, not camp-scoped) |
| `PUT /professions/:id` | profession ID (global) |
| `DELETE /professions/:id` | profession ID (global) |
| `GET /users/:id` | user ID |
| `PUT /users/:id` | user ID |
| `DELETE /users/:id` | user ID |
| `GET /roles/:id` | role ID (global) |
| `PUT /roles/:id` | role ID (global) |
| `DELETE /roles/:id` | role ID (global) |
| `GET /permissions/:id` | permission ID (global) |
| `PUT /permissions/:id` | permission ID (global) |
| `DELETE /permissions/:id` | permission ID (global) |
| `GET /metrics/dashboard` | no match → null → always 403 |
| `GET /metrics/resources` | no match → null → always 403 |
| `GET /metrics/people` | no match → null → always 403 |
| `GET /metrics/expeditions` | no match → null → always 403 |

**Impact:** Non-admin users cannot access ANY resource by ID or ANY metrics endpoint. All `*_READ`, `*_UPDATE`, `*_DELETE` permissions are **dead code** for the affected modules. The only way non-admin users can work is through admin bypass (`admin.bypass_camp_scoping`), which defeats the purpose of role-based access control.

**Root cause:** The regex at line 55-57 treats every numeric segment in these URLs as a camp identifier, but only `camps`, `inventory`, and `admission/camps` routes actually contain a camp ID in the URL.

**Fix:** Remove all non-camp-ID routes from `extractCampIdFromUrl()`. Only keep the patterns that genuinely contain a camp ID in the URL (`camps/(\d+)`, `inventory/(\d+)`, `inventory/audit/(\d+)`, `admission/camps/(\d+)`). For all other routes, the camp check should either be skipped or performed by querying the resource's `camp_id` from the database:

```typescript
function extractCampIdFromUrl(url: string): number | null {
  const pathOnly = url.split('?')[0];
  // Only match paths that genuinely embed a camp ID
  const match = pathOnly.match(
    /\/(?:camps\/(\d+)|inventory\/audit\/(\d+)|inventory\/(\d+)|admission\/camps\/(\d+))(?:\/|$)/
  );
  if (!match) return null;
  return Number(match[1] || match[2] || match[3] || match[4]) || null;
}
```

---

### CR-02: Daily rations job defaults to every-minute cron, enabling overlapping inventory corruption

**File:** `src/jobs/scheduler.ts:7`

**Issue:** The default cron expression for daily rations is `* * * * *` (every minute) instead of a daily schedule (e.g., `0 6 * * *`). This causes:

1. The "daily" rations job runs every 60 seconds.
2. No concurrency guard exists — `node-cron` does not prevent overlapping executions. If processing 100 camps takes >60s, a second invocation starts, both reading stale inventory snapshots and calling `consumeInventoryWithLog` with overlapping `updateMany` operations.
3. With each run consuming from the same inventory pool, rations are repeatedly distributed until inventory is exhausted. Every subsequent run then fails with "Insufficient inventory" errors, flooding logs.
4. The `fullPortions` calculation at `daily-rations.job.ts:105` reads `available` BEFORE the transaction — a concurrent run can invalidate this calculation between the read and the atomic `updateMany`.

**Fix:** Change the default to a daily schedule and add a running-state guard:

```typescript
// scheduler.ts line 7 — change default to once per day
const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '0 6 * * *';

// Add overlap protection
let dailyRationsRunning = false;

dailyRationsTask = cron.schedule(DAILY_RATIONS_CRON, async () => {
  if (dailyRationsRunning) {
    logger.warn('[JOB] Daily rations already running, skipping');
    return;
  }
  dailyRationsRunning = true;
  try {
    logger.info('[JOB] Starting daily rations job');
    await dailyRationsJob.execute();
    logger.info('[JOB] Daily rations job finished');
  } catch (error) {
    logger.error('[JOB] Daily rations job failed', error);
  } finally {
    dailyRationsRunning = false;
  }
});
```

---

### CR-03: No concurrency guard on any cron job — overlapping executions cause inventory race conditions

**File:** `src/jobs/scheduler.ts` (all 3 jobs, lines 20-57)

**Issue:** None of the three cron jobs have any mechanism to prevent overlapping executions. `node-cron` provides no built-in overlap protection. With the current default cron of every minute (CR-02), the daily-rations job is almost guaranteed to have overlapping runs in production. This creates concurrent database transactions reading the same inventory snapshots and attempting to consume the same resources.

The `updateMany` with `{ gte: quantity }` guard in `consumeInventoryWithLog` catches the final atomic check, but:
- The `fullPortions = Math.floor(available / perPersonNeed)` calculation at line 105 of `daily-rations.job.ts` is done using `available` which was read before the transaction. A concurrent run invalidates this.
- The `selectedRecipientIds` slice at line 113 is also based on the stale `fullPortions`.
- Both overlapping runs distribute to potentially overlapping subsets of people, but the second run sees reduced inventory and may partially distribute or throw.

**Fix:** Add a module-level `running` flag for each job (see CR-02 fix pattern). For distributed deployments, use a Redis-based distributed lock.

---

### CR-04: TOCTOU race condition in `createPerson` — foreign key validation uses global prisma outside transaction

**File:** `src/modules/people/people.service.ts:172`

**Issue:** When `createPerson` is called with a transaction client `tx` (as it is from `admission.service.ts:157` during `reviewAdmission`), the `validateRelations` call uses the **global** `prisma` client instead of `tx`:

```typescript
export async function createPerson(campId: number, data: CreatePersonDto, tx?: TransactionClient) {
  if (data.camp_id !== campId) { ... }
  await validateRelations({ camp_id: campId, profession_id: data.profession_id });
  // ^^ validateRelations uses global prisma (lines 130-137 call ensureCampExists / ensureProfessionExists
  //    which use prisma.camps.findUnique / prisma.professions.findUnique — NOT tx)
  const client = tx ?? prisma;
  // ...
  return await client.people.create({ ... });  // uses tx — different connection!
}
```

This creates a TOCTOU race:
1. `validateRelations` checks profession exists via global `prisma` (outside transaction).
2. Between the check and the actual `people.create`, another concurrent operation deletes the profession.
3. `people.create` throws `Prisma.PrismaClientKnownRequestError` with code `P2003` (FK violation).
4. The `handleUniqueConstraintError` on line 197 only catches `P2002` — P2003 propagates unhandled.
5. The admission review transaction in `admission.service.ts:133` rolls back, and the error surfaces as a 500 to the client.

**Fix:** Pass `tx` through to validation functions when available:

```typescript
async function validateRelations(
  data: Partial<Pick<CreatePersonDto, 'camp_id' | 'profession_id'>>,
  tx?: Prisma.TransactionClient,
) {
  if (data.camp_id !== undefined) {
    await ensureCampExists(data.camp_id, tx);
  }
  if (data.profession_id !== undefined) {
    await ensureProfessionExists(data.profession_id, tx);
  }
}

async function ensureProfessionExists(professionId: number, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const profession = await client.professions.findUnique({
    where: { id: professionId },
    select: { id: true },
  });
  if (!profession) throw new AppError(`Profession not found: ${professionId}`, 404);
}
```

---

### CR-05: Admission `photo_url` Zod validation (max 255) mismatches DB column (VarChar 500)

**File:** `src/modules/admission/admission.schema.ts:22`

**Issue:** The Zod schema validates `photo_url` with `.max(255)` but the Prisma schema defines `@db.VarChar(500)` at line 32 of `schema.prisma`. A valid Cloudinary/Multer photo URL between 256-500 characters will be:
- Rejected by Zod middleware with a confusing 400 validation error
- Accepted by the database without issue if inserted directly
- Inconsistent with `id_card_url` on line 23 which correctly uses `.max(500)` matching the DB

**Fix:** Align Zod max with DB column:

```typescript
photo_url: z.url().max(500).optional(),
```

---

### CR-06: Fire-and-forget `auditLog` may lose records without caller awareness

**File:** `src/shared/utils/auditLog.ts:15-29`

**Issue:** The `auditLog()` function fires a Prisma `create` without `await` or returning the promise. Errors are caught and logged via Winston but silently swallowed. This means:
- If the database connection pool is exhausted or the DB is unreachable, audit records are silently lost.
- Callers have no way to know the audit log was not written.
- During graceful shutdown, in-flight audit writes may be terminated mid-write.
- Audit trail integrity cannot be guaranteed — a core project requirement ("Audit Trail — Log user actions for security review").

**Fix:** Make audit logging awaitable and fire it alongside the response without blocking:

```typescript
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: params.userId,
        camp_id: params.campId,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (err: unknown) {
    logger.error('Audit log write failed', { error: err, ...params });
    // Re-throw in production so ops know audit is broken
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }
}

// In services, fire without blocking response:
// auditLog({...}).catch((err) => logger.error('Audit log failed', err));
```

---

### CR-07: `handleForeignKeyError` throws 400 on delete but should return 409 Conflict

**File:** `src/shared/utils/handlePrismaError.ts:12`

**Issue:** Prisma error code P2003 (foreign key constraint violation) is mapped to HTTP 400 in both `handleForeignKeyError` and the global error middleware (`error.middleware.ts:12`). The correct HTTP status for a constraint conflict is **409 Conflict**, consistent with `handleUniqueConstraintError` which correctly returns 409. A 400 implies "bad request — fix your input" while 409 means "conflict with current state — the record can't be deleted because it has dependents."

This affects `deleteCamp`, `deleteProfession`, `deletePerson`, `deleteRole`, `deletePermission`, `deleteResource` — all return 400 instead of 409.

**Fix:** 

```typescript
// handlePrismaError.ts
export function handleForeignKeyError(error: any): never {
  if (error.code === 'P2003') {
    throw new AppError('Cannot delete record with related records', 409);
  }
  throw error;
}

// error.middleware.ts line 12 — also fix the global handler
case 'P2003':
  return { statusCode: 409, message: 'Foreign key constraint violation' };
```

---

## Warnings

### WR-01: People without recorded age skip child priority in ration distribution

**File:** `src/jobs/daily-rations.job.ts:20`

**Issue:** `isChild()` requires `typeof person.age === 'number'` to return true. The `people.age` field is nullable (`Int?` in schema.prisma line 283). A person with `age: null` will never be treated as a child, losing priority food distribution. Actual children whose age was simply not recorded could starve while lower-priority adults eat.

**Fix:** Treat unknown ages conservatively:

```typescript
function isChild(person: PersonWithProfession) {
  return person.age == null || person.age <= CHILD_AGE;
}
```

---

### WR-02: Non-admin users with CAMPS_READ and METRICS_* permissions can never access the endpoints

**File:** `src/middlewares/camp.middleware.ts:101-116`

**Issue:** When `req.params.campId` is undefined and `extractCampIdFromUrl()` returns null (because the URL has no camp ID), the middleware throws 403 for non-admin users. This blocks:

- `GET /camps` — no camp ID in URL, blocked (CAMPS_READ is dead code for non-admins)
- `GET /metrics/dashboard` — no numeric match in URL → null → 403
- `GET /metrics/resources`, `/metrics/people`, `/metrics/expeditions` — same

The metrics permissions (`METRICS_DASHBOARD`, `METRICS_RESOURCES`, `METRICS_PEOPLE`, `METRICS_EXPEDITIONS`) are completely unusable by non-admin users due to the camp middleware gate.

**Fix:** Allow URLs that don't contain a camp ID to pass through (the service layer handles scoping):

```typescript
// In camp.middleware.ts, after the null check:
if (requestedCampIdFromUrl === null) {
  return next(); // No camp-specific URL, let service layer handle scoping
}
```

---

### WR-03: Global `as unknown as typeof prisma` casts bypass type safety throughout transfer service

**File:** `src/modules/transfers/transfers.service.ts` (lines 395-398, 444-447, 492, 585)

**Issue:** Multiple functions pass the global `prisma` client as a `TransferTransactionClient` using `prisma as unknown as TransferTransactionClient`. This is done to call ensure-functions (like `ensureUserExists`) before starting a `$transaction`. While functionally correct at runtime, this:
1. Completely bypasses TypeScript's type system.
2. Makes the code misleading — it appears transactional but is not.
3. Creates maintenance risk if `PrismaClient` and `TransactionClient` signatures diverge.

**Fix:** Restructure to call `ensureUserExists` using the global prisma directly without the type cast, or inline the checks:

```typescript
// Instead of casting, use prisma directly for pre-transaction checks
const actor = await prisma.users.findUnique({ where: { id: actorUserId } });
if (!actor) throw new AppError('User not found', 404);
```

---

### WR-04: TypeScript-unsafe casts appear in 8+ locations in explorations service

**File:** `src/modules/explorations/explorations.service.ts` (lines 100, 112, 143, 179, 261, 366, 472, 648)

**Issue:** Every function accepting `Prisma.TransactionClient` immediately casts via `const client = tx as unknown as typeof prisma;`. The same pattern appears in people and inventory services. `Prisma.TransactionClient` already extends the same model accessors as `PrismaClient` — the casts are unnecessary and suppress real type errors.

**Fix:** Use `tx` directly without casting:

```typescript
export async function handleResourceOutflow(
  tx: Prisma.TransactionClient,
  input: { ... }
) {
  const inventoryRows = await tx.inventories.findMany({ ... });
  // No cast needed — TransactionClient has identical method signatures
}
```

---

### WR-05: `scheduleTransferDelivery` and `ensureScheduledDeliveryDateForApproval` use `Date.now()` without normalization for date-only comparisons

**File:** `src/modules/transfers/transfers.service.ts:134,365`

**Issue:** Both functions compare `date.getTime() < Date.now()` to validate that the scheduled delivery date is not in the past. If `scheduled_delivery_date` was stored as a date-only value without time (midnight UTC, e.g., `2026-05-23T00:00:00.000Z`) and the current time is past midnight, a legitimate "today" date like `2026-05-23` is rejected as being in the past.

**Fix:** Normalize to start-of-day before comparing:

```typescript
function isPastDate(date: Date): boolean {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() < startOfToday.getTime();
}
```

---

### WR-06: `createPersonHandler` doesn't sign media URLs in the response

**File:** `src/modules/people/people.controller.ts:19`

**Issue:** All other people handlers wrap responses with `signMediaUrls(result, authReq.user?.exp)`, but `createPersonHandler` returns `res.status(201).json(result)` without signing. If the person was created with a `photo_url`, the unsigned URL is returned with a temporary Cloudinary token that may expire before the client uses it.

**Fix:**

```typescript
export async function createPersonHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const result = await createPerson(campId, req.body);
  return res.status(201).json(signMediaUrls(result, (req as AuthenticatedRequest).user?.exp));
}
```

---

### WR-07: `last_activity` and `created_at` are client-settable in user create/update schemas

**File:** `src/modules/users/users.schema.ts:9-10`

**Issue:** The `CreateUserSchema` and `UpdateUserSchema` include `last_activity` and `created_at` as optional input fields. A client or internal caller could set `last_activity` to a future date to bypass the 20-minute session inactivity timeout, or backdate `created_at` for audit trail manipulation. These timestamps should be server-controlled.

**Fix:** Strip client-settable timestamp fields from Zod schemas:

```typescript
export const CreateUserSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(8).max(255),
  camp_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  is_active: z.boolean().optional(),
  // last_activity and created_at removed — server-controlled
});
```

---

### WR-08: `getUsers` uses fragile `campId=0` sentinel for admin scope

**File:** `src/modules/users/users.controller.ts:36` / `src/modules/users/users.service.ts:112`

**Issue:** The admin check relies on `0` being falsy in JavaScript: `const where = campId ? { camp_id: campId } : {};`. If the service logic is refactored to `campId !== undefined`, admin lookups silently break because `0 !== undefined` is true, producing `WHERE camp_id = 0` which returns zero results.

**Fix:** Use `undefined` for the admin sentinel:

```typescript
// Controller
const campId = authReq.user.isAdmin ? undefined : authReq.user.campId;

// Service
const where = campId !== undefined ? { camp_id: campId } : {};
```

---

### WR-09: Expedition schema does not validate that `departure_date` is in the future

**File:** `src/modules/explorations/explorations.schema.ts:35-46`

**Issue:** The `createExplorationSchema` validates date ordering (`departure <= expected <= max`) but does not require `departure_date` to be in the future. This allows creating expeditions that started in the past, which can cause:
- Negative `days_elapsed` in metrics (partially guarded by `> 0` check at `metrics.service.ts:184`)
- Resource consumption deductions for expeditions that technically started in the past
- Status transitions that don't make chronological sense

**Fix:** Add a refinement for future dates:

```typescript
export const createExplorationSchema = explorationBaseSchema
  .superRefine((data, ctx) => {
    // ...existing checks...
    const departureDate = new Date(data.departure_date);
    if (departureDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: 'custom',
        path: ['departure_date'],
        message: 'departure_date must not be in the past (24h tolerance for clock skew)',
      });
    }
  });
```

---

### WR-10: `handleForeignKeyError` error message is generic, doesn't identify the constraint

**File:** `src/shared/utils/handlePrismaError.ts:13`

**Issue:** The message `'Cannot delete record with related records'` is generic. Users who get a 400 (should be 409, see CR-07) deleting a camp or profession have no way to know which dependent records are blocking the operation.

**Fix:** Include the Prisma field_name from error metadata:

```typescript
export function handleForeignKeyError(error: any): never {
  if (error.code === 'P2003') {
    const field = error.meta?.field_name ?? 'a related record';
    throw new AppError(`Cannot delete: ${field} has dependent records`, 409);
  }
  throw error;
}
```

---

### WR-11: `aiDecisionEnum` missing `PENDING` value present in DB enum

**File:** `src/modules/admission/admission.schema.ts:4`

**Issue:** The Zod `aiDecisionEnum` only allows `['ACCEPTED', 'REJECTED']` but the database enum `admission_requests_ai_decision` includes `PENDING`. While the AI evaluator only returns ACCEPTED/REJECTED (so Zod parse succeeds), if the AI is extended or a manual path sets AI decision to PENDING, the `admissionAIResultSchema` parse at line 162 of `admission-evaluator.ts` will throw a ZodError, crashing the admission creation.

**Fix:** Add `PENDING` to the enum for consistency with the DB schema:

```typescript
export const aiDecisionEnum = z.enum(['ACCEPTED', 'REJECTED', 'PENDING']);
```

---

### WR-12: Validate middleware coerces multipart form values but loses original string types

**File:** `src/middlewares/validate.middleware.ts:16-27`

**Issue:** The `coerceMultipartValues` function uses regex-based coercion that can produce incorrect types:
- `"000"` → becomes `0` via `parseInt("000", 10)` — a three-digit code becomes a single digit
- `"1.0"` → passes float regex, becomes `1` via `parseFloat("1.0")` — expected float becomes integer
- Strings starting with `0` like `"0123"` are parsed as integer `123` (leading zero stripping)

For form fields that are intentionally string-typed but match the numeric patterns (e.g., a zip code `"01234"`, phone prefix `"01"`), this coercion silently loses data.

**Fix:** Only coerce when the target schema expects a number/boolean, or skip coercion for fields with Zod string schemas:

```typescript
// Less invasive approach: mark coerced values
if (/^-?\d+$/.test(trimmed)) {
  out[key] = Number.parseInt(trimmed, 10);
  // Record original for fields that Zod expects as strings
  if (!Number.isNaN(Number(trimmed))) {
    out[`${key}_raw`] = val;
  }
  continue;
}
```

---

## Info

### IN-01: `camp-rules.ts` is a stub with only a TODO comment

**File:** `src/shared/constants/camp-rules.ts:1`

**Issue:** The file contains only `// TODO: implement`. No runtime defaults or camp rules are defined. If any module imports this, it will import an empty export.

**Suggestion:** Either implement with default camp capacity/constraint values or remove the file if not needed.

---

### IN-02: `js-yaml.d.ts` type declaration is empty

**File:** `src/types/js-yaml.d.ts:1`

**Issue:** The declaration `declare module 'js-yaml';` enables TypeScript to import `js-yaml` without types but provides no type information. The package has official `@types/js-yaml` available. The swagger module uses `yaml.load()` without any type safety.

**Suggestion:** Install `@types/js-yaml` and remove this manual declaration:

```bash
npm install --save-dev @types/js-yaml
```

---

### IN-03: Swagger docs silently degrade when YAML file is not found

**File:** `src/docs/swagger.ts:15`

**Issue:** If `openapi.yaml` is missing, the catch block logs a warning via `console.warn` (not the shared logger) and sets `swaggerSpec` to an empty object. Downstream consumers get a spec without any routes. The issue is silent in production.

**Suggestion:** Use the shared logger and provide a clear error indicator:

```typescript
import { logger } from '../logger/logger.js';
// ...
logger.warn('OpenAPI spec not found, swagger UI will be empty', { path: yamlPath });
```

---

### IN-04: `getAllCamps` selects `deleted_at` but filters on it in WHERE

**File:** `src/modules/camps/camps.service.ts:104`

**Issue:** The `select` includes `deleted_at` despite the `where` clause already filtering `deleted_at: null`. The field is redundant in the response since it will always be `null`.

**Suggestion:** Remove `deleted_at` from the select for cleaner output:

```typescript
select: { id: true, name: true, created_at: true },
```

---

### IN-05: Regex-laden URL extraction in camp middleware is hard to maintain

**File:** `src/middlewares/camp.middleware.ts:55-57`

**Issue:** The 500+ character regex with 12 capture groups is fragile and hard to understand. Each addition of a new camp-scoped route requires updating the regex. Any misalignment between the regex groups and the fallback ordering of `match[1]` through `match[12]` (lines 59-71) causes silent misclassification.

**Suggestion:** Replace the monolithic regex with a route table:

```typescript
const CAMP_ID_ROUTES: Array<{ pattern: RegExp; group: number }> = [
  { pattern: /\/(?:camps)\/(\d+)/, group: 1 },
  { pattern: /\/(?:inventory)\/audit\/(\d+)/, group: 2 },
  { pattern: /\/(?:inventory)\/(\d+)/, group: 3 },
  { pattern: /\/(?:admission)\/camps\/(\d+)/, group: 4 },
];

function extractCampIdFromUrl(url: string): number | null {
  const pathOnly = url.split('?')[0];
  for (const { pattern } of CAMP_ID_ROUTES) {
    const match = pathOnly.match(pattern);
    if (match) return Number(match[1]) || null;
  }
  return null;
}
```

---

### IN-06: `addPerson` function comment has typo (`Toprofessions`)

**File:** `src/modules/people/people.service.ts:4`

**Issue:** Line 4 has a spell-check ignore comment for an apparent typo in the Prisma generated namespace import on line 17: `// cspell:ignore Toprofessions`. The import `from '../../generated/prisma/internal/prismaNamespace.js'` is unusual — most Prisma clients export `Prisma.TransactionClient` from the main client. This import path may break on Prisma version upgrades.

**Suggestion:** Use `Prisma.TransactionClient` from the main Prisma client import instead:

```typescript
import { Prisma } from '../../generated/prisma/client.js';
// Use Prisma.TransactionClient directly
```

---

_Reviewed: 2026-05-23T16:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_

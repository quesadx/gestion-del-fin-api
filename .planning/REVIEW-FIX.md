---
phase: code-review
fixed_at: "2026-05-23T22:00:00Z"
review_path: .planning/REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase code-review: Code Review Fix Report

**Fixed at:** 2026-05-23T22:00:00Z
**Source review:** .planning/REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (CR-01, WR-01 through WR-07, IN-01 through IN-05)
- Fixed: 13
- Skipped: 0
- Intentionally excluded (per configuration): CR-02 (daily rations cron default), CR-03 (image upload MIME filter)

## Fixed Issues

| Finding | Title | Files Modified | Commit |
|---------|-------|---------------|--------|
| CR-01 | Stale JWT isAdmin flag bypass | `camp.middleware.ts`, `users.controller.ts`, `inventory.controller.ts` | `2178249` |
| WR-01 | roleMiddleware never applied | `role.middleware.ts` (deleted) | `5f7bfb1` |
| WR-02 | Inconsistent 401/403 codes | `permission.middleware.ts` | `505bf5b` |
| WR-03 | Dashboard global resource_types count | `metrics.service.ts` | `6797cc3` |
| WR-04 | Aggressive multipart coercion | `validate.middleware.ts`, `admission.schema.ts` | `621fd09` |
| WR-05 | Cache connection leak | `cache.ts` | `19d7303` |
| WR-06 | Redundant DB queries | `permission.middleware.ts` | `2bf121a` |
| WR-07 | Unstructured error logging | `inventory.service.ts` | `b535290` |
| IN-01 | Typo: prepareProfessionalUpdateData | `professions.service.ts` | `cf23a79` |
| IN-02 | camp-rules.ts placeholder | `camp-rules.ts` | `0f0c1f7` |
| IN-03 | Errors when headers already sent | `error.middleware.ts` | `b67cedc` |
| IN-04 | Redundant deleted_at select | `camps.service.ts` | `03b68d3` |
| IN-05 | Duplicate Zod parse | `admission.controller.ts` | `e59e5c5` |

### CR-01: Stale `isAdmin` JWT flag enables camp-scoping bypass after permission revocation

**Files modified:** `src/middlewares/camp.middleware.ts`, `src/modules/users/users.controller.ts`, `src/modules/inventory/inventory.controller.ts`
**Commit:** `2178249`
**Applied fix:** campMiddleware now attaches `_hasAdminBypass` to the request object after verifying admin bypass from the database (not the stale JWT payload). Both `users.controller.ts` (`getUsersHandler`) and `inventory.controller.ts` (`manualAdjustmentHandler`) now read this DB-verified flag instead of trusting `authReq.user.isAdmin`. This eliminates the 24-hour exploit window where a de-admined user could bypass camp scoping until their JWT expires.

### WR-01: `roleMiddleware` is defined but never applied to any route

**Files modified:** `src/middlewares/role.middleware.ts` (deleted)
**Commit:** `5f7bfb1`
**Applied fix:** Removed the unused `role.middleware.ts` file. All routes use `permissionMiddleware` for granular access control; the role-based middleware was dead code with no importers anywhere in the codebase.

### WR-02: Inconsistent HTTP status codes for inactive user / camp mismatch

**Files modified:** `src/middlewares/permission.middleware.ts`
**Commit:** `505bf5b`
**Applied fix:** Changed the inactive user / camp mismatch check from `401 (Unauthorized)` to `403 (Forbidden)` in `permission.middleware.ts`. Per HTTP semantics, an inactive user with a valid JWT is authenticated but not authorized — 403 is correct.

### WR-03: `GET /api/metrics/dashboard` returns global `resource_types` count instead of per-camp

**Files modified:** `src/modules/metrics/metrics.service.ts`
**Commit:** `6797cc3`
**Applied fix:** Scoped `prisma.resource_types.count()` to filter by `inventories: { some: { camp_id: campId } }`, so the dashboard now shows only resource types relevant to the current camp, consistent with all other dashboard metrics.

### WR-04: `validate.middleware.ts` coercion of multipart strings may break Zod string validation

**Files modified:** `src/middlewares/validate.middleware.ts`, `src/modules/admission/admission.schema.ts`
**Commit:** `621fd09`
**Applied fix:** Removed the blanket `coerceMultipartValues` function from `validate.middleware.ts`. Updated `createAdmissionSchema` to use `z.coerce.number().int()` for `applicant_age` so multipart form data is handled declaratively by Zod instead of pre-validation string coercion.

### WR-05: `cache.ts` `closeCache()` may leak the Redis connection on shutdown failure

**Files modified:** `src/lib/cache.ts`
**Commit:** `19d7303`
**Applied fix:** Added a forced `client!.disconnect()` call in the `closeCache()` catch block, wrapped in its own try/catch. This ensures the Redis connection is terminated even when `client.quit()` fails, preventing file descriptor leaks.

### WR-06: `role.middleware.ts` queries DB on every request but `permission.middleware.ts` already does so

**Files modified:** `src/middlewares/permission.middleware.ts`
**Commit:** `2bf121a`
**Applied fix:** `permissionMiddleware` now attaches resolved permission names to `req._resolvedPermissions` after the DB query, enabling subsequent middleware to reuse the cached data without issuing duplicate Prisma queries.

### WR-07: `logger.error(error)` called with raw error object as second argument (not structured)

**Files modified:** `src/modules/inventory/inventory.service.ts`
**Commit:** `b535290`
**Applied fix:** Replaced the two-line unstructured `logger.error` calls in `logLowResourceAlerts` with a single structured log entry: `logger.error(message, { error: String(error), campId })`. Consistent with the pattern used in `error.middleware.ts`.

### IN-01: Typo in function name — `prepareProfessionalUpdateData`

**Files modified:** `src/modules/professions/professions.service.ts`
**Commit:** `cf23a79`
**Applied fix:** Renamed `prepareProfessionalUpdateData` to `prepareProfessionUpdateData` for consistency with `prepareProfessionCreateData`.

### IN-02: `camp-rules.ts` is an empty placeholder

**Files modified:** `src/shared/constants/camp-rules.ts`
**Commit:** `0f0c1f7`
**Applied fix:** Expanded the `// TODO: implement` comment with explicit guidance on what the module should contain (camp configuration rules, max capacity, resource allocation policies, admission quotas).

### IN-03: `error.middleware.ts` silently drops errors when response headers are already sent

**Files modified:** `src/middlewares/error.middleware.ts`
**Commit:** `b67cedc`
**Applied fix:** Added structured `logger.error()` call before `next(error)` when `res.headersSent` is true, logging method, URL, error name, and message so these otherwise-swallowed errors are visible in production logs.

### IN-04: `camps.service.ts` `getAllCamps` selects `deleted_at` which is always null

**Files modified:** `src/modules/camps/camps.service.ts`
**Commit:** `03b68d3`
**Applied fix:** Removed `deleted_at` from the `select` clause in `getAllCamps`. The `where` clause already filters for `deleted_at: null`, making the selection redundant.

### IN-05: `admission.controller.ts` double-validates `reviewAdmissionSchema`

**Files modified:** `src/modules/admission/admission.controller.ts`
**Commit:** `e59e5c5`
**Applied fix:** Removed the redundant `reviewAdmissionSchema.parse(req.body)` call from `reviewAdmissionHandler`. The route already applies the same schema via `validate()` middleware, which sets `req.body` to the parsed result. Also removed the unused import.

---

_Fixed: 2026-05-23T22:00:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_

---
phase: 05-fix-all-prisma-schema-issues-based-on-db-review-md-taking-in
fixed_at: 2026-05-23T00:00:00Z
review_path: .planning/phases/05-fix-all-prisma-schema-issues-based-on-db-review-md-taking-in/05-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 10
skipped: 1
status: partial
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-05-23T00:00:00Z
**Source review:** `.planning/phases/05-fix-all-prisma-schema-issues-based-on-db-review-md-taking-in/05-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (3 Critical + 8 Warning)
- Fixed: 10
- Skipped: 1

## Fixed Issues

### CR-01: Jobs process ABANDONED camps

**Files modified:** `src/modules/camps/camps.service.ts`
**Commit:** `72513fe`
**Applied fix:** Added `where: { status: 'ACTIVE', deleted_at: null }` filter to `getAllCamps()` so daily jobs (rations, production, alerts) no longer iterate over ABANDONED or deleted camps.

### CR-03: Inventory audit memory pressure

**Files modified:** `src/modules/inventory/inventory.service.ts`
**Commit:** `f2aa5fb`
**Applied fix:** Refactored `validateInventoryConsistency` to accept a `resourceTypeIds` array parameter, pushing pagination to the database level. Introduced `getDistinctResourceTypeIdsForCamp()` for lightweight ID collection. Replaced the global `hasInconsistencies` data-load with a raw SQL `SELECT EXISTS` query that uses a LEFT JOIN + ABS comparison — zero full-quantity loads.

### WR-01: handleForeignKeyError returns 409

**Files modified:** `src/shared/utils/handlePrismaError.ts`, `src/middlewares/error.middleware.ts`
**Commit:** `f9e03bc`
**Applied fix:** Changed `handleForeignKeyError` throw from `AppError(..., 409)` to `AppError(..., 400)`. Updated `error.middleware.ts` P2003 mapping from 409 to 400. Now consistent with AGENTS.md error convention table.

### WR-02: Admin bypass privilege static in JWT

**Files modified:** `src/middlewares/camp.middleware.ts`
**Commit:** `bd9c49f`
**Applied fix:** Replaced the `isAdmin` JWT flag check with a `hasAdminBypass(userId)` DB query that runs on every request. Added import of `PERMISSIONS` constant. The `isAdmin` JWT field is preserved for backward compatibility but no longer used by `campMiddleware` — role changes now take effect immediately without re-login.

### WR-03: AI profession mapping failure leaves admissions stuck

**Files modified:** `src/modules/admission/admission.service.ts`
**Commit:** `71e1d16`
**Applied fix:** Added validation after `evaluateAdmission()` call: checks that `aiResult.ai_profession_id` exists in the camp's actual professions list. Throws `AppError(400)` if not found, preventing stuck admissions that can't be accepted later.

### WR-04: Fragile type casts in transaction helpers

**Files modified:** `src/modules/inventory/inventory.service.ts`, `src/modules/people/people.service.ts`
**Commit:** `ff6bb4f`
**Applied fix:** Removed all `const client = tx as unknown as typeof prisma` intermediary variables from `ensureCampExists`, `ensureResourceExists`, `ensureUserExists` (inventory) and `ensureProfessionExistsTx`, `ensureResourceTypeExistsTx`, `ensureUserExistsTx` (people). Functions now use `tx` directly since `Prisma.TransactionClient` already exposes all model delegates.

### WR-05: Random ID code collision risk

**Files modified:** `src/modules/people/people.service.ts`
**Commit:** `2faed53`
**Applied fix:** Added retry loop to `createPerson` — on P2002 unique constraint violation targeting `identification_code` (and when no explicit code was provided by the caller), regenerates a fresh random code and retries up to 3 times. Updated `preparePersonCreateData` to accept an optional `identificationCode` parameter.

### WR-06: Password min length = 1

**Files modified:** `src/modules/auth/auth.schema.ts`, `src/modules/users/users.schema.ts`
**Commit:** `b8eb09f`
**Applied fix:** Changed password Zod validation from `.min(1)` to `.min(8, 'Password must be at least 8 characters')` in both login schema and user creation schema.

### WR-07: Nullable quantity field mismatch

**Files modified:** `prisma/schema.prisma`
**Commit:** `2f131b4`
**Applied fix:** Changed `camp_transfer_items.quantity` from `Decimal?` (nullable) to `Decimal @default(0.00)` (non-nullable with default). A migration will be needed to handle any existing NULL values in the database.

### WR-08: Type-unsafe ensureCampExists call

**Files modified:** `src/modules/inventory/inventory.service.ts`
**Commit:** `a110e0e`
**Applied fix:** Introduced `PrismaClientLike = typeof prisma | InventoryTransactionClient` union type. Changed `ensureCampExists` parameter type from `InventoryTransactionClient` to `PrismaClientLike`, allowing both the global `prisma` client (used outside transactions) and transaction clients to be passed without type assertions.

## Skipped Issues

### CR-02: CHILD_AGE=0 silent coercion

**File:** `src/jobs/daily-rations.job.ts:17`
**Reason:** User explicitly requested to skip this finding. The `Number(process.env.CHILD_AGE) || 12` falsy-coercion issue remains present. A future fix should use `Number.isFinite(parsed) ? parsed : 12`.

---

_Fixed: 2026-05-23T00:00:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_

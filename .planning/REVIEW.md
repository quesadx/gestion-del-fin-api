---
phase: code-review
reviewed: 2026-05-17T12:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - prisma/schema.prisma
  - src/modules/people/people.service.ts
  - src/modules/transfers/transfers.service.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Code Review Report

**Reviewed:** 2026-05-17T12:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed three files covering Prisma schema, people service, and transfers service. Confirmed that renamed relation fields (`requesting_camp_ref`, `target_camp_ref`, `from_profession`, `to_profession`) are used consistently and correctly across both services. All FK actions are appropriate except one critical schema-level contradiction in `audit_log`. Found one BLOCKER (schema constraint mismatch), three WARNINGs (duplicated `ensure*` helpers, unsafe type cast pattern, incomplete error catch), and two INFO items (code duplication, inconsistent existence check).

## Critical Issues

### CR-01: `audit_log` FK constraint contradiction — SetNull on NOT NULL columns

**File:** `prisma/schema.prisma:400-415`
**Issue:** The `audit_log` model declares `user_id Int` and `camp_id Int` as **required (NOT NULL)** columns, but both FK relations specify `onDelete: SetNull`. This is a logical contradiction — when a referenced `users` or `camps` record is deleted, the database tries to SET `user_id`/`camp_id` to NULL, which violates the column's NOT NULL constraint. Prisma will reject this at migration time (error P2014: "The relation field `users` uses `onDelete: SetNull` but the field `user_id` is required"), and if somehow the migration runs, the database itself will raise a constraint violation at runtime.

```prisma
// Lines 409-410
users  users  @relation(fields: [user_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
camps  camps  @relation(fields: [camp_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

**Fix:** Either (a) make the columns nullable by changing to `Int?` (preferred — preserves audit trail even after user/camp deletion), or (b) change the FK action to `Restrict` (preserves NOT NULL but prevents deletion of any user/camp with audit logs). Option (a) is consistent with other SetNull patterns in the schema (e.g., `admission_requests.reviewed_by` at line 40).

```prisma
model audit_log {
  id          Int      @id @default(autoincrement())
  user_id     Int?                            // Changed to Int?
  camp_id     Int?                            // Changed to Int?
  action      String   @db.VarChar(100)
  target_type String   @db.VarChar(80)
  target_id   Int?
  metadata    Json?    @db.JsonB
  created_at  DateTime @default(now())
  users       users    @relation(fields: [user_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
  camps       camps    @relation(fields: [camp_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
}
```

## Warnings

### WR-01: Duplicate `ensure*` existence-checker functions in people service

**File:** `src/modules/people/people.service.ts:54-95`
**Issue:** The service defines parallel implementations of entity existence checkers — one for regular `prisma` client, one for transaction client:
- `ensureProfessionExists` (line 54) / `ensureProfessionExistsTx` (line 65)
- `ensureResourceTypeExists` / `ensureResourceTypeExistsTx` — only Tx variant exists (line 77), no non-tx variant
- `ensureUserExists` / `ensureUserExistsTx` (line 89)
- `ensureCampExists` / no Tx variant (line 47) — inconsistently available in only one form

This duplication is error-prone (changes to one copy may not be mirrored), violates DRY, and the naming convention `ensure*Tx` vs `ensure*` is fragile. The `ensureCampExists` function (line 47) has no transaction variant, meaning it can't be safely called inside a transaction.

**Fix:** Create a single function that accepts an optional transaction client:

```typescript
type DbClient = typeof prisma;
async function ensureProfessionExists(professionId: number, tx?: DbClient) {
  const client = tx ?? prisma;
  const profession = await client.professions.findUnique({
    where: { id: professionId },
    select: { id: true },
  });
  if (!profession) throw new AppError(`Profession not found: ${professionId}`, 404);
}
```

### WR-02: Unsafe type cast `prisma as unknown as TransferTransactionClient`

**File:** `src/modules/transfers/transfers.service.ts:396, 445, 492, 585`
**Issue:** The pattern `prisma as unknown as TransferTransactionClient` is used in four locations (`approveTransferBySource`, `approveTransferByTarget`, `completeTransfer`, `rejectTransfer`) to pass the regular `prisma` client to functions that accept a transaction client type. This bypasses TypeScript's type safety — if `ensureUserExists` or `ensureTransferExists` ever used a transaction-specific API (e.g., `$transaction` nesting), this cast would cause a runtime error. The user data fetched outside the transaction is captured by closure and used inside the transaction, creating a minor TOCTOU risk (the user's `camp_id` could change between the pre-transaction fetch and the intra-transaction check).

**Fix:** Create a `getPrismaClient` helper that returns the appropriate client type, or restructure the code to always pass the transaction client consistently within the transaction scope:

```typescript
async function ensureUserExists_(
  tx: TransferTransactionClient | typeof prisma,
  userId: number,
) {
  const user = await tx.users.findUnique({ ... });
  if (!user) throw new AppError(`User not found: ${userId}`, 404);
  return user;
}

// Usage outside transaction:
const approver = await ensureUserExists_(prisma, approverUserId);
```

### WR-03: `updatePerson` catch block may swallow non-constraint transaction errors

**File:** `src/modules/people/people.service.ts:219-221`
**Issue:** The `catch` block in `updatePerson` calls `handleUniqueConstraintError(error)`, which re-throws only if `error.code === 'P2002'` (unique constraint violation). For ALL other error types — including `AppError` thrown from within the transaction (e.g., person not found at line 196, or user not found at line 188) — the function re-throws the original error. While this technically works because `AppError` is not handled and propagates up, it's fragile: the `catch` block catches errors that it shouldn't (future refactoring could accidentally add silent swallowing). Compare with `createPerson` (lines 166-168) which uses a narrow `try/catch` directly around the single Prisma `create` call, rather than wrapping the entire transaction.

**Fix:** Narrow the `try/catch` to only wrap the Prisma `update` call where a unique constraint violation could occur, or use a more specific error filter:

```typescript
// Option A: narrow try/catch
const updatedPerson = await (async () => {
  try {
    return await client.persons.update({ ... });
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
})();

// Option B: type check before handling
catch (error: any) {
  if (error.code === 'P2002') {
    throw new AppError(`${error.meta?.target?.[0] ?? 'field'} already exists`, 409);
  }
  throw error; // re-throw everything else
}
```

## Info

### IN-01: Missing `ensureCampExists` in `getTransfers` — inconsistent with other list functions

**File:** `src/modules/transfers/transfers.service.ts:640`
**Issue:** `getTransfers` (line 640) does not call `ensureCampExists(campId)` before querying, while `getPeople` (people.service.ts:238) and `getActivePeopleWithProfessionsByCamp` (people.service.ts:266) both verify the camp exists. If an invalid `campId` is passed, `getTransfers` silently returns empty results instead of returning 404. Since the camp ID typically comes from auth middleware, this is low-risk but inconsistent.

**Fix:** Add `await ensureCampExists(prisma as unknown as TransferTransactionClient, campId);` at the start of `getTransfers`, or abstract a shared `ensureCampExists` that works with both `prisma` and transaction clients (see WR-01).

### IN-02: Duplicate date parsing logic across service files

**File:** `src/modules/people/people.service.ts:25-34` and `src/modules/transfers/transfers.service.ts:23-32`
**Issue:** Both `people.service.ts` and `transfers.service.ts` implement nearly identical `parseDate`/`parseDateTime` functions that parse a string to `Date` and throw `AppError(400)` on invalid input. This is code duplication — adding a third service would require a third copy. The logic should live in a shared utility.

**Fix:** Move to `/src/shared/utils/`:

```typescript
// src/shared/utils/parseDate.ts
import { AppError } from './appError.js';

export function parseDateTime(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid datetime value: ${value}`, 400);
  }
  return parsed;
}
```

## Verified Correct (Confidence Notes)

The following aspects were confirmed correct during review and are noted for downstream confidence:

1. **Relation field names match schema ↔ service includes:** `requesting_camp_ref` and `target_camp_ref` are used consistently in `transfers.service.ts` `getTransfer` (line 628-629) and `getTransfers` (line 656-657). All other service functions correctly use the scalar `requesting_camp`/`target_camp` fields instead of relation fields, which avoids unnecessary JOINs. ✅

2. **`from_profession`/`to_profession` in people service:** The `include` clause in `createProfessionReassignment` (line 449-458) correctly references `from_profession` and `to_profession`, matching the Prisma schema relation field names (schema.prisma:276-278). ✅

3. **Relation names consistent across model pairs:** All explicit `@relation("name")` annotations are symmetric between:
   - `camps` ↔ `camp_transfers` (`transfer_requesting_camp`, `transfer_target_camp`) ✅
   - `users` ↔ `camp_transfers` (`transfer_approved_by_source`, `transfer_approved_by_target`, `transfer_requested_by`) ✅
   - `professions` ↔ `profession_reassignment_log` (`profession_log_from_profession`, `profession_log_to_profession`) ✅

4. **FK actions are correct for all relations except audit_log:** Cascade on parent-delete-child patterns, Restrict on reference-data patterns, SetNull on optional-FK patterns — all appropriate for the domain. ✅

5. **`persons_status` enum usage in `person_status_log`:** The `old_status` and `new_status` fields (schema.prisma:229-230) correctly reference the `persons_status` enum, not a standalone enum. ✅

---

_Reviewed: 2026-05-17T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_

---
phase: 05-fix-all-prisma-schema-issues-based-on-db-review-md-taking-in
reviewed: 2026-05-17T23:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - prisma/schema.prisma
  - prisma/migrations/20260517223828_add_index_names_and_date_indexes/migration.sql
  - prisma/migrations/20260517235959_rename_professions_id_to_profession_id/migration.sql
  - src/jobs/daily-production.job.ts
  - src/modules/professions/professions.service.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-17T23:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the schema changes, migrations, and TypeScript code for the `professions_id` → `profession_id` column rename in `professions_resources_amounts`, plus companion index-renaming and date-index creation migrations. Also reviewed the production job and professions service for correctness after these schema changes.

**Overall assessment:** No critical bugs or security vulnerabilities found. The column rename migration is semantically correct and PostgreSQL-safe. The TypeScript code consistently uses the new `profession_id` field name across `professions.service.ts`, `daily-production.job.ts`, and inferred types from Prisma queries. No cross-camp data leakage, no injection vectors, no hardcoded secrets.

**Key concerns:** Three warnings and four informational items identified — all are code quality or documentation-consistency issues rather than correctness bugs.

---

## Warnings

### WR-01: Missing input validation for `page` and `pageSize` in `getProfessions`

**File:** `src/modules/professions/professions.service.ts:53-55`
**Issue:** The `getProfessions(page, pageSize)` function accepts `page` and `pageSize` parameters with defaults but performs no validation. A `page` of 0 or negative causes `skip` to be 0 or negative. A `pageSize` of 0 causes `effectiveLimit` = 0 and `Math.ceil(total / 0)` = `Infinity` in the `totalPages` calculation. While Prisma guards against negative `skip` (throwing a runtime error), a 0 `pageSize` passes through and produces a corrupt pagination response.

**Fix:**
```typescript
export async function getProfessions(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.min(Math.floor(pageSize), 100));
  const skip = (safePage - 1) * safePageSize;

  const [records, total] = await Promise.all([
    prisma.professions.findMany({ skip, take: safePageSize }),
    prisma.professions.count(),
  ]);

  return {
    data: records,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      hasNextPage: safePage * safePageSize < total,
      totalPages: Math.ceil(total / safePageSize),
    },
  };
}
```

---

### WR-02: `asNumber` silently produces `NaN` masking data issues

**File:** `src/jobs/daily-production.job.ts:18-20, 48-57, 88-97`
**Issue:** The `asNumber` helper uses `Number(value)` with `unknown` input type. While Prisma `Decimal` values convert correctly, if any upstream query changes return shape or a schema migration introduces a nullable field without code updates, `Number(undefined)` = `NaN`. This `NaN` propagates through `roundToTwoDecimals`, then gets silently dropped because both `NaN <= 0` and `NaN > 0` evaluate to `false` (lines 49 and 97). No error is logged — production gains are silently lost for affected resources.

**Fix:**
```typescript
function asNumber(value: unknown): number {
  const num = Number(value);
  if (isNaN(num)) {
    logger.error(`[JOB] asNumber received non-numeric value: ${JSON.stringify(value)}`);
    return 0;
  }
  return num;
}
```

Alternatively, use Prisma's built-in `.toNumber()` method on `Decimal` instances for type safety:
```typescript
function asDecimal(value: Prisma.Decimal): number {
  return value.toNumber();
}
```

---

### WR-03: `deleteProfession` returns HTTP 409 instead of documented 400 for FK violations

**File:** `src/modules/professions/professions.service.ts:79-82`, `src/shared/utils/handlePrismaError.ts:13`
**Issue:** `deleteProfession` calls `handleForeignKeyError` on Prisma errors. The utility throws `new AppError('Cannot delete record with related records', 409)`, but AGENTS.md documents foreign key violations as HTTP 400 (`Status code: 400 | Origin: handleForeignKeyError`). API consumers relying on the documented 400 status code would miss FK violation errors.

Note: HTTP 409 Conflict is actually semantically more correct than 400 Bad Request for this case (the request is well-formed; the conflict is with resource state). The fix should align either the code to the docs or the docs to the code.

**Fix (align to docs):**
```typescript
// In handlePrismaError.ts, change:
throw new AppError('Cannot delete record with related records', 400);
```

**Fix (align docs to code — recommended, as 409 is HTTP-correct):**
Update AGENTS.md error table entry to `| Foreign key violation | 409 | handleForeignKeyError |`

---

## Info

### IN-01: Typo in function name `prepareProfessionalUpdateData`

**File:** `src/modules/professions/professions.service.ts:16`
**Issue:** Function is named `prepareProfessionalUpdateData` (adjective "Professional") while the create counterpart is `prepareProfessionCreateData` (noun "Profession"). Should be `prepareProfessionUpdateData` for consistency.

**Fix:**
```typescript
// Rename line 16 and line 40:
function prepareProfessionUpdateData(data: UpdateProfessionDto) {
  // ...
}
// And update the call site on line 40:
data: prepareProfessionUpdateData(data),
```

---

### IN-02: Magic number `100` for max page size

**File:** `src/modules/professions/professions.service.ts:54`
**Issue:** The value `100` is hardcoded as the maximum page size. This should be a named constant for maintainability and to prevent drift if the same cap is used across multiple services.

**Fix:**
```typescript
const MAX_PAGE_SIZE = 100;

export async function getProfessions(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, MAX_PAGE_SIZE);
  // ...
}
```

---

### IN-03: Migration `add_index_names_and_date_indexes` is not idempotent

**File:** `prisma/migrations/20260517223828_add_index_names_and_date_indexes/migration.sql:2-62`
**Issue:** The migration uses multiple `ALTER INDEX ... RENAME TO` and `CREATE INDEX` statements. If this migration were ever re-applied (e.g., during a database restore scenario), all statements would fail because the old index names no longer exist and the new index names already exist. While Prisma normally enforces sequential migration application, this is a quality concern for production operations.

**Fix:** Wrap each statement in a conditional guard (PostgreSQL procedural block), or document in the migration that it assumes sequential application and is not safe for re-run. Prisma's standard approach of sequential migrations makes this acceptable in practice, but the risk should be noted.

---

### IN-04: FK constraint name not renamed by column rename migration

**File:** `prisma/migrations/20260517235959_rename_professions_id_to_profession_id/migration.sql:2`
**Issue:** The migration renames column `professions_id` → `profession_id` in `professions_resources_amounts` but does not rename the foreign key constraint. PostgreSQL's internal constraint tracking handles this correctly (FKs reference columns by internal OID, not by name), so the constraint remains functional. However, the constraint name in the database still references the old column name (e.g., `professions_resources_amounts_professions_id_fkey`), creating an inconsistency between the constraint name and actual column name. This could confuse manual database inspection or tools that introspect constraint definitions.

**Fix:** Add an explicit constraint rename to the migration (optional but recommended for cleanliness):
```sql
ALTER TABLE "professions_resources_amounts" RENAME CONSTRAINT "professions_resources_amounts_professions_id_fkey" TO "professions_resources_amounts_profession_id_fkey";
```
Note: The exact constraint name must be verified against the live database, as PostgreSQL auto-generates constraint names.

---

_Reviewed: 2026-05-17T23:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_

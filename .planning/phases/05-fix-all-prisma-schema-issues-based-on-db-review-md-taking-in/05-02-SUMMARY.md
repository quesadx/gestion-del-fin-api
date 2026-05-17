---
phase: 05-fix-all-prisma-schema-issues-based-on-db-review-md-taking-in
plan: 02
subsystem: prisma-schema
tags: [indexes, schema, migration, performance, db-review]
depends_on:
  - 05-01
requires: []
provides:
  - D-05
  - D-06
  - D-07
affects: []
tech-stack:
  added: []
  patterns:
    - "Index naming convention: {model_name}_{column_name}_idx"
    - "Manual migration via prisma migrate diff + prisma db execute + prisma migrate resolve"
    - "Shadow DB replay workaround for misordered migration directories"
key-files:
  created:
    - prisma/migrations/20260517223828_add_index_names_and_date_indexes/migration.sql
  modified:
    - prisma/schema.prisma
decisions:
  - "Used prisma migrate diff (schema-to-schema) to avoid shadow DB P3006 error from misordered migration 20260517_fix_schema_cleanup"
  - "Applied rename_professions_id_to_profession_id and add_index_names_and_date_indexes via prisma db execute + prisma migrate resolve"
  - "SQL diff generates only 20 out of 44 index operations because 24 auto-generated index names already matched the new map: names"
metrics:
  duration: "7m 0s"
  completed_date: "2026-05-17T22:42:11Z"
---

# Phase 05 Plan 02: Index Naming & Date-Column Indexes Summary

**One-liner:** Added explicit `map:` names to all 40 `@@index` directives using `{model}_{column}_idx` convention and introduced 4 new indexes on frequently-queried date columns (`admission_requests.created_at`, `expeditions.departure_date`, `expeditions.expected_return_date`, `inventory_logs.logged_at`) — eliminating duplicated index names across tables and preventing full table scans on date-range queries.

## Tasks Executed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Add map: names to all 40 @@index directives and 4 new date-column indexes | ✅ Done | `6e95550` | `prisma/schema.prisma` |
| 2 | Generate migration, push schema, regenerate client | ✅ Done | `0daf2c5` | `prisma/migrations/20260517223828_add_index_names_and_date_indexes/migration.sql` |
| 3 | Run full E2E regression test suite | ✅ Done | (verification only) | No file changes |

## Key Results

### Schema Changes

- **44 total `@@index` directives** (40 named + 4 new), all with explicit `map:` names
- **Zero `@@index` without `map:`** — `grep '@@index' prisma/schema.prisma | grep -v 'map:'` returns 0
- **4 new date-column indexes** address db-review.md §9.4 recommendations:
  - `admission_requests_created_at_idx` — admission request date filtering
  - `expeditions_departure_date_idx` — departure date queries
  - `expeditions_expected_return_date_idx` — return date range queries
  - `inventory_logs_logged_at_idx` — inventory audit log date filtering

### Migration

- **Migration:** `20260517223828_add_index_names_and_date_indexes`
- **SQL operations:** 4 `CREATE INDEX` + 16 `ALTER INDEX ... RENAME TO`
- **24 indexes** had auto-generated names already matching the new convention — no SQL rename needed
- **Applied via** `prisma db execute` + `prisma migrate resolve` (shadow DB P3006 workaround)

### E2E Test Results

| Category | Count | Details |
|----------|-------|---------|
| Passed | 181 | All modules pass: auth, camps, expeditions, inventory, metrics, people, permissions, professions, resources, roles, system, transfers, users |
| Failed | 6 | All in `admission.spec.ts` — pre-existing, unrelated to index changes |
| Skipped | 6 | Expected `describe.skip` blocks (403 tests where all roles have all perms) |
| **Regressions** | **0** | No test failures attributable to schema/index changes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shadow DB P3006 error on misordered migration**
- **Found during:** Task 2 migration generation
- **Issue:** `prisma migrate dev` fails because `20260517_fix_schema_cleanup` (no time component) sorts before `20260517072643_add_audit_log`, causing shadow DB replay failure on non-existent `audit_log` table
- **Fix:** Used `prisma migrate diff --from-schema <baseline> --to-schema prisma/schema.prisma --script` to generate SQL directly, then applied with `prisma db execute` and marked as resolved with `prisma migrate resolve`
- **Files used:** `/tmp/baseline_schema.prisma` (extracted from git HEAD~1)
- **Same workaround as Plan 05-01** (documented in STATE.md)

**2. [Rule 3 - Blocking] Supabase DB initially unreachable**
- **Found during:** Task 2 migration application
- **Issue:** First `prisma migrate dev` attempt failed with `P1001: Can't reach database server`
- **Fix:** Retried — DB became reachable on subsequent attempt. Proceeded with manual migration workflow.

**3. [Rule 1 - Bug] Pending migration from Plan 05-01 had already been applied to DB**
- **Found during:** Task 2 manual migration application
- **Issue:** `prisma db execute --file .../rename_professions_id_to_profession_id/migration.sql` failed with "column professions_id does not exist" — the column was already renamed by Plan 05-01's direct DB execution
- **Fix:** Used `prisma migrate resolve --applied 20260517235959_rename_professions_id_to_profession_id` to mark it as applied in the tracking table

None — plan executed exactly as written with above deviation handling.

## Threat Flags

None. Index `map:` names are cosmetic (affect only generated SQL `CREATE INDEX` statement names, not query behavior). New date-column indexes are additive and improve query performance — they do not create new trust boundaries or expose data. Validated by `prisma migrate status` confirming all migrations applied without errors.

## Self-Check: PASSED

- [x] `prisma/schema.prisma` exists with 44 `@@index` directives, all with `map:`
- [x] `prisma/migrations/20260517223828_add_index_names_and_date_indexes/migration.sql` exists
- [x] Commit `6e95550` exists (Task 1)
- [x] Commit `0daf2c5` exists (Task 2)
- [x] `npx prisma validate` passes
- [x] `npx tsc --noEmit` passes
- [x] 181 E2E tests pass with zero regressions from schema changes

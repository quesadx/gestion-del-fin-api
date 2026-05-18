---
status: complete
date: 2026-05-17
id: 20260517-fix-deferred-schema
---

# Quick Task: Fix Deferred Schema Review Findings

## Changes Made

### WR-01: Datasource Mismatch
- Fixed AGENTS.md: PostgreSQL (not MariaDB) — confirmed by .env postgresql:// URLs and DB_PORT=5432

### WR-02: Rename `persons` → `people`
- Renamed Prisma model from `persons` to `people` with `@@map("persons")` to preserve DB table name
- Updated all model type references in schema relations
- Updated all code references: `prisma.persons` → `prisma.people` (4 service files + 1 test + 1 setup)

### WR-03: Ambiguous `persons.camp_transfers` → `led_transfers`
- Renamed reverse relation field on people model to `led_transfers` with explicit `@relation("transfer_leader")`
- Updated camp_transfers forward relation to match the named relation

### WR-04: `contribution_overrides.created_by` SetNull
- Changed onDelete from Restrict to SetNull for users FK

### WR-05: `person_status_log.changed_by` SetNull
- Changed onDelete from Restrict to SetNull for users FK

### WR-07: admission→person link
- Added `person_id Int?` FK from `admission_requests` to `people` with `onDelete: SetNull`
- Added back-relation in people model
- Added index on `person_id`

### WR-08: VarChar consistency
- Changed `admission_requests.photo_url` from `@db.VarChar(255)` to `@db.VarChar(500)` to match `people.photo_url`

## Files Changed
- `AGENTS.md` — Fix datasource doc
- `prisma/schema.prisma` — All schema changes
- `src/modules/people/people.service.ts` — prisma/transaction client refs
- `src/modules/explorations/explorations.service.ts` — transaction client refs
- `src/modules/transfers/transfers.service.ts` — transaction client refs
- `src/modules/metrics/metrics.service.ts` — prisma client refs
- `tests/e2e/global.setup.ts` — prisma client refs

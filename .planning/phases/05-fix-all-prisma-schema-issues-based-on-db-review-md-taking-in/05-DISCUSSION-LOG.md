# Phase 5 Discussion Log

**Discussion date:** 2026-05-17
**Mode:** discuss (default)

## Areas Discussed

### 1. User/Post orphan tables
- **Question:** How to handle DB tables from prisma init that no longer have schema models?
- **Options:** Drop via migration / Leave them / Drop + FK check
- **Decision:** No schema change needed — models already removed from schema.prisma. Tables are cosmetic only.

### 2. professions_id naming inconsistency
- **Question:** Rename `professions_id` (plural FK) to `profession_id` (singular, matching convention)?
- **Options:** Full rename / Schema-only rename / Skip
- **Decision:** Full rename — schema.prisma field + relation fields + TypeScript service code (2 files, 4 references) + E2E tests (none affected). Generate migration.

### 3. Index naming and new indexes
- **Question:** How to handle duplicated index names and missing date-column indexes?
- **Options:** Add explicit map: names / Names + new indexes / Skip
- **Decision:** Add explicit `map:` names to all @@index directives AND add new indexes on: `admission_requests.created_at`, `expeditions.departure_date`, `expeditions.expected_return_date`, `inventory_log.logged_at`.

## Deferred Ideas

None.

---

## OpenCode's Discretion Items

- Exact index name format (e.g., `idx_admissions_created_at` vs `admissions_created_at_idx`)
- Whether to combine profession_id rename and index changes into one migration or two separate migrations
- Whether to use `prisma migrate dev` or `prisma migrate deploy` based on test environment

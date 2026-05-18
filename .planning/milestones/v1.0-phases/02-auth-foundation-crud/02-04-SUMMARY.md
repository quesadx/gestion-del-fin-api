---
plan: 02-04
status: complete
files_created: ['tests/e2e/resources.spec.ts']
self_check: PASSED
---

## Plan 02-04: Resources CRUD E2E Tests — Complete

**Objective:** Create resources.spec.ts with full CRUD, auth, and error-case coverage.

**What was built:**

- `tests/e2e/resources.spec.ts` — 17 tests covering GET, POST, PUT, DELETE /api/resources
- Lists, get-by-id (with dynamic ID discovery), create (201) with all 4 required fields, update, delete with happy paths
- Error cases: 401 (no auth), 403 (non-admin), 404 (non-existent), 400 (missing name/unit/daily_ration/minimum_stock), 409 (duplicate name)

**Deviations:** None. Fixed beforeAll pattern to inline ID discovery.

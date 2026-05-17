---
plan: 02-03
status: complete
files_created: ['tests/e2e/professions.spec.ts']
self_check: PASSED
---

## Plan 02-03: Professions CRUD E2E Tests — Complete

**Objective:** Create professions.spec.ts with full CRUD, auth, and error-case coverage.

**What was built:**

- `tests/e2e/professions.spec.ts` — 13 tests covering GET, POST, PUT, DELETE /api/professions
- Lists, get-by-id (with dynamic ID discovery), create (201), update, delete with happy paths
- Error cases: 401 (no auth), 403 (non-admin via worker), 404 (non-existent), 400 (empty/missing name), 409 (duplicate name)

**Deviations:** None. Fixed beforeAll pattern to inline ID discovery since Playwright fixtures are test-scoped.

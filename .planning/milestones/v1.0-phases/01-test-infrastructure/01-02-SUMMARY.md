---
phase: 01-test-infrastructure
plan: 02
subsystem: test-infrastructure/global-setup-teardown
tags: [setup, teardown, seed, jwt, tokens]
requires: ['01-01']
provides: ['01-03', '01-04']
affects:
  - tests/e2e/global.setup.ts
  - tests/e2e/global.teardown.ts
tech-stack:
  added: []
  patterns:
    - 'Playwright project dependency setup/teardown pattern'
    - 'Truncate-on-next-run database cleanup strategy'
    - 'Direct JWT generation via signAccessToken() for test tokens'
    - 'Deterministic seed with full RBAC mapping for test simplicity'
key-files:
  created:
    - tests/e2e/global.setup.ts
    - tests/e2e/global.teardown.ts
  modified: []
decisions:
  - 'Used signAccessToken() from production JWT utility for token generation — no manual jwt.sign calls'
  - 'All 56 permissions mapped to all 4 roles — full access for test simplicity over fine-grained RBAC in tests'
  - 'bcryptjs salt rounds reduced to 4 (from default 10) for test performance'
  - 'Truncate-on-next-run pattern (teardown does NOT truncate DB) per PITFALLS.md pitfall 10'
  - "last_activity set to new Date() at seed time — session middleware won't reject tokens during the test window"
metrics:
  duration: 39s
  completed: 2026-05-17T09:22:06.000Z
---

# Phase 01 Plan 02: Global Setup & Teardown Summary

**One-liner:** Global setup seeds test DB with 2 camps, 4 roles, 56 permissions, 6 users, inventory, and people — then generates JWT tokens for all 6 test roles via `signAccessToken()`. Teardown removes tokens.json.

## Tasks Completed

| #   | Task                                                  | Commit    | Files                          |
| --- | ----------------------------------------------------- | --------- | ------------------------------ |
| 1   | Create global setup — DB seeding and token generation | `bc4553a` | `tests/e2e/global.setup.ts`    |
| 2   | Create global teardown — cleanup test artifacts       | `ea3fb71` | `tests/e2e/global.teardown.ts` |

## Implementation Summary

### Task 1: Global Setup (`tests/e2e/global.setup.ts`)

Created a Playwright setup project script that runs before all E2E tests to prepare a deterministic test database state. The script executes in 5 phases:

**Phase 1 — Clean slate:** Truncates all 24 tables in reverse dependency order using `TRUNCATE TABLE CASCADE`, matching the pattern from `prisma/seed.ts`.

**Phase 2 — Base entities:** Seeds:

- 2 camps (Alpha Outpost id=1, Beta Sanctuary id=2)
- 4 roles (system_admin, worker, resource_manager, travel_coordinator)
- 56 permissions from `src/shared/constants/permissions.ts`
- Full `role_permissions` mapping (all permissions assigned to all roles)
- 3 resource types (Standard Rations, Purified Water, Antibiotics)
- 2 professions (Engineer, Scout)

**Phase 3 — Test users:** Creates 6 users with:

- Username/password: `{username}` / `test-password-123` (bcryptjs, 4 salt rounds)
- `last_activity: new Date()` — critical for session middleware
- `session_version: 1`

User matrix:
| username | role | camp | isAdmin |
|---|---|---|---|
| admin_master | system_admin | 1 | true |
| admin_user_2 | system_admin | 2 | true |
| worker_user_1 | worker | 1 | false |
| worker_user_2 | worker | 2 | false |
| resource_mgr_1 | resource_manager | 1 | false |
| travel_coord_1 | travel_coordinator | 1 | false |

**Phase 4 — Sample data:** Creates inventory entries for all 6 camp+resource combos (1000 quantity each) and 2 people per camp (4 total).

**Phase 5 — Token generation:** Generates JWT tokens using `signAccessToken()` from `src/shared/utils/jwt.ts` (production utility) and writes them to `tests/e2e/.auth/tokens.json` with 6 keys: `admin_camp1`, `admin_camp2`, `worker_camp1`, `worker_camp2`, `resource_mgr_camp1`, `travel_coord_camp1`.

### Task 2: Global Teardown (`tests/e2e/global.teardown.ts`)

Created a Playwright teardown project script that:

- Removes `tests/e2e/.auth/tokens.json` if it exists
- Removes the empty `.auth/` directory after token cleanup
- Deliberately does NOT truncate the database — follows the truncate-on-next-run pattern (PITFALLS.md pitfall 10)

### Bug Fix During Implementation

**Auto-fix [Rule 1 — Bug]: Fixed `persons` field name from `name` to `full_name`**

- **Found during:** Task 1 (writing person seed data)
- **Issue:** The PLAN.md pseudo-code used `name` property for persons creation, but the Prisma schema defines the field as `full_name` (required `String`). Using `name` would fail at runtime.
- **Fix:** Changed all `name:` to `full_name:` in person creation calls within global.setup.ts.
- **Files modified:** `tests/e2e/global.setup.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Fixed persons field name: `name` → `full_name`**

- **Found during:** Task 1
- **Issue:** PLAN.md pseudo-code used `name` for the persons model, but Prisma schema defines it as `full_name`
- **Fix:** Used `full_name` in all `prisma.persons.create()` calls
- **Files modified:** `tests/e2e/global.setup.ts`
- **Commit:** `bc4553a`

## Verification Results

| Check                                        | Status |
| -------------------------------------------- | ------ |
| `tests/e2e/global.setup.ts` exists           | ✓      |
| Contains `signAccessToken` import            | ✓      |
| Contains `export default` async function     | ✓      |
| Contains `last_activity` set to `new Date()` | ✓      |
| Contains `TRUNCATE TABLE` with all 24 tables | ✓      |
| `tests/e2e/global.teardown.ts` exists        | ✓      |
| Contains `export default` async function     | ✓      |
| Contains `unlinkSync` for token cleanup      | ✓      |
| No database truncation in teardown           | ✓      |

## Self-Check: PASSED

- [x] `tests/e2e/global.setup.ts` confirmed exists
- [x] `tests/e2e/global.teardown.ts` confirmed exists
- [x] Commit `bc4553a` confirmed in git log
- [x] Commit `ea3fb71` confirmed in git log
- [x] No unexpected file deletions
- [x] No untracked files remain

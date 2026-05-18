---
plan: 02-01
status: complete
files_created: ['tests/e2e/auth.spec.ts']
self_check: PASSED
---

## Plan 02-01: Auth E2E Tests — Complete

**Objective:** Create auth.spec.ts with login/logout flows and full error coverage.

**What was built:**

- `tests/e2e/auth.spec.ts` — 11 tests covering POST /api/auth/login and POST /api/auth/logout
- Login: valid credentials (200), missing username (400), missing password (400), empty body (400), wrong password (401), non-existent user (401), username max length (400)
- Logout: valid token (200), no token (401), invalid token (401), double logout session invalidation (401)

**Key decisions:**

- Uses raw `request.newContext` (no fixture) since login/logout don't require pre-authentication
- Uses `TEST.password` from data.ts for seed password
- Logout test chain: login → get token → logout → verify status

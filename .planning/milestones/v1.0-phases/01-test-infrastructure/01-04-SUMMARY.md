---
phase: 01-test-infrastructure
plan: '04'
subsystem: system
tags:
  - e2e-testing
  - smoke-tests
  - proof-of-pattern
requires:
  - '01-01'
  - '01-02'
provides:
  - System endpoint E2E smoke tests
  - Proof that full Playwright pipeline works
affects: []
tech-stack:
  added: []
  patterns:
    - Playwright `request` fixture for unauthenticated API tests
    - Two-level test.describe grouping (module → endpoint)
    - Smoke test assertions (status + content-type + body shape)
key-files:
  created:
    - tests/e2e/system.spec.ts
  modified: []
decisions:
  - 'Root endpoint test uses absolute URL (http://localhost:3000/) because baseURL in playwright.config.ts is /api-prefixed'
  - 'System spec uses raw @playwright/test (not custom fixtures) — proves unauthenticated pipeline works independently'
duration:
  total_seconds: 1590
  started_at: '2026-05-17T09:10:00Z'
  completed_at: '2026-05-17T09:36:30Z'
---

# Phase 1 Plan 4: System Endpoint E2E Smoke Tests — Proof of Pattern

**One-liner:** Created `system.spec.ts` with 3 smoke tests proving the Playwright test pipeline works end-to-end for public endpoints.

## Tasks Executed

| #   | Name                                              | Type | Commit    | Files                      |
| --- | ------------------------------------------------- | ---- | --------- | -------------------------- |
| 1   | Create system spec — proof-of-pattern smoke tests | auto | `38db32a` | `tests/e2e/system.spec.ts` |

## What Was Built

**`tests/e2e/system.spec.ts`** — 3 tests across 2 endpoint groups:

| Group                             | Tests                                       | Status    |
| --------------------------------- | ------------------------------------------- | --------- |
| `GET /api/system/time`            | 2 tests (200 + timestamp, no auth required) | ✓ Written |
| `GET /` (health check substitute) | 1 test (200 + alive message)                | ✓ Written |

**Test imports:** Uses `import { test, expect } from '@playwright/test'` — the raw request fixture, NOT from `../helpers/fixtures`. This intentionally proves the unauthenticated test pipeline works before custom auth fixtures are introduced in phase 2.

**Key design choices:**

- System endpoints are public (no auth middleware at `src/index.ts:57`) — verified
- Tests check status code, content-type header, and response body shape
- The root endpoint test uses an absolute URL (`http://localhost:3000/`) because `playwright.config.ts` sets `baseURL` to `http://localhost:3000/api`
- Comment documents that `/api/system/health` (SYST-02 target) does not exist in the codebase

### Acceptance Criteria Check

- [x] `tests/e2e/system.spec.ts` exists (52 lines)
- [x] Uses `import { test, expect } from '@playwright/test'` — NOT from fixtures
- [x] Contains `test.describe('GET /api/system/time')` with 2 tests
- [x] Contains `test.describe('GET / (health check substitute)')` with 1 test
- [x] Each test checks status code AND response body shape
- [x] No fixture/auth helper imports
- [x] Comment documents `/api/system/health` does not exist

### Verification Results

```
=== File exists ===          PASS
=== Has test.describe ===    PASS
=== Has system/time ===      PASS
=== Has alive and kicking === PASS
=== Uses @playwright/test === 1 import (correct)
=== No fixture imports ===   PASS
=== Health missing comment === PASS
=== Test count ===           3 tests
Total lines: 52
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed baseURL mismatch for root endpoint test**

- **Found during:** task 1
- **Issue:** The plan code used `request.get('/')` which resolves against `baseURL: 'http://localhost:3000/api'` from `playwright.config.ts`, resulting in `http://localhost:3000/api/` — but the root endpoint `GET /` lives at `http://localhost:3000/` (outside the `/api` prefix, defined at `src/index.ts:41-43`). The test would have hit the wrong URL and failed.
- **Fix:** Changed to absolute URL `request.get('http://localhost:3000/')` with a comment explaining why the baseURL can't be used for this endpoint.
- **Files modified:** `tests/e2e/system.spec.ts`
- **Commit:** `38db32a`

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The test file only calls existing public endpoints that are already documented in the threat model.

## Known Stubs

None — all tests are fully functional, calling real API endpoints. No placeholder values, mock data, or unwired components.

## Commits

| Hash      | Type | Message                                                                            |
| --------- | ---- | ---------------------------------------------------------------------------------- |
| `38db32a` | test | test(01-test-infrastructure-04): create system spec — proof-of-pattern smoke tests |

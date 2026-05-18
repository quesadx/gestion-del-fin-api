---
phase: 01-test-infrastructure
plan: 01
subsystem: test-infrastructure
type: execute
status: complete
duration_seconds: 267
files_created: 3
files_modified: 5
commits:
  - 327eb76
  - 011cd64
  - 5a74780
tags:
  - playwright
  - e2e
  - config
  - env
  - dependencies
requires: []
provides:
  - playwright.config.ts
  - .env.test.example
  - .env.test
  - dotenv-cli
  - faker
affects:
  - all-e2e-specs
tech-stack:
  added:
    - '@faker-js/faker@10.4.0'
    - 'dotenv-cli@11.0.0'
  patterns:
    - '3-project Playwright setup (setup → e2e → teardown)'
    - 'dotenv-cli for test env loading in webServer'
    - 'serial execution (workers: 1, fullyParallel: false)'
key-files:
  created:
    - path: 'playwright.config.ts'
      role: 'Playwright project configuration — webServer auto-start, 3 projects, serial execution'
    - path: '.env.test'
      role: 'Test-specific environment variables (gitignored, never committed)'
    - path: '.env.test.example'
      role: 'Documented template for required test env vars (committed)'
  modified:
    - path: 'package.json'
      role: 'Added @faker-js/faker and dotenv-cli devDependencies'
    - path: '.gitignore'
      role: 'Protects .env.test and tests/e2e/.auth/ from commits'
    - path: 'tests/e2e/auth.spec.ts'
      role: 'Fixed Jest globals → Playwright imports [Rule 3 fix]'
    - path: 'tests/e2e/people.spec.ts'
      role: 'Fixed Jest globals → Playwright imports [Rule 3 fix]'
    - path: 'tests/e2e/resources.spec.ts'
      role: 'Fixed Jest globals → Playwright imports [Rule 3 fix]'
key-decisions:
  - 'webServer uses dotenv-cli to load .env.test before starting Express — keeps test DB credentials separate from development .env'
  - 'workers=1 / fullyParallel=false prevents session middleware race conditions on last_activity and camp-scoped data conflicts'
  - '3-project dependency chain (setup → e2e → teardown) chosen over globalSetup for reporter visibility and fixture support'
  - 'webServer.url = /api/system/time for health-check — public endpoint, no auth needed'
---

# Phase 01 Plan 01: Test Infrastructure Foundation Summary

**One-liner:** Playwright E2E foundation established: config auto-starts Express with test env vars via dotenv-cli, serial execution enforced, test credentials isolated.

## What Was Built

The foundational layer for the E2E test suite — the `playwright.config.ts` that orchestrates every test run, test environment files that isolate test credentials from development, and the required dev dependencies.

**3 tasks, 3 commits, all success criteria met.**

### Task 1: Dev Dependencies

Installed `@faker-js/faker@10.4.0` (dynamic test data generation, avoids unique constraint collisions between test files) and `dotenv-cli@11.0.0` (loads `.env.test` before Express starts in Playwright's `webServer`).

### Task 2: Playwright Configuration

Created `playwright.config.ts` at project root with:

- **3 projects:** setup (DB seed + tokens) → e2e (all spec files) → teardown (cleanup)
- **Serial execution:** `workers: 1`, `fullyParallel: false` — prevents session middleware race conditions
- **webServer auto-start:** `npx dotenv -e .env.test -- tsx src/index.ts` with `NODE_ENV=test`, health-check on `http://localhost:3000/api/system/time`
- **API defaults:** `baseURL: 'http://localhost:3000/api'`, JSON content type, 15s test timeout

### Task 3: Test Environment Files

Created `.env.test` (gitignored) with dedicated test DB URL (`gestion_del_fin_test`), test-only JWT secret (51 chars), `NODE_ENV=test`, `LOG_LEVEL=error`. Created `.env.test.example` (committed) as documented template. Updated `.gitignore` to protect both `.env.test` and `tests/e2e/.auth/` (generated tokens directory).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing stub files used Jest globals instead of Playwright imports**

- **Found during:** Task 2 — `npx playwright test --list` crashed with `ReferenceError: describe is not defined`
- **Issue:** Three existing stub files (`auth.spec.ts`, `people.spec.ts`, `resources.spec.ts`) used `describe.skip()` and `test.skip()` without importing from `@playwright/test` — these are Jest globals, not Playwright APIs
- **Fix:** Added `import { test } from '@playwright/test'` to each file, converted `describe.skip()` → `test.describe.skip()` and `test.skip()` → `test()`
- **Files modified:** `tests/e2e/auth.spec.ts`, `tests/e2e/people.spec.ts`, `tests/e2e/resources.spec.ts`
- **Commit:** included in `011cd64`

## Verification Results

| Check                                              | Result            |
| -------------------------------------------------- | ----------------- |
| `npm list @faker-js/faker` shows >= 10.4.0         | ✅ 10.4.0         |
| `npm list dotenv-cli` shows >= 11.0.0              | ✅ 11.0.0         |
| Both in `package.json` devDependencies             | ✅                |
| `npx playwright test --list` runs without error    | ✅ 3 tests listed |
| `playwright.config.ts` exists at root              | ✅                |
| 3 projects (setup, e2e, teardown) configured       | ✅                |
| `workers: 1` and `fullyParallel: false`            | ✅                |
| `webServer` uses `dotenv -e .env.test`             | ✅                |
| `.env.test` exists with test DB URL                | ✅                |
| `.env.test` JWT_SECRET >= 32 chars                 | ✅ 51 chars       |
| `.env.test` has `NODE_ENV=test`, `LOG_LEVEL=error` | ✅                |
| `.env.test.example` exists with placeholder values | ✅                |
| `.gitignore` protects `.env.test`                  | ✅                |
| `.gitignore` protects `tests/e2e/.auth/`           | ✅                |

## Threat Mitigations Verified

| Threat                               | Disposition | Status                           |
| ------------------------------------ | ----------- | -------------------------------- |
| T-01-01: `.env.test` credential leak | mitigate    | ✅ `.env.test` gitignored        |
| T-01-02: `.auth/tokens.json` leak    | mitigate    | ✅ `tests/e2e/.auth/` gitignored |
| T-01-03: rate limiter DoS in tests   | accept      | ✅ Deferred to Phase 2+          |
| T-01-04: test JWT spoofing           | mitigate    | ✅ Dedicated 51-char test secret |

## Known Stubs

| File                          | Line | Description                        | Resolution                            |
| ----------------------------- | ---- | ---------------------------------- | ------------------------------------- |
| `tests/e2e/auth.spec.ts`      | 3    | `test.describe.skip` — placeholder | Phase 2 will implement auth spec      |
| `tests/e2e/people.spec.ts`    | 3    | `test.describe.skip` — placeholder | Phase 3 will implement people spec    |
| `tests/e2e/resources.spec.ts` | 3    | `test.describe.skip` — placeholder | Phase 2 will implement resources spec |

These stubs are intentional — they mark the module locations for future plan implementation. Each is assigned to a specific phase in the roadmap.

## Deferred Items

| Item                              | Reason                                                                             | Deferred To                     |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- |
| Rate limiter bypass for test mode | Accepted risk (T-01-03): Phase 1 tests make ~2 requests, far below 200/15min limit | Phase 2 (PITFALLS.md pitfall 4) |

---

## Plan Completion

- **Tasks completed:** 3/3
- **Commits:** 327eb76, 011cd64, 5a74780
- **Duration:** 4m 27s
- **Next:** Plan 01-02 (global setup + teardown + auth helpers)

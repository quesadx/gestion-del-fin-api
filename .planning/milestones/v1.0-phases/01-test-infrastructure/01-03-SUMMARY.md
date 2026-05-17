---
phase: 01-test-infrastructure
plan: 03
subsystem: test-infrastructure
tags: [e2e, helpers, auth, fixtures, assertions, test-data]
dependency_graph:
  requires: [01-01, 01-02]
  provides:
    - auth.ts (token loading, authorization headers, role-to-camp mapping)
    - fixtures.ts (6 pre-authenticated Playwright APIRequestContext fixtures)
    - assertions.ts (expectError, expectDataArray, expectEntity, expectCreated)
    - data.ts (centralized seed data constants)
  affects: [all 14 module spec files]
tech_stack:
  added: []
  patterns: [playwright-custom-fixtures, memoized-token-loading, reusable-assertions]
key_files:
  created:
    - tests/e2e/helpers/auth.ts
    - tests/e2e/helpers/fixtures.ts
    - tests/e2e/helpers/assertions.ts
    - tests/e2e/helpers/data.ts
  modified: []
decisions: []
metrics:
  duration: ~3m
  completed_date: '2026-05-17'
---

# Phase 01 Plan 03: Test Helper Standard Library Summary

**One-liner:** Created the 4 shared helper files (auth, fixtures, assertions, data) that serve as the standard library for all 14 E2E module spec files — eliminating auth boilerplate and enforcing consistent API response contract validation.

## Tasks Completed

| #   | Task              | Commit  | Files Created                                                  |
| --- | ----------------- | ------- | -------------------------------------------------------------- |
| 1   | Auth helper       | 27c52a4 | `tests/e2e/helpers/auth.ts`                                    |
| 2   | Custom fixtures   | 3bb860f | `tests/e2e/helpers/fixtures.ts`                                |
| 3   | Assertions + data | 91ebe1a | `tests/e2e/helpers/assertions.ts`, `tests/e2e/helpers/data.ts` |

## What Was Built

### auth.ts — Typed Token Loading and Authorization Headers

- **TestRole** type: union of 6 string literals (`admin_camp1` through `travel_coord_camp1`)
- **TestTokens** interface: typed shape for all 6 token keys matching `tokens.json` from global setup
- **loadTokens()**: memoized filesystem read — `tokens.json` loaded once and cached for the test run
- **authHeader(role)**: returns `{ Authorization: 'Bearer <token>' }` for Playwright request headers
- **getCampIdForRole(role)**: maps each token key to its seed-data camp ID (1 or 2) — used for cross-camp isolation assertions

### fixtures.ts — 6 Pre-authenticated Playwright Request Contexts

- Uses `base.extend<ApiFixtures>()` to inject role-specific `APIRequestContext` fixtures
- Re-exports all from `@playwright/test` so spec files import only from `../helpers/fixtures`
- 6 fixtures: `adminRequest`, `adminCamp2Request`, `workerCamp1Request`, `workerCamp2Request`, `resourceMgrRequest`, `travelCoordRequest`
- Each fixture: creates context with `baseURL: 'http://localhost:3000/api'`, `Content-Type: application/json`, and Bearer token; disposes after test
- Authenticated `request` fixture from Playwright still available for 401 error tests

### assertions.ts — Reusable HTTP Response Validators

- **expectError(response, status, message?)**: validates `{ error: { message, statusCode } }` envelope, checks status code matches `body.error.statusCode`
- **expectDataArray(response, minLength?)**: asserts 2xx + `body.data` is array, optional minimum length
- **expectEntity(response)**: asserts 2xx + `body.data` is truthy, returns entity for chaining
- **expectCreated(response)**: asserts status 201 then delegates to `expectEntity`

### data.ts — Centralized Seed Data Constants

- `TEST.camps.alphaOutpost` (id: 1) and `betaSanctuary` (id: 2) with names and locations
- `TEST.password`: `'test-password-123'` — shared test password matching global setup
- `TEST.roles`: all 4 role names (`system_admin`, `worker`, `resource_manager`, `travel_coordinator`)
- `TEST.users`: all 5 test user usernames matching seed data
- `TEST.resources`: rations (kg), water (Liters), antibiotics (Doses)
- `TEST.professions`: Engineer, Scout
- Uses `as const` for exact literal types and autocomplete
- No auto-increment IDs hardcoded (people, expeditions, transfers captured from API responses)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- [x] All 4 helper files exist in `tests/e2e/helpers/`
- [x] `auth.ts` exports all required functions (loadTokens, authHeader, getCampIdForRole) and types (TestRole, TestTokens)
- [x] `fixtures.ts` exports `test` with 6 extended fixtures, re-exports from `@playwright/test`
- [x] `assertions.ts` exports 4 reusable assertion functions (expectError, expectDataArray, expectEntity, expectCreated)
- [x] `data.ts` exports `TEST` constant with all seed values
- [x] Import graph is correct: `fixtures → auth → tokens.json`; no circular dependencies
- [x] All fixtures have `baseURL: 'http://localhost:3000/api'` and auth header
- [x] Each fixture properly calls `ctx.dispose()` after use
- [x] `as const` assertion provides readonly literal types
- [x] No stubs, TODOs, or placeholder values

## Self-Check: PASSED

All files confirmed present on disk. All 3 commits confirmed in git history.

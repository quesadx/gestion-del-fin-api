# Gestión del Fin API — Test Coverage

## What This Is

A comprehensive E2E test suite for the Gestión del Fin API — a multi-camp survival management backend built for the EIF209 capstone project (2026). The API manages survivor records, resources, expeditions, inter-camp transfers, and AI-driven admission decisions across 14 domain modules. This initiative adds full test coverage (happy path, error cases, edge cases) to every endpoint across all modules using Playwright for E2E tests.

## Core Value

Every API endpoint has demonstrable, passing tests that prove correct behavior under all conditions — giving the team confidence for the June 1 capstone defense where "pruebas de integración" are a graded requirement.

## Requirements

### Validated

- ✓ Auth flow — login/logout/register with JWT + session timeout — existing
- ✓ Camp CRUD — multi-camp management with scoped access — existing
- ✓ People management — survivor records, profession, status — existing
- ✓ Resource definitions — resource types, alert thresholds — existing
- ✓ Inventory tracking — per-camp stock, inflow/outflow logs — existing
- ✓ Expedition scheduling — participant assignment, ration consumption — existing
- ✓ Admission evaluation — AI-driven refugee decisions with manual override — existing
- ✓ Inter-camp transfers — resource/person movement, approval workflow — existing
- ✓ User management — system users, role/camp assignment — existing
- ✓ Role-based access — RBAC with fine-grained permissions — existing
- ✓ System health — server time endpoint, health checks — existing
- ✓ Dashboard metrics — analytics endpoints — existing
- ✓ Daily cron jobs — rations distribution, production, resource alerts — existing

### Active

- [ ] E2E test suite covering all 14 modules, every endpoint
- [ ] Happy path tests for all CRUD and workflow endpoints
- [ ] Error case tests — 401 (auth/session), 403 (role), 404 (not found), 409 (conflict), 400 (validation)
- [ ] Edge case tests — empty results, boundary values, pagination, cross-camp isolation
- [ ] Playwright config for API E2E testing
- [ ] Test data seeding/fixtures for reproducible test runs
- [ ] Auth helper utilities for test token generation

### Out of Scope

- Bug fixes (cross-camp data leakage, cron timing, rate limiting) — deferred, tests only
- Unit tests (Jest) — E2E focus; unit tests may follow later
- Frontend/browser E2E tests — API-level testing only
- Performance/stress testing — not in this scope

## Context

- **Project origin:** Universidad Nacional EIF209 capstone, "Gestión del fin" — zombie apocalypse survival camp management
- **Grading stages:** Base Inicial (8%) ✓ done, Aplicación Base (10%) due May 25, Defensa del Proyecto (14%) due June 1 (includes "pruebas de integración"), Presentación Final (8%) due June 15
- **Current state:** 14 modules fully implemented, codebase mapped at `.planning/codebase/`
- **Test infrastructure:** Playwright 1.58 installed, Jest configured for unit tests, 3 `describe.skip` stubs exist in `tests/e2e/`
- **Known gaps:** No `playwright.config.ts` exists yet; test database/seeding strategy needs definition
- **Key risks:** Tight deadline (June 1 defense); tests must be debuggable and auditable by professors

## Constraints

- **Tech stack:** Playwright (E2E), Jest (unit) — already in `package.json`
- **Time:** Complete test suite before June 1 capstone defense (2 weeks)
- **Scope:** Tests only — no production code changes, no bug fixes
- **Quality:** Tests must be self-contained, reproducible, and demonstrate clear pass/fail behavior

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| E2E tests only, no bug fixes | User prioritized test coverage over fixing known issues | — Pending |
| Full coverage: happy + error + edge | Capstone defense requires demonstrable correctness under all conditions | — Pending |
| Playwright for API E2E (not Jest+supertest) | Already in package.json, supports API testing with request context | — Pending |
| 14 modules, every endpoint | Complete coverage across all domain modules | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-17 after initialization*

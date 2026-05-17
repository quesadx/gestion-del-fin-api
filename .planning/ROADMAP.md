# Roadmap: Gestión del Fin API — E2E Test Suite

## Overview

Build a comprehensive E2E test suite covering all 14 API modules (66+ endpoints) using Playwright's `request` fixture. The journey starts with test infrastructure (config, DB seeding, auth helpers) — nothing works without it — then progresses through simple CRUD modules, RBAC + domain modules, and finally complex multi-step workflows (expeditions, transfers, admission) with metrics aggregation. Every phase delivers a testable, verifiable increment that adds value for the June 1 capstone defense.

## Phases

- [ ] **Phase 1: Test Infrastructure & Proof-of-Pattern** — Playwright config, test DB, auth helpers, system endpoint smoke tests
- [ ] **Phase 2: Auth & Foundation CRUD** — Authentication flows + camps/professions/resources CRUD with full error coverage
- [ ] **Phase 3: RBAC + Users + Domain CRUD** — Roles, permissions, users, people, and inventory with cross-camp isolation
- [ ] **Phase 4: Complex Workflows & Metrics** — Expeditions, transfers, admission (AI mocked), and dashboard metrics

## Phase Details

### Phase 1: Test Infrastructure & Proof-of-Pattern

**Goal**: The test harness is fully operational — Playwright auto-starts the server, the test database seeds and re-seeds deterministically, auth helpers generate valid tokens for all role/scope combinations, and system endpoints prove the pipeline works end-to-end.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, SYST-01, SYST-02
**Success Criteria** (what must be TRUE):

1. Running `npx playwright test` auto-starts the Express server with `NODE_ENV=test`, connects to the test database, and auto-stops after all tests complete — with serial execution (`workers: 1`) to prevent session middleware races
2. Auth helper utility generates valid JWT tokens for admin, memberCampA, memberCampB, and unauthenticated roles — all tokens accepted by protected API endpoints without per-test login boilerplate
3. Test database is provisioned with deterministic seed data (2 camps, 4 roles, 56 permissions, test users, resources, professions) before tests and cleaned up after; `.env.test` isolates credentials from development
4. System health endpoints (`GET /api/system/time`, `GET /api/system/health`) return correct responses — proving the test harness works end-to-end as a proof-of-pattern for all subsequent phases
   **Plans**: 4 plans

Plans:

- [ ] 01-01-PLAN.md — Playwright Configuration & Environment Setup (config, .env.test, dependencies)
- [ ] 01-02-PLAN.md — Global Setup, Database Seeding & Teardown (seed data, token generation, cleanup)
- [ ] 01-03-PLAN.md — Auth Helpers, Fixtures, Assertions & Data Constants (shared test utilities)
- [ ] 01-04-PLAN.md — System Module Smoke Tests (proof-of-pattern, public endpoints)

### Phase 2: Auth & Foundation CRUD

**Goal**: Authentication flows are verified and the canonical CRUD test pattern is proven on the simplest domain modules (camps, professions, resources) — establishing reusable patterns (happy path, error cases, edge cases) that all subsequent module tests will follow.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, CAMP-07, CAMP-08, CAMP-09, CAMP-10, CAMP-11, CAMP-12, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, RESC-01, RESC-02, RESC-03, RESC-04, RESC-05, RESC-06, RESC-07
**Success Criteria** (what must be TRUE):

1. User authentication flows are verified — login with valid credentials returns JWT token, login with missing fields returns 400, wrong password returns 401, duplicate email registration returns 409, logout invalidates the session
2. Admin can create, read, update, and delete camps with full error coverage — unauthenticated requests return 401, non-admin requests return 403, non-existent IDs return 404, invalid data returns 400, duplicate names return 409
3. Professions and resources follow the same CRUD pattern — happy path for all five operations (list, get, create, update, delete) plus full 401/403/404/400/409 error-case coverage for each module
4. Camp-scoped isolation is demonstrated — professions and resources belonging to CampA are visible to CampA members but not to CampB members; empty list edge case is verified
   **Plans**: TBD

### Phase 3: RBAC + Users + Domain CRUD

**Goal**: Role-based access control is fully verified, user management is tested with camp-scoped visibility, and domain modules with data dependencies (people, inventory) are proven with cross-camp isolation assertions — validating that camp boundaries are enforced across all data types.
**Depends on**: Phase 2
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, PERM-01, PERM-02, PERM-03, PERM-04, PERM-05, PERM-06, USER-01, USER-02, USER-03, USER-04, USER-05, USER-06, PEOP-01, PEOP-02, PEOP-03, PEOP-04, PEOP-05, PEOP-06, PEOP-07, PEOP-08, PEOP-09, INVT-01, INVT-02, INVT-03, INVT-04, INVT-05
**Success Criteria** (what must be TRUE):

1. Admin can manage roles and permissions with full CRUD coverage — all five operations (list, get, create, update, delete) for both modules plus 401/403/404/400/409 error cases per endpoint
2. Admin can manage system users with camp-scoped visibility — user creation properly assigns roles and camps; CampA members cannot list CampB users; user updates preserve data integrity
3. Camp members can manage people records with cross-camp isolation — a person created in CampA is invisible to CampB queries; null profession/status fields are handled correctly; pagination works with large result sets
4. Inventory endpoints return camp-scoped stock quantities — `POST /api/inventory/adjust` updates stock and the change is reflected in `GET /api/inventory`; cross-camp inventory isolation prevents one camp from seeing another's stock levels
   **Plans**: TBD

### Phase 4: Complex Workflows & Metrics

**Goal**: Multi-step state machines (expeditions, transfers, admission) are tested end-to-end with mocked AI dependencies, and dashboard metrics aggregate correctly across all seeded data — delivering the most impressive tests for the capstone defense.
**Depends on**: Phase 3
**Requirements**: EXPL-01, EXPL-02, EXPL-03, EXPL-04, EXPL-05, EXPL-06, EXPL-07, EXPL-08, TRAN-01, TRAN-02, TRAN-03, TRAN-04, TRAN-05, TRAN-06, TRAN-07, TRAN-08, TRAN-09, ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, METR-01, METR-02, METR-03, METR-04, METR-05
**Success Criteria** (what must be TRUE):

1. Expedition lifecycle works end-to-end — create expedition, add participants, transition status (depart/return), verify camp-scoped access; date-based scheduling handles cross-day spans correctly
2. Transfer workflow completes the full lifecycle — request from CampA → approve by CampB → mark complete; unaffiliated CampC cannot access the transfer; outgoing camp cannot approve its own transfer request
3. Admission evaluation endpoint returns AI-driven recommendations with AI mocked for deterministic results; manual override is possible and persisted; cross-camp isolation prevents evaluating refugees for another camp
4. Dashboard metrics endpoints return correct aggregated counts — survivors, resources, and expedition statistics match seeded data; empty-camp (zero survivors, zero resources) returns zeros not errors
   **Plans**: TBD

## Progress

| Phase                                     | Plans Complete | Status      | Completed |
| ----------------------------------------- | -------------- | ----------- | --------- |
| 1. Test Infrastructure & Proof-of-Pattern | 0/4            | Planned     | -         |
| 2. Auth & Foundation CRUD                 | 0/TBD          | Not started | -         |
| 3. RBAC + Users + Domain CRUD             | 0/TBD          | Not started | -         |
| 4. Complex Workflows & Metrics            | 0/TBD          | Not started | -         |

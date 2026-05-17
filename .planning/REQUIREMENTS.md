# Requirements: Gestión del Fin API — E2E Test Suite

**Defined:** 2026-05-17
**Core Value:** Every API endpoint has demonstrable, passing tests that prove correct behavior under all conditions

## v1 Requirements

Requirements for the complete E2E test suite. Each maps to roadmap phases.

### Test Infrastructure

- [ ] **INFRA-01**: Playwright config exists with `webServer` auto-starting Express, `baseURL`, `NODE_ENV=test`, and project dependencies for setup/teardown
- [ ] **INFRA-02**: Global setup script runs Prisma migrations and seeds the test database before all tests
- [ ] **INFRA-03**: Global teardown script cleans up test data after all tests complete
- [ ] **INFRA-04**: Auth helper utility generates valid JWT tokens for all role/scope combinations (admin, memberCampA, memberCampB, noAuth) via `signAccessToken()`
- [ ] **INFRA-05**: Custom Playwright fixtures provide pre-authenticated `APIRequestContext` per role, eliminating per-test login boilerplate
- [ ] **INFRA-06**: Test data factory using `@faker-js/faker` generates unique dynamic data for create/update operations
- [ ] **INFRA-07**: `.env.test` file separates test DB credentials from development
- [ ] **INFRA-08**: Serial execution configured (`workers: 1`, `fullyParallel: false`) to prevent session middleware races

### System Module

- [ ] **SYST-01**: Happy path — `GET /api/system/time` returns server timestamp
- [ ] **SYST-02**: Happy path — `GET /api/system/health` returns healthy status

### Auth Module

- [ ] **AUTH-01**: Happy path — `POST /api/auth/login` with valid credentials returns JWT
- [ ] **AUTH-02**: Happy path — `POST /api/auth/register` creates new user
- [ ] **AUTH-03**: Happy path — `POST /api/auth/logout` invalidates session
- [ ] **AUTH-04**: Error 400 — login with missing email or password returns validation error
- [ ] **AUTH-05**: Error 401 — login with wrong password returns unauthorized
- [ ] **AUTH-06**: Error 409 — register with duplicate email returns conflict

### Camps Module

- [ ] **CAMP-01**: Happy path — `GET /api/camps` returns list of camps
- [ ] **CAMP-02**: Happy path — `GET /api/camps/:id` returns single camp with details
- [ ] **CAMP-03**: Happy path — `POST /api/camps` creates new camp (admin)
- [ ] **CAMP-04**: Happy path — `PUT /api/camps/:id` updates camp (admin)
- [ ] **CAMP-05**: Happy path — `DELETE /api/camps/:id` deletes camp (admin)
- [ ] **CAMP-06**: Error 401 — unauthenticated access to protected endpoints
- [ ] **CAMP-07**: Error 403 — non-admin tries to create/update/delete camp
- [ ] **CAMP-08**: Error 404 — GET/PUT/DELETE with non-existent camp ID
- [ ] **CAMP-09**: Error 400 — create camp with invalid/missing name
- [ ] **CAMP-10**: Error 409 — create camp with duplicate name
- [ ] **CAMP-11**: Edge — empty camp list when no camps exist (after teardown)
- [ ] **CAMP-12**: Edge — camp list pagination with multiple pages

### Professions Module

- [ ] **PROF-01**: Happy path — `GET /api/professions` returns list
- [ ] **PROF-02**: Happy path — `GET /api/professions/:id` returns single profession
- [ ] **PROF-03**: Happy path — `POST /api/professions` creates new profession
- [ ] **PROF-04**: Happy path — `PUT /api/professions/:id` updates profession
- [ ] **PROF-05**: Happy path — `DELETE /api/professions/:id` deletes profession
- [ ] **PROF-06**: Error 401/403/404/400/409 coverage for all endpoints
- [ ] **PROF-07**: Edge — cross-camp isolation (memberCampA cannot access CampB professions)

### Resources Module

- [ ] **RESC-01**: Happy path — `GET /api/resources` returns list
- [ ] **RESC-02**: Happy path — `GET /api/resources/:id` returns single resource
- [ ] **RESC-03**: Happy path — `POST /api/resources` creates new resource type
- [ ] **RESC-04**: Happy path — `PUT /api/resources/:id` updates resource type
- [ ] **RESC-05**: Happy path — `DELETE /api/resources/:id` deletes resource type
- [ ] **RESC-06**: Error 401/403/404/400/409 coverage for all endpoints
- [ ] **RESC-07**: Edge — cross-camp isolation for resource access

### Roles Module

- [ ] **ROLE-01**: Happy path — `GET /api/roles` returns list
- [ ] **ROLE-02**: Happy path — `GET /api/roles/:id` returns single role with permissions
- [ ] **ROLE-03**: Happy path — `POST /api/roles` creates new role (admin)
- [ ] **ROLE-04**: Happy path — `PUT /api/roles/:id` updates role (admin)
- [ ] **ROLE-05**: Happy path — `DELETE /api/roles/:id` deletes role (admin)
- [ ] **ROLE-06**: Error 401/403/404/400/409 coverage for all endpoints

### Permissions Module

- [ ] **PERM-01**: Happy path — `GET /api/permissions` returns list
- [ ] **PERM-02**: Happy path — `GET /api/permissions/:id` returns single permission
- [ ] **PERM-03**: Happy path — `POST /api/permissions` creates new permission (admin)
- [ ] **PERM-04**: Happy path — `PUT /api/permissions/:id` updates permission (admin)
- [ ] **PERM-05**: Happy path — `DELETE /api/permissions/:id` deletes permission (admin)
- [ ] **PERM-06**: Error 401/403/404/400/409 coverage for all endpoints

### Users Module

- [ ] **USER-01**: Happy path — `GET /api/users` returns list
- [ ] **USER-02**: Happy path — `GET /api/users/:id` returns single user
- [ ] **USER-03**: Happy path — `POST /api/users` creates new user (admin)
- [ ] **USER-04**: Happy path — `PUT /api/users/:id` updates user (admin)
- [ ] **USER-05**: Error 401/403/404/400/409 coverage for all endpoints
- [ ] **USER-06**: Edge — cross-camp isolation (memberCampA cannot list CampB users)

### People Module

- [ ] **PEOP-01**: Happy path — `GET /api/people` returns list scoped to camp
- [ ] **PEOP-02**: Happy path — `GET /api/people/:id` returns single person
- [ ] **PEOP-03**: Happy path — `POST /api/people` creates new person
- [ ] **PEOP-04**: Happy path — `PUT /api/people/:id` updates person
- [ ] **PEOP-05**: Happy path — `DELETE /api/people/:id` deletes person
- [ ] **PEOP-06**: Error 401/403/404/400/409 coverage for all endpoints
- [ ] **PEOP-07**: Edge — cross-camp isolation (CampA person not visible to CampB)
- [ ] **PEOP-08**: Edge — person with null profession/status fields
- [ ] **PEOP-09**: Edge — pagination with large result set

### Inventory Module

- [ ] **INVT-01**: Happy path — `GET /api/inventory` returns camp inventory
- [ ] **INVT-02**: Happy path — `POST /api/inventory/adjust` adjusts stock quantity
- [ ] **INVT-03**: Error 401/403/404/400 coverage for all endpoints
- [ ] **INVT-04**: Edge — cross-camp isolation (CampA inventory not visible to CampB)
- [ ] **INVT-05**: Edge — inventory after daily ration distribution

### Explorations Module

- [ ] **EXPL-01**: Happy path — `GET /api/expeditions` returns list scoped to camp
- [ ] **EXPL-02**: Happy path — `GET /api/expeditions/:id` returns single expedition
- [ ] **EXPL-03**: Happy path — `POST /api/expeditions` creates new expedition
- [ ] **EXPL-04**: Happy path — `PUT /api/expeditions/:id` updates expedition
- [ ] **EXPL-05**: Happy path — `PUT /api/expeditions/:id/status` updates expedition status
- [ ] **EXPL-06**: Error 401/403/404/400/409 coverage for all endpoints
- [ ] **EXPL-07**: Edge — cross-camp isolation for expedition access
- [ ] **EXPL-08**: Edge — expedition scheduling with dates spanning across days

### Transfers Module

- [ ] **TRAN-01**: Happy path — `POST /api/transfers` creates transfer request from CampA to CampB
- [ ] **TRAN-02**: Happy path — `GET /api/transfers` returns transfers list
- [ ] **TRAN-03**: Happy path — `GET /api/transfers/:id` returns single transfer
- [ ] **TRAN-04**: Happy path — `PUT /api/transfers/:id/approve` approves transfer (target camp)
- [ ] **TRAN-05**: Happy path — `PUT /api/transfers/:id/complete` completes transfer
- [ ] **TRAN-06**: Happy path — complete transfer lifecycle (request → approve → complete) end-to-end
- [ ] **TRAN-07**: Error 401/403/404/400/409 coverage for all endpoints
- [ ] **TRAN-08**: Edge — cross-camp isolation (CampC cannot see CampA-to-CampB transfer)
- [ ] **TRAN-09**: Edge — cannot approve own camp's outgoing transfer

### Admission Module

- [ ] **ADMN-01**: Happy path — `POST /api/admission/camps/:campId/evaluate` evaluates refugee (AI mocked)
- [ ] **ADMN-02**: Happy path — `GET /api/admission/:evaluationId` returns evaluation results
- [ ] **ADMN-03**: Happy path — manual override of AI admission decision
- [ ] **ADMN-04**: Error 401/403/404/400 coverage for all endpoints
- [ ] **ADMN-05**: Error 429 — rate limit exceeded (10 req/min) returns 429
- [ ] **ADMN-06**: Edge — cross-camp isolation (CampA cannot evaluate for CampB)

### Metrics Module

- [ ] **METR-01**: Happy path — `GET /api/metrics/survivors` returns survivor counts
- [ ] **METR-02**: Happy path — `GET /api/metrics/resources` returns resource metrics
- [ ] **METR-03**: Happy path — `GET /api/metrics/expeditions` returns expedition stats
- [ ] **METR-04**: Error 401/403 coverage for all endpoints
- [ ] **METR-05**: Edge — metrics for empty camp (zero survivors, zero resources)

## v2 Requirements

Deferred to future release. Not in current roadmap.

- **PERF-01**: Performance/stress tests with realistic data volume
- **UNIT-01**: Jest unit tests for service layer and utilities
- **BROW-01**: Browser-based E2E tests for frontend (not applicable — API only)
- **CRON-01**: Tests for cron job behaviors (daily rations, production, alerts)

## Out of Scope

| Feature                             | Reason                                                                |
| ----------------------------------- | --------------------------------------------------------------------- |
| Production code changes (bug fixes) | User directive — tests only, no fixes                                 |
| Jest unit tests                     | E2E focus; unit tests deferred                                        |
| Browser UI tests                    | API-only testing with Playwright `request` fixture                    |
| CI/CD GitHub Actions                | Not required for capstone defense; documented pattern ready if needed |
| Session timeout behavioral tests    | 20-min real-time wait infeasible; covered by auth boundary tests      |
| Real AI/ML integration in tests     | Non-deterministic; mocked for reliability                             |

## Traceability

| Requirement               | Phase   | Status  |
| ------------------------- | ------- | ------- |
| INFRA-01 through INFRA-08 | Phase 1 | Pending |
| SYST-01, SYST-02          | Phase 2 | Pending |
| AUTH-01 through AUTH-06   | Phase 2 | Pending |
| CAMP-01 through CAMP-12   | Phase 3 | Pending |
| PROF-01 through PROF-07   | Phase 3 | Pending |
| RESC-01 through RESC-07   | Phase 3 | Pending |
| ROLE-01 through ROLE-06   | Phase 4 | Pending |
| PERM-01 through PERM-06   | Phase 4 | Pending |
| USER-01 through USER-06   | Phase 4 | Pending |
| PEOP-01 through PEOP-09   | Phase 5 | Pending |
| INVT-01 through INVT-05   | Phase 5 | Pending |
| EXPL-01 through EXPL-08   | Phase 6 | Pending |
| TRAN-01 through TRAN-09   | Phase 6 | Pending |
| ADMN-01 through ADMN-06   | Phase 6 | Pending |
| METR-01 through METR-05   | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 102 total
- Mapped to phases: 102
- Unmapped: 0 ✓

---

_Requirements defined: 2026-05-17_
_Last updated: 2026-05-17 after initial definition_

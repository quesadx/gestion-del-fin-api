# Codebase Structure

**Analysis Date:** 2026-05-17

## Directory Layout

```
gestion-del-fin-api/
│
├── .github/                     # GitHub CI/CD workflows
├── .planning/                   # GSD planning docs
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── CONCERNS.md
│       ├── CONVENTIONS.md
│       ├── INTEGRATIONS.md
│       ├── STACK.md
│       ├── STRUCTURE.md
│       └── TESTING.md
├── .vscode/                     # VS Code settings
│
├── apps/                        # Monorepo apps (legacy/transitional)
│   └── backend/
│       └── src/generated/prisma/ # Stale copy of generated Prisma client (likely unused)
│
├── docker/                      # Docker support files
│   └── db/init/                 # PostgreSQL init scripts
│
├── docs/                        # Project documentation
│   ├── admission_ai.md
│   ├── agent.md
│   ├── base-crud-flow.md
│   ├── core.md
│   ├── foundation.md
│   ├── gestion-del-fin.mwb      # MySQL Workbench model (legacy)
│   └── proyecto-programado.md   # Original project spec (grading criteria)
│
├── logs/                        # Runtime log files (gitignored)
│
├── ml-service/                  # Python ML microservice (FastAPI + sklearn)
│   ├── main.py                  # FastAPI app: /health, /evaluate
│   ├── decision_tree.py         # DecisionTreeClassifier + feature extraction
│   ├── data.py                  # Synthetic training data generator
│   ├── trainer.py               # Standalone training script
│   ├── Dockerfile               # Python 3.12-slim
│   └── requirements.txt         # fastapi, uvicorn, scikit-learn, pandas, numpy, pydantic
│
├── prisma/                      # Database schema & migrations
│   ├── schema.prisma            # 20 models, 8 enums, PostgreSQL (512 lines)
│   └── migrations/
│       ├── 20260514212603_initial_postgresql_schema/
│       ├── 20260516065555_add_permissions/
│       └── 20260516185527_remove_post_legacy/
│
├── scripts/
│   └── smoke-test-endpoints.sh  # Quick endpoint smoke test
│
├── src/                         # Application source (TypeScript, ESM)
│   ├── index.ts                 # Entry point — server bootstrap (113 lines)
│   ├── ai/                      # AI orchestration layer
│   │   └── admission-evaluator.ts  # Groq LLM + ML decision tree orchestrator (167 lines)
│   ├── docs/                    # API documentation
│   │   ├── openapi.yaml         # OpenAPI 3.0 spec YAML
│   │   └── swagger.ts           # Swagger UI setup (loads YAML, serves /api/docs)
│   ├── generated/               # Auto-generated Prisma client (committed)
│   │   └── prisma/
│   │       ├── client.ts        # PrismaClient class
│   │       ├── browser.ts       # Browser bundle
│   │       ├── enums.ts         # Generated enums
│   │       ├── models.ts        # Model types
│   │       ├── commonInputTypes.ts
│   │       ├── internal/
│   │       └── models/
│   ├── jobs/                    # Cron job definitions
│   │   ├── scheduler.ts         # node-cron registration (start/stop lifecycle) (85 lines)
│   │   ├── daily-rations.job.ts # Food/resource distribution per camp (177 lines)
│   │   ├── daily-production.job.ts # Profession-based resource production (131 lines)
│   │   └── resource-alerts.job.ts  # Low-stock alert generation (33 lines)
│   ├── lib/                     # Singleton library instances
│   │   ├── prisma.ts            # PrismaClient with @prisma/adapter-pg (23 lines)
│   │   └── ai.ts                # Groq SDK client instance (3 lines)
│   ├── logger/                  # Logging configuration
│   │   └── logger.ts            # Winston with daily rotate + error log (48 lines)
│   ├── middlewares/             # Express middleware (8 files)
│   │   ├── auth.middleware.ts        # JWT verify, attach user to req (28 lines)
│   │   ├── session.middleware.ts     # 20-min inactivity timeout (57 lines)
│   │   ├── camp.middleware.ts        # Camp-scoping enforcement, admin bypass (94 lines)
│   │   ├── role.middleware.ts        # RBAC — role name check (45 lines)
│   │   ├── permission.middleware.ts  # Fine-grained permission check (59 lines)
│   │   ├── rateLimit.middleware.ts   # Global + login + admission rate limits (46 lines)
│   │   ├── validate.middleware.ts    # Zod schema validation middleware (47 lines)
│   │   └── error.middleware.ts       # Global catch-all error handler (69 lines)
│   ├── modules/                 # Domain modules (14 modules)
│   │   ├── admission/
│   │   │   ├── admission.schema.ts
│   │   │   ├── admission.routes.ts
│   │   │   ├── admission.controller.ts
│   │   │   └── admission.service.ts
│   │   ├── auth/
│   │   │   ├── auth.schema.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── camps/
│   │   │   ├── camps.schema.ts
│   │   │   ├── camps.routes.ts
│   │   │   ├── camps.controller.ts
│   │   │   └── camps.service.ts
│   │   ├── explorations/
│   │   │   ├── explorations.schema.ts
│   │   │   ├── explorations.routes.ts
│   │   │   ├── explorations.controller.ts
│   │   │   └── explorations.service.ts
│   │   ├── inventory/
│   │   │   ├── inventory.schema.ts
│   │   │   ├── inventory.routes.ts
│   │   │   ├── inventory.controller.ts
│   │   │   └── inventory.service.ts
│   │   ├── metrics/
│   │   │   ├── metrics.schema.ts
│   │   │   ├── metrics.routes.ts
│   │   │   ├── metrics.controller.ts
│   │   │   └── metrics.service.ts
│   │   ├── people/
│   │   │   ├── people.schema.ts
│   │   │   ├── people.routes.ts
│   │   │   ├── people.controller.ts
│   │   │   └── people.service.ts
│   │   ├── permissions/
│   │   │   ├── permissions.schema.ts
│   │   │   ├── permissions.routes.ts
│   │   │   ├── permissions.controller.ts
│   │   │   └── permissions.service.ts
│   │   ├── professions/
│   │   │   ├── professions.schema.ts
│   │   │   ├── professions.routes.ts
│   │   │   ├── professions.controller.ts
│   │   │   └── professions.service.ts
│   │   ├── resources/
│   │   │   ├── resources.schema.ts
│   │   │   ├── resources.routes.ts
│   │   │   ├── resources.controller.ts
│   │   │   └── resources.service.ts
│   │   ├── roles/
│   │   │   ├── roles.schema.ts
│   │   │   ├── roles.routes.ts
│   │   │   ├── roles.controller.ts
│   │   │   └── roles.service.ts
│   │   ├── system/
│   │   │   ├── system.routes.ts
│   │   │   ├── system.controller.ts
│   │   │   └── system.service.ts     # (no schema file — single endpoint)
│   │   ├── transfers/
│   │   │   ├── transfers.schema.ts
│   │   │   ├── transfers.routes.ts
│   │   │   ├── transfers.controller.ts
│   │   │   └── transfers.service.ts
│   │   └── users/
│   │       ├── users.schema.ts
│   │       ├── users.routes.ts
│   │       ├── users.controller.ts
│   │       └── users.service.ts
│   └── shared/                  # Shared utilities, constants, types
│       ├── constants/
│       │   ├── camp-rules.ts     # TODO: not implemented
│       │   ├── permissions.ts    # 56 permission string constants (58 lines)
│       │   └── roles.ts          # 4 role name constants (7 lines)
│       ├── schemas/
│       │   └── http.schema.ts    # idParamsSchema, paginationQuerySchema (12 lines)
│       ├── types/
│       │   └── index.ts          # Re-exports RoleName type
│       └── utils/
│           ├── appError.ts       # AppError class (9 lines)
│           ├── auditLog.ts       # Fire-and-forget write to audit_logs (30 lines)
│           ├── handlePrismaError.ts # P2002/P2003 → AppError converters (16 lines)
│           ├── jwt.ts            # JWT sign/verify, token payload type (93 lines)
│           ├── parseIdParam.ts   # Safe numeric ID extraction (10 lines)
│           └── server-time.ts    # now(), nowISO(), today() (7 lines)
│
├── tests/                       # Test suites
│   ├── unit/
│   │   ├── ai/placeholder       # Placeholder — NO actual AI unit tests
│   │   └── jobs/placeholder     # Placeholder — NO actual job unit tests
│   └── e2e/                     # Playwright E2E tests
│       ├── admission.spec.ts
│       ├── auth.spec.ts
│       ├── camps.spec.ts
│       ├── expeditions.spec.ts
│       ├── global.setup.ts      # Test global setup (e.g., DB reset)
│       ├── global.teardown.ts   # Test global teardown
│       ├── helpers/
│       │   ├── assertions.ts    # Custom assertion helpers
│       │   ├── auth.ts          # Auth helper (login, get token)
│       │   ├── data.ts          # Test data builders
│       │   └── fixtures.ts      # Test fixtures (predefined data)
│       ├── inventory.spec.ts
│       ├── metrics.spec.ts
│       ├── people.spec.ts
│       ├── permissions.spec.ts
│       ├── professions.spec.ts
│       ├── resources.spec.ts
│       ├── roles.spec.ts
│       ├── system.spec.ts
│       ├── transfers.spec.ts
│       └── users.spec.ts
│
├── .env.example                 # Environment variable template
├── .env.test.example            # Test environment variable template
├── .env                         # Runtime env vars (gitignored, NEVER read)
├── .envrc                       # direnv config
├── .direnv/                     # direnv cache
├── .gitignore
├── .prettierrc                  # Prettier formatting config
├── .prettierignore
├── AGENTS.md                    # Agent instructions (this file)
├── cspell.json                  # Spell checking config
├── docker-compose.yml           # Multi-container orchestration (PostgreSQL + ML service)
├── Dockerfile                   # Multi-stage Node.js production build
├── eslint.config.js             # ESLint flat config
├── flake.nix                    # Nix flake (dev shell)
├── flake.lock                   # Nix flake lockfile
├── jest.config.ts               # Jest config (ts-jest, node env)
├── package.json                 # Node.js deps & scripts (ESM, type: module)
├── package-lock.json
├── playwright.config.ts         # Playwright config for E2E tests
├── prisma.config.ts             # Prisma CLI config (datasource, migrations, seed)
├── README.md                    # Project README
└── tsconfig.json                # TypeScript strict, ES2022, Node16 (19 lines)
```

## Directory Purposes

**`src/` — Application source:**
- **Purpose**: All TypeScript application code — entry point, middleware, modules, AI, jobs, shared utilities, logger, Prisma client
- **Contains**: 10 subdirectories, ~55 source files
- **Key files**: `src/index.ts` (server bootstrap), `src/lib/prisma.ts` (DB client singleton)

**`src/modules/` — Domain modules:**
- **Purpose**: Self-contained domain logic following canonical pattern (schema → routes → controller → service)
- **Contains**: 14 module directories, 13 with 4 files each, `system/` has 3 files (no schema)
- **Entry point registration**: All modules registered in `src/index.ts` at lines 57-70

**`src/middlewares/` — Express middleware:**
- **Purpose**: Cross-cutting request processing — auth, session, camp scoping, permissions, validation, rate limiting, error handling
- **Contains**: 8 middleware files, each with a single responsibility
- **Application order**: Global (rateLimit, helmet, cors) → Per-route-group (auth → session → camp) → Per-route (permissionMiddleware → validate)

**`src/shared/` — Shared code:**
- **Purpose**: Reusable utilities, constants, schemas, types — no domain logic
- **Contains**: `utils/` (6 files), `constants/` (3 files), `schemas/` (1 file), `types/` (1 file)
- **Key files**: `appError.ts` (error class), `jwt.ts` (auth logic), `permissions.ts` (56 permission constants)

**`src/ai/` — AI integration:**
- **Purpose**: Orchestration of Groq LLM and Python ML service for admission evaluation
- **Contains**: 1 file — `admission-evaluator.ts` (158 lines) with prompt injection defenses
- **Dependencies**: `lib/ai.ts` (Groq SDK client), `ml-service/` (Python microservice)

**`src/jobs/` — Cron jobs:**
- **Purpose**: Scheduled background tasks — daily rations, daily production, resource alerts
- **Contains**: `scheduler.ts` (orchestrator) + 3 job files
- **Lifecycle**: Started in `src/index.ts:93` (not in test env), stopped on graceful shutdown

**`src/lib/` — Singleton instances:**
- **Purpose**: Single Prisma client and Groq AI client for the entire application
- **Contains**: `prisma.ts` (PrismaClient with PostgreSQL adapter), `ai.ts` (Groq SDK init)

**`ml-service/` — ML microservice:**
- **Purpose**: Independent Python/FastAPI container running a scikit-learn DecisionTree
- **Contains**: 6 Python files, Dockerfile, requirements.txt
- **Deployment**: Separate container in `docker-compose.yml`, communicates via HTTP on port 8000

**`prisma/` — Database schema:**
- **Purpose**: PostgreSQL schema definition, migration history, seed script
- **Contains**: `schema.prisma` (512 lines, 20 models, 8 enums), 3 migration directories
- **Generated client output**: `src/generated/prisma/`

**`tests/` — Test suites:**
- **Purpose**: Unit tests (Jest) and E2E tests (Playwright)
- **Contains**: `unit/` (placeholder), `e2e/` (15 spec files + 4 helpers)

## Module-by-Module Inventory

| Module | Route Prefix | Files | Key Endpoints | Key Features |
|--------|-------------|-------|---------------|--------------|
| **admission** | `/api/admission` | schema, routes, controller, service | `POST /camps/:campId`, `GET /camps/:campId`, `GET /:id`, `PATCH /:id/review` | AI+ML evaluation, admissionRateLimit (10/min), auto person creation on accept, Zod-enforced AI output |
| **auth** | `/api/auth` | schema, routes, controller, service | `POST /login`, `POST /logout` | JWT issuance, bcrypt password verify, session version bump on logout, loginRateLimit (5/15min) |
| **camps** | `/api/camps` | schema, routes, controller, service | CRUD `/camps/:id`, `GET /camps` | Reference CRUD pattern, pagination (max pageSize 100), nested `/:campId/people` routes |
| **explorations** | `/api/expeditions` | schema, routes, controller, service | `POST /`, `GET /:id`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id` | Expedition lifecycle (PLANNED→ONGOING→RETURNED/CANCELLED), resource allocation+finding, members |
| **inventory** | `/api/inventory` | schema, routes, controller, service | `GET /:campId`, `GET /audit/:campId`, `POST /adjustment` | Per-camp stock balances, movement audit log, manual in/out adjustments |
| **metrics** | `/api/metrics` | schema, routes, controller, service | `GET /dashboard`, `/resources`, `/people`, `/expeditions` | 4 permission-gated endpoints, aggregated analytics |
| **people** | `/api/camps/:campId/people` | schema, routes, controller, service | CRUD `/:id`, `POST /status-log`, `/profession-reassignments`, `/contribution-overrides` | Survivor records, status transitions (SICK/HEALTHY/INJURED/AWAY/DEAD), profession history |
| **permissions** | `/api/permissions` | schema, routes, controller, service | CRUD `/permissions/:id` | Fine-grained permission catalog (56 permissions), linked to roles via `role_permissions` |
| **professions** | `/api/professions` | schema, routes, controller, service | CRUD `/professions/:id` | Job catalog, resource production amounts per profession |
| **resources** | `/api/resources` | schema, routes, controller, service | CRUD `/resources/:id` | Resource type definitions (name, unit, daily_ration, minimum_stock, auto_daily) |
| **roles** | `/api/roles` | schema, routes, controller, service | CRUD `/roles/:id` | Role catalog (system_admin, worker, resource_manager, travel_coordinator) |
| **system** | `/api/system` | routes, controller, service | `GET /time` | Public endpoint — server time (no middleware, no schema file) |
| **transfers** | `/api/transfers` | schema, routes, controller, service | `POST /`, `GET /:id`, `PATCH /:id/schedule`, `/approve-source`, `/approve-target`, `/complete`, `/reject` | Full transfer lifecycle with 2-step approval, 7 permission gates, Prisma $transaction |
| **users** | `/api/users` | schema, routes, controller, service | CRUD `/users/:id` | System user CRUD, role + camp assignment, session management |

## Key File Locations

**Entry Points:**
- `src/index.ts`: Server bootstrap — all middleware + routes + job scheduler
- `src/jobs/scheduler.ts`: Cron job registration and lifecycle
- `ml-service/main.py`: ML service FastAPI entry point
- `prisma/seed.ts`: Database seed script

**Configuration:**
- `tsconfig.json`: TypeScript strict mode, ES2022 target, Node16 module resolution
- `jest.config.ts`: Jest with ts-jest, node test environment
- `playwright.config.ts`: Playwright E2E test configuration
- `eslint.config.js`: ESLint flat config for TypeScript
- `.prettierrc`: Prettier formatting rules
- `prisma.config.ts`: Prisma CLI config (datasource URL, migrations path, seed)
- `docker-compose.yml`: PostgreSQL + ML service orchestration
- `Dockerfile`: Multi-stage Node.js production build
- `cspell.json`: Spell checker configuration

**Core Logic (by layer):**

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| Server bootstrap | `src/index.ts` | 113 | App creation, middleware, route mounting, job start |
| Prisma client | `src/lib/prisma.ts` | 23 | PrismaClient singleton with PostgreSQL adapter |
| JWT auth | `src/shared/utils/jwt.ts` | 93 | Token sign/verify, Bearer extraction, payload validation |
| Session management | `src/middlewares/session.middleware.ts` | 57 | 20-min inactivity, session_version concurrency |
| Camp scoping | `src/middlewares/camp.middleware.ts` | 94 | URL-based camp extraction, admin bypass |
| Permission check | `src/middlewares/permission.middleware.ts` | 59 | Role→permission DB lookup, 403 enforcement |
| Error handling | `src/middlewares/error.middleware.ts` | 69 | AppError, ZodError, Prisma error mapping, 500 fallback |
| AI orchestration | `src/ai/admission-evaluator.ts` | 167 | Groq LLM + ML service + profession mapping |
| ML classifier | `ml-service/decision_tree.py` | ~180 | Feature extraction, DecisionTree predict, feature importance |
| Job scheduler | `src/jobs/scheduler.ts` | 85 | node-cron registration, start/stop lifecycle |
| Daily rations | `src/jobs/daily-rations.job.ts` | 177 | Priority-based resource distribution per camp |
| Daily production | `src/jobs/daily-production.job.ts` | 131 | Profession-based + override-based resource generation |
| Permission constants | `src/shared/constants/permissions.ts` | 58 | 56 permission string constants for RBAC |
| Database schema | `prisma/schema.prisma` | 512 | 20 models, 8 enums, PostgreSQL |

## Naming Conventions

**Files:**
- Module files: `{module}.{layer}.ts` — e.g., `camps.routes.ts`, `camps.controller.ts`, `camps.service.ts`, `camps.schema.ts`
- Middleware files: `{name}.middleware.ts` — e.g., `auth.middleware.ts`, `camp.middleware.ts`
- Shared utility files: `camelCase.ts` — e.g., `appError.ts`, `parseIdParam.ts`, `server-time.ts`
- Constant files: `kebab-case.ts` — e.g., `camp-rules.ts`
- Schema files: `{module}.schema.ts` — e.g., `camps.schema.ts`
- Job files: `kebab-case.job.ts` — e.g., `daily-rations.job.ts`
- E2E test files: `{module}.spec.ts` — e.g., `auth.spec.ts`, `camps.spec.ts`

**Directories:**
- Modules: `lowercase` — `camps/`, `admission/`, `explorations/`
- Middleware: `middlewares/` (plural)
- Shared subdirs: `constants/`, `schemas/`, `types/`, `utils/`
- Test subdirs: `unit/`, `e2e/`

**Functions/Handlers:**
- Controller handlers: `{action}{Entity}Handler` — e.g., `createCampHandler`, `getUsersHandler`, `updateCampHandler`
- Service functions: `{action}{Entity}` — e.g., `createCamp`, `getUsers`, `updateCamp`
- Middleware factories: `{name}Middleware` — e.g., `permissionMiddleware`, `roleMiddleware`, `validate`
- Job functions: `execute()` — all jobs export a uniform `execute()` function

**Types/Interfaces:**
- DTOs: `{Action}{Entity}Dto` — e.g., `CreateCampDto`, `UpdateCampDto` (inferred from Zod schemas)
- Request extensions: `AuthenticatedRequest` (extends Express Request)
- Schema inferred types: `z.infer<typeof createCampSchema>`

## Where to Add New Code

**New Feature (domain module):**
1. Create `src/modules/{moduleName}/` directory
2. Add files: `{name}.schema.ts`, `{name}.routes.ts`, `{name}.controller.ts`, `{name}.service.ts`
3. Register in `src/index.ts`: import routes, mount under `/api/{name}` with `authMiddleware, sessionMiddleware, campMiddleware` chain
4. Add permission constants in `src/shared/constants/permissions.ts`
5. Add tests: `tests/unit/{moduleName}/` (Jest), `tests/e2e/{moduleName}.spec.ts` (Playwright)
6. Add OpenAPI docs in `src/docs/openapi.yaml`

**New Middleware:**
- Implementation: `src/middlewares/{name}.middleware.ts`
- Apply in: `src/index.ts` (globally before route groups) or inside route files (per-route, like `admissionRateLimit`)

**New Utility:**
- Shared helper: `src/shared/utils/{name}.ts`
- Constant/Enum: `src/shared/constants/{name}.ts`
- Reusable Zod schema: `src/shared/schemas/{name}.ts`
- Type: `src/shared/types/`

**New Cron Job:**
1. Create `src/jobs/{name}.job.ts` with `execute()` export
2. Register in `src/jobs/scheduler.ts` — import and add `cron.schedule()` call
3. Optionally add env var for cron expression

**New AI/ML Feature:**
- AI orchestration: `src/ai/{name}.ts`
- ML model/service: `ml-service/` — add new endpoint in `main.py` or new module

## Special Directories

**`src/generated/`:**
- **Purpose**: Prisma client auto-generation output
- **Generated**: Yes — by `npx prisma generate`
- **Committed**: Yes (required for builds without Prisma CLI)
- **Contains**: Browser + Node client bundles, model types, enums, internal namespace (~57K lines generated code)

**`dist/`:**
- **Purpose**: Compiled TypeScript output
- **Generated**: Yes — by `npm run build` (tsc)
- **Committed**: No (in `.gitignore`)
- **Contains**: Mirror of `src/` with `.js` + `.d.ts` + `.js.map` files

**`node_modules/`:**
- **Purpose**: npm package dependencies
- **Generated**: Yes — by `npm install`
- **Committed**: No (in `.gitignore`)

**`logs/`:**
- **Purpose**: Winston daily rotate log files
- **Generated**: Yes — at runtime
- **Committed**: No
- **Contains**: `app-YYYY-MM-DD.log` (all levels), `error-YYYY-MM-DD.log` (errors only)

**`apps/`:**
- **Purpose**: Monorepo structure (legacy/transitional, likely unused)
- **Committed**: Yes
- **Contains**: `backend/src/generated/prisma/` — appears to be a stale copy of the generated Prisma client, not imported by the main app

**`.planning/`:**
- **Purpose**: GSD (Goal-oriented Software Development) planning documents
- **Committed**: Yes
- **Contains**: Codebase analysis, phase plans, milestone tracking

---

*Structure analysis: 2026-05-17*

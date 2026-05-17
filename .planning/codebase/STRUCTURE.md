# Codebase Structure

**Analysis Date:** 2026-05-17

## Directory Layout

```
gestion-del-fin-api/
├── src/                          # Application source (TypeScript)
│   ├── index.ts                  # Server entry point, middleware mounting, module registration
│   ├── ai/                       # AI integration layer
│   │   └── admission-evaluator.ts  # Groq LLM + ML decision tree orchestration
│   ├── docs/                     # API documentation
│   │   └── swagger.ts            # OpenAPI/Swagger spec generation
│   ├── generated/                # Prisma generated client (auto-generated, do not edit)
│   │   └── prisma/               # Prisma client output
│   ├── jobs/                     # Cron job definitions
│   │   ├── scheduler.ts          # Cron registration, start/stop lifecycle
│   │   ├── daily-rations.job.ts  # Daily food/resource distribution to survivors
│   │   ├── daily-production.job.ts # Daily resource production (profession-based)
│   │   └── resource-alerts.job.ts  # Low-stock alert generation
│   ├── lib/                      # Shared library instances (singletons)
│   │   ├── ai.ts                 # Groq SDK client instance
│   │   └── prisma.ts             # Prisma client with PostgreSQL adapter
│   ├── logger/                   # Logging configuration
│   │   └── logger.ts             # Winston logger with daily rotation
│   ├── middlewares/              # Express middleware (8 files)
│   │   ├── auth.middleware.ts     # JWT verification, attach user to req
│   │   ├── session.middleware.ts  # 20-min inactivity timeout enforcement
│   │   ├── camp.middleware.ts     # Camp-scoping validation, admin bypass
│   │   ├── role.middleware.ts     # RBAC — role name check
│   │   ├── permission.middleware.ts # Fine-grained permission check (role→permissions)
│   │   ├── rateLimit.middleware.ts # Admission endpoint rate limiting (10/min)
│   │   ├── validate.middleware.ts # Zod schema validation (body/params/query)
│   │   └── error.middleware.ts    # Global error handler (AppError, Zod, Prisma, 500)
│   ├── modules/                  # Domain modules (14 modules)
│   │   ├── admission/            # Refugee evaluation & admission decisions
│   │   ├── auth/                 # Login, logout, JWT issuance
│   │   ├── camps/                # Camp CRUD (reference implementation)
│   │   ├── explorations/         # Expedition planning & tracking
│   │   ├── inventory/            # Per-camp stock tracking, audit logs
│   │   ├── metrics/              # Dashboard analytics
│   │   ├── people/               # Survivor records, status, profession assignment
│   │   ├── permissions/          # Permission CRUD (fine-grained access)
│   │   ├── professions/          # Profession catalog
│   │   ├── resources/            # Resource type definitions
│   │   ├── roles/                # Role CRUD (RBAC)
│   │   ├── system/               # Health check, server time
│   │   ├── transfers/            # Inter-camp resource/person transfers
│   │   └── users/                # System user management
│   └── shared/                   # Shared utilities, constants, types
│       ├── constants/
│       │   ├── camp-rules.ts     # Camp rule definitions (TODO — not implemented)
│       │   ├── permissions.ts    # 56 permission string constants (PERMISSIONS enum)
│       │   └── roles.ts          # 4 role name constants (ROLES array)
│       ├── schemas/
│       │   └── http.schema.ts    # Reusable Zod schemas (idParams, pagination)
│       ├── types/
│       │   └── index.ts          # Re-export RoleName type
│       └── utils/
│           ├── appError.ts       # AppError class (HTTP status + message)
│           ├── handlePrismaError.ts # Prisma P2002/P2003 → AppError converters
│           ├── jwt.ts            # JWT sign/verify, token payload type
│           ├── parseIdParam.ts   # Safe numeric ID extraction from params
│           └── server-time.ts    # Server time utilities (now, ISO, today)
├── ml-service/                   # Python ML microservice (independent container)
│   ├── main.py                   # FastAPI app, /health + /evaluate endpoints
│   ├── decision_tree.py          # scikit-learn DecisionTreeClassifier + feature extraction
│   ├── data.py                   # Synthetic training data (150+ samples)
│   ├── trainer.py                # Standalone training + evaluation script
│   ├── Dockerfile                # Python 3.12-slim image, uvicorn server
│   └── requirements.txt          # fastapi, uvicorn, scikit-learn, pandas, numpy, pydantic
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # 20 models, 8 enums, PostgreSQL datasource
│   └── migrations/               # Prisma migration history
│       ├── 20260514212603_initial_postgresql_schema/
│       ├── 20260516065555_add_permissions/
│       └── 20260516185527_remove_post_legacy/
├── tests/                        # Test suites
│   ├── unit/
│   │   ├── ai/placeholder        # Placeholder — no AI unit tests
│   │   └── jobs/placeholder      # Placeholder — no job unit tests
│   └── e2e/
│       ├── auth.spec.ts          # Auth flow E2E tests (Playwright)
│       ├── people.spec.ts        # People module E2E tests
│       └── resources.spec.ts     # Resources module E2E tests
├── docker/                       # Docker support files
│   └── db/init/                  # PostgreSQL init scripts
├── docker-compose.yml            # Multi-service orchestration (db + ml)
├── Dockerfile                    # Multi-stage Node.js production build
├── package.json                  # Node.js dependencies & scripts
├── tsconfig.json                 # TypeScript config (strict, ES2022, Node16)
├── prisma.config.ts              # Prisma CLI config (datasource, migrations, seed)
├── jest.config.ts                # Jest config (ts-jest, node env)
├── eslint.config.js              # ESLint config
├── .prettierrc                   # Prettier formatting config
├── cspell.json                   # Spell checking config
├── flake.nix / flake.lock        # Nix flake for dev environment
└── .env.example                  # Environment variable template
```

## Directory Purposes

**`src/` — Application source:**
- Purpose: All TypeScript application code
- Contains: Entry point, modules, middleware, AI, jobs, shared utilities, generated Prisma client
- Key files: `src/index.ts` (server bootstrap), `src/lib/prisma.ts` (DB client)

**`src/modules/` — Domain modules:**
- Purpose: Self-contained domain logic following canonical pattern: routes → controller → service → schema
- Contains: 14 module directories, each with 3-4 files (schema, routes, controller, service)
- Key files: `camps/` (reference implementation), `admission/` (most complex with AI+ML+rate limiting+permissions)

**`src/middlewares/` — Express middleware:**
- Purpose: Cross-cutting request processing — auth, session, camp scoping, permissions, validation, rate limiting, error handling
- Contains: 8 middleware files, applied in specific order in `src/index.ts`
- Key files: `error.middleware.ts` (global catch-all), `permission.middleware.ts` (fine-grained access)

**`src/shared/` — Shared code:**
- Purpose: Reusable utilities, constants, types, schemas — no domain logic
- Contains: `utils/` (5 files), `constants/` (3 files), `schemas/` (1 file), `types/` (1 file)
- Key files: `appError.ts`, `jwt.ts`, `permissions.ts`

**`src/ai/` — AI integration:**
- Purpose: Orchestration of Groq LLM and ML decision tree for admission evaluation
- Contains: 1 file — `admission-evaluator.ts`
- Key files: `admission-evaluator.ts` (prompt injection defenses, camp weight parsing, ML service HTTP call)

**`src/jobs/` — Cron jobs:**
- Purpose: Scheduled background tasks (daily rations, production, resource alerts)
- Contains: 4 files — `scheduler.ts` (orchestrator) + 3 job files
- Key files: `scheduler.ts` (node-cron registration with env-configurable cron expressions)

**`src/logger/` — Logging:**
- Purpose: Application-wide logging configuration
- Contains: 1 file — `logger.ts`
- Key files: `logger.ts` (Winston with console + daily rotate file transports)

**`ml-service/` — ML microservice:**
- Purpose: Independent Python/FastAPI container running scikit-learn DecisionTree for admission classification
- Contains: Python source (6 files), Dockerfile, requirements
- Key files: `main.py` (FastAPI app with lifespan training), `decision_tree.py` (classifier + feature extraction)

**`prisma/` — Database schema:**
- Purpose: PostgreSQL schema definition and migration history
- Contains: `schema.prisma` (458 lines, 20 models + 8 enums), 3 migration directories
- Key files: `schema.prisma` (authoritative data model)

**`tests/` — Test suites:**
- Purpose: Unit tests (Jest) and E2E tests (Playwright)
- Contains: `unit/` (2 placeholder dirs) and `e2e/` (3 spec files for auth, people, resources)
- Key files: `e2e/auth.spec.ts`, `e2e/people.spec.ts`, `e2e/resources.spec.ts`

**`docker/` — Docker support:**
- Purpose: PostgreSQL initialization scripts
- Contains: `db/init/` directory mounted as `/docker-entrypoint-initdb.d`

**`apps/` — Monorepo apps:**
- Purpose: Monorepo structure with backend app
- Contains: `backend/src/generated/prisma/` (duplicate of generated client — likely unused)
- Key files: Only `generated/prisma/` present

## Key File Locations

**Entry Points:**
- `src/index.ts`: Server bootstrap — all middleware + routes + job scheduler
- `ml-service/main.py`: ML service FastAPI entry point (port 8000)
- `Dockerfile`: Multi-stage production build for Node.js app
- `docker-compose.yml`: Orchestrates PostgreSQL + ML service containers

**Configuration:**
- `.env.example`: Environment variable template (DATABASE_URL, JWT_SECRET, GROQ_API_KEY, ML_SERVICE_URL, etc.)
- `tsconfig.json`: TypeScript strict mode, ES2022 target, Node16 modules
- `prisma.config.ts`: Prisma CLI config — migrations path, datasource URLs
- `eslint.config.js`: ESLint flat config
- `.prettierrc`: Prettier formatting rules
- `jest.config.ts`: Jest with ts-jest preset, `tests/unit/**/*.spec.ts` pattern
- `flake.nix`: Nix flake for reproducible dev environment

**Core Logic (by layer):**
| Layer | Key File | Lines |
|-------|----------|-------|
| Server bootstrap | `src/index.ts` | 99 |
| Prisma client | `src/lib/prisma.ts` | 23 |
| JWT auth | `src/shared/utils/jwt.ts` | 93 |
| Error handling | `src/middlewares/error.middleware.ts` | 69 |
| Session management | `src/middlewares/session.middleware.ts` | 57 |
| Camp scoping | `src/middlewares/camp.middleware.ts` | 94 |
| Permission check | `src/middlewares/permission.middleware.ts` | 59 |
| AI orchestrator | `src/ai/admission-evaluator.ts` | 158 |
| ML classifier | `ml-service/decision_tree.py` | 180 |
| Job scheduler | `src/jobs/scheduler.ts` | 85 |
| Shared HTTP schemas | `src/shared/schemas/http.schema.ts` | 12 |
| Permission constants | `src/shared/constants/permissions.ts` | 58 |

**Testing:**
- `tests/unit/**/*.spec.ts`: Unit tests (Jest) — only placeholders currently
- `tests/e2e/*.spec.ts`: E2E tests (Playwright) — 3 spec files
- `jest.config.ts`: Jest configuration

## Naming Conventions

**Files:**
- Module files: `{module}.{layer}.ts` — e.g., `camps.routes.ts`, `camps.controller.ts`, `camps.service.ts`, `camps.schema.ts`
- Middleware files: `{name}.middleware.ts` — e.g., `auth.middleware.ts`
- Utility files: `camelCase.ts` — e.g., `appError.ts`, `parseIdParam.ts`, `server-time.ts`
- Constants files: `kebab-case.ts` — e.g., `camp-rules.ts`
- Job files: `kebab-case.job.ts` — e.g., `daily-rations.job.ts`
- E2E test files: `{module}.spec.ts` — e.g., `auth.spec.ts`

**Directories:**
- Modules: `lowercase` — e.g., `camps/`, `admission/`, `explorations/`
- Middleware: `middlewares/` (plural)
- Shared: `shared/` with subdirs `constants/`, `schemas/`, `types/`, `utils/`

**Functions/Handlers:**
- Controller handlers: `{action}{Entity}Handler` — e.g., `createCampHandler`, `getUsersHandler`
- Service functions: `{action}{Entity}` — e.g., `createCamp`, `getUsers`
- Middleware factories: `{name}Middleware` — e.g., `permissionMiddleware`, `roleMiddleware`

## Where to Add New Code

**New Feature (domain module):**
- Primary code: `src/modules/{moduleName}/` — create with `{name}.schema.ts`, `{name}.routes.ts`, `{name}.controller.ts`, `{name}.service.ts`
- Register in: `src/index.ts` — import routes, mount under `/api/{name}` with `authMiddleware, sessionMiddleware, campMiddleware` chain
- Tests: `tests/unit/{moduleName}/` (Jest), `tests/e2e/{moduleName}.spec.ts` (Playwright)
- Permissions: Add to `src/shared/constants/permissions.ts`

**New Middleware:**
- Implementation: `src/middlewares/{name}.middleware.ts`
- Apply in: `src/index.ts` — either globally (before module mounting) or per-route (inside route files like `admissionRateLimit`)

**New Utility:**
- Shared helpers: `src/shared/utils/{name}.ts`
- Constants: `src/shared/constants/{name}.ts`
- Reusable schemas: `src/shared/schemas/{name}.schema.ts`

**New Cron Job:**
- Job logic: `src/jobs/{name}.job.ts` — export `execute()` function
- Register: `src/jobs/scheduler.ts` — import and add `cron.schedule()` call

**New AI/Machine Learning:**
- AI orchestration: `src/ai/{name}.ts`
- ML model/service: `ml-service/` — add new endpoint in `main.py` or new module, update `requirements.txt` if new dependencies

## Module-by-Module Inventory

| Module | Files | Routes | Key Features |
|--------|-------|--------|--------------|
| **admission** | schema, routes, controller, service | `POST /camps/:campId`, `GET /camps/:campId`, `GET /:id`, `PATCH /:id/review` | AI+ML evaluation, rate limiting, auto person creation on accept, Swagger documented |
| **auth** | schema, routes, controller, service | `POST /login`, `POST /logout` | JWT issuance, bcrypt password verification, session version invalidation on logout |
| **camps** | schema, routes, controller, service | CRUD `/camps/:id`, `GET /camps` | Reference CRUD pattern, pagination, Swagger documented |
| **explorations** | schema, routes, controller, service | `POST /`, `GET /:id`, `PATCH /:id/status`, etc. | Expedition lifecycle, resource allocation/collection, participant tracking |
| **inventory** | schema, routes, controller, service | `GET /`, `POST /adjust`, `GET /audit/:campId`, etc. | Per-camp stock balances, manual adjustments, audit trail |
| **metrics** | schema, routes, controller, service | `GET /dashboard`, `GET /resources`, `GET /people`, `GET /expeditions` | Permission-gated analytics, aggregated camp data |
| **people** | schema, routes, controller, service | CRUD `/:id`, status logs, contribution overrides, profession reassignment | Survivor records, status transitions, profession history |
| **permissions** | schema, routes, controller, service | CRUD `/permissions/:id` | Fine-grained access control catalog |
| **professions** | schema, routes, controller, service | CRUD `/professions/:id` | Job catalog (Medic, Scavenger, etc.), resource consumption amounts |
| **resources** | schema, routes, controller, service | CRUD `/resources/:id` | Resource type definitions, daily rations, minimum stock thresholds |
| **roles** | schema, routes, controller, service | CRUD `/roles/:id` | Role catalog (system_admin, worker, resource_manager, travel_coordinator) |
| **system** | routes, controller, service | `GET /time` | Public endpoint — server time for client clock sync (no schema file needed) |
| **transfers** | schema, routes, controller, service | `POST /`, `GET /:id`, `PATCH /:id/schedule`, `/approve-source`, `/approve-target`, `/complete`, `/reject` | Full transfer lifecycle with approval workflow (source + target), 7 different permission gates |
| **users** | schema, routes, controller, service | CRUD `/users/:id` | Admin user management, role/camp assignment |

## Special Directories

**`src/generated/`:**
- Purpose: Prisma client auto-generation output
- Generated: Yes — by `npx prisma generate`
- Committed: Yes (required for builds without Prisma CLI)
- Contains: Prisma client, model types, internal namespace — 56,883 total lines of generated code

**`dist/`:**
- Purpose: Compiled TypeScript output (JavaScript)
- Generated: Yes — by `npm run build` (tsc)
- Committed: No (in `.gitignore`)
- Contains: Mirror of `src/` with `.js` files

**`node_modules/`:**
- Purpose: npm package dependencies
- Generated: Yes — by `npm install`
- Committed: No (in `.gitignore`)

**`logs/`:**
- Purpose: Winston daily rotate log files
- Generated: Yes — at runtime
- Committed: No
- Contains: `app-YYYY-MM-DD.log`, `error-YYYY-MM-DD.log`

**`apps/`:**
- Purpose: Monorepo structure (legacy/transitional)
- Generated: No
- Committed: Yes
- Contains: `backend/src/generated/prisma/` — appears to be a stale copy of generated client, unused by the main app

---

*Structure analysis: 2026-05-17*

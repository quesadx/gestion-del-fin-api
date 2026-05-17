# Technology Stack

**Analysis Date:** 2026-05-17

## Languages

**Primary:**
- TypeScript 5.9.3 (strict mode) — All backend source code in `src/`
- Node.js 20+ (runtime: v20.20.1 detected) — Server runtime via `tsx watch` (dev) or compiled JS (prod)

**Secondary:**
- Python 3.12 (Docker) / 3.13 (local dev, per .pyc cache) — ML microservice at `ml-service/`
- SQL (PostgreSQL dialect) — Prisma migrations at `prisma/migrations/`

## Runtime

**Environment:**
- Node.js 20.20.1
- npm 10.8.2

**Package Manager:**
- npm (no yarn/pnpm lockfile detected)
- Lockfile: `package-lock.json` present (230 KB)

## Frameworks

**Core:**
- Express 5.2.1 — HTTP server, routing, middleware chain (`src/index.ts`)
- Prisma 7.8.0 — ORM with PostgreSQL adapter (`@prisma/adapter-pg`)
- Zod 4.3.6 — Request/response validation schemas
- FastAPI 0.115.0 — Python ML microservice REST API (`ml-service/main.py`)
- scikit-learn 1.5.2 — Decision tree classifier for admission decisions (`ml-service/decision_tree.py`)

**Testing:**
- Jest 30.2.0 — Unit testing (config: `jest.config.ts`)
- Playwright 1.58.2 — E2E testing (`/tests/e2e/`)
- ts-jest 29.4.6 — TypeScript support for Jest

**Build/Dev:**
- tsx 4.21.0 — Dev server with hot-reload (`npm run dev`)
- TypeScript compiler (tsc) — Production build → `dist/`
- ESLint 10.0.3 — Linting (config: `eslint.config.js`)
- Prettier 3.8.1 — Code formatting (config: `.prettierrc`)
- cspell 9.7.0 — Spell checking (`npm run spell`)

## Key Dependencies

**Critical:**
- `@prisma/client` 7.8.0 — Database client generated to `src/generated/prisma/`
- `@prisma/adapter-pg` 7.8.0 — PostgreSQL direct-driver adapter (replaces Prisma's default query engine)
- `pg` 8.12.0 — PostgreSQL native driver (used by adapter-pg)
- `jsonwebtoken` 9.0.3 — JWT token signing/verification
- `bcryptjs` 3.0.3 — Password hashing
- `groq-sdk` 1.1.2 — Groq AI API client for camp context parsing
- `express-rate-limit` 8.5.2 — Rate limiting (NEW — applied to admission endpoint)
- `node-cron` 4.2.1 — Cron job scheduler
- `cors` 2.8.6 — CORS middleware
- `helmet` 8.1.0 — Security headers
- `winston` 3.19.0 — Structured logger
- `winston-daily-rotate-file` 5.0.0 — Log rotation (daily, 14-day retention)
- `swagger-jsdoc` 6.2.8 — OpenAPI spec generation from JSDoc comments
- `swagger-ui-express` 5.0.1 — Swagger UI browser interface
- `zod` 4.3.6 — Schema validation (request bodies, params, queries)

**Infrastructure:**
- `date-fns` 4.1.0 — Date manipulation utilities
- `date-fns-tz` 3.2.0 — Timezone-aware date handling
- `uuid` 13.0.0 — UUID generation

**ML Service (Python):**
- `fastapi` 0.115.0 — REST API framework
- `uvicorn` 0.30.6 — ASGI server
- `scikit-learn` 1.5.2 — DecisionTreeClassifier + train_test_split
- `pandas` 2.2.3 — Training data handling
- `numpy` 1.26.4 — Numerical operations
- `pydantic` 2.9.2 — Request/response validation

## Configuration

**Environment:**
- `.env` (gitignored) — Runtime secrets and config
- `.env.example` — Template with all required variables documented
- `dotenv` 17.3.1 (devDependency) — Loads `.env` in development

**Build:**
- `tsconfig.json` — Target: ES2022, Module: Node16, strict: true, outDir: dist
- `eslint.config.js` — ESLint flat config with TypeScript + Prettier plugins
- `.prettierrc` — Code formatting rules
- `jest.config.ts` — Jest configuration

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- PostgreSQL 16 (via Docker Compose or local install)
- Python 3.12+ (for ML service; Docker recommended)
- Docker + Docker Compose (for full local environment)

**Production:**
- Node.js 20+ runtime
- PostgreSQL 16 database (Supabase/self-hosted/Railway compatible)
- Environment variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `ML_SERVICE_URL`
- Dockerfile builds 2-stage: TypeScript compile then production-only deps
- Health check at `GET /api/system/time` (interval 30s)

---

*Stack analysis: 2026-05-17*

# External Integrations

**Analysis Date:** 2026-05-17

## APIs & External Services

**AI / LLM:**
- Groq Cloud API — Used to parse camp context prompts into structured weights for the decision tree
  - SDK/Client: `groq-sdk` 1.1.2 (`src/lib/ai.ts`)
  - Model: `llama-3.3-70b-versatile`
  - Auth: `GROQ_API_KEY` (env var)
  - Purpose: Converts natural-language camp admission priorities into `CampWeights` (skill weights 0–1, strict_health_check, minimum_age)
  - File: `src/ai/admission-evaluator.ts`, function `parseCampWeights()`

**ML Microservice (Internal HTTP):**
- Python FastAPI service — Decision tree classifier for admission decisions
  - Location: `ml-service/` directory
  - Endpoint: `POST /evaluate` — Accepts age, skills, health_notes, camp_weights → returns decision, confidence, reasoning_path, profession_category
  - Endpoint: `GET /health` — Returns `{ status: "ok", model_trained: bool }`
  - Auth: None (internal service, not exposed externally)
  - Timeout: 5 seconds (`AbortSignal.timeout(5000)`)
  - Error response: 502 Bad Gateway if unreachable
  - Client code: `src/ai/admission-evaluator.ts`, function `evaluateWithDecisionTree()`
  - Config: `ML_SERVICE_URL` env var (default: `http://localhost:8000`)

## Data Storage

**Database:**
- PostgreSQL 16 — Primary data store
  - Provider: `postgresql` (in `prisma/schema.prisma` datasource)
  - Docker: `postgres:16-alpine` image in `docker-compose.yml` (service: `db`)
  - ORM: Prisma 7.8.0 with `@prisma/adapter-pg` (direct driver, no query engine binary)
  - Native driver: `pg` 8.12.0
  - Connection: `DATABASE_URL` env var (constructed from `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` as fallback)
  - Direct URL: `DATABASE_DIRECT_URL` for Prisma CLI migrations
  - Shadow DB: `SHADOW_DATABASE_URL` (optional, for `prisma migrate dev`)
  - Client init: `src/lib/prisma.ts` — uses `PrismaPg` adapter
  - Schema: `prisma/schema.prisma` — 20 models, 8 enums, camp-scoped multi-tenant design

**File Storage:**
- Local filesystem only — No S3/blob storage integration detected

**Caching:**
- None — No Redis/Memcached. Session handled via database `session_version` field and JWT expiry.

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `src/middlewares/auth.middleware.ts` — Verifies `Authorization: Bearer <token>` header
  - Token library: `jsonwebtoken` 9.0.3
  - Password hashing: `bcryptjs` 3.0.3
  - Token payload: `{ userId, campId, role, sessionVersion, isAdmin, iat, exp }`
  - Token expiry: Configurable via `JWT_EXPIRY` env var (default: "1h")
  - Session timeout: 20-minute inactivity enforced by `src/middlewares/session.middleware.ts`
  - Session invalidation: Increments `session_version` on logout

## Monitoring & Observability

**Error Tracking:**
- None — No Sentry, Datadog, or similar APM detected

**Logs:**
- Winston 3.19.0 with daily rotate file transport (`src/logger/logger.ts`)
  - Console transport (colorized in dev, JSON in production)
  - Daily rotate: `logs/app-YYYY-MM-DD.log` (14-day retention, 20MB max per file)
  - Error logs: `logs/error-YYYY-MM-DD.log` (30-day retention, error level only)
  - Level: Controlled by `LOG_LEVEL` env var (default: "info")
  - File path: Controlled by `LOG_FILE` env var (default: `./logs/app.log`)

## CI/CD & Deployment

**Hosting:**
- Railway-compatible (per Dockerfile health check comments)
- Docker Compose for local development

**CI Pipeline:**
- GitHub Actions: `.github/workflows/ci.yml`
  - Trigger: push/pull_request on all branches
  - Steps: checkout → setup Node 20 → npm install → ESLint → Prettier check → cspell → Jest tests
  - No Docker build or deployment steps in CI

**Docker:**
- Root `Dockerfile` — Multi-stage build (builder: compile TS, runner: production deps + dist)
  - Base: `node:20-alpine`
  - Exposes port 3000
  - Startup: `npx prisma generate && npx prisma migrate deploy && npm start`
  - Health check: `GET /api/system/time` (30s interval)
- ML Service `ml-service/Dockerfile` — Single-stage Python
  - Base: `python:3.12-slim`
  - Exposes port 8000
  - Startup: `uvicorn main:app --host 0.0.0.0 --port 8000`
- `docker-compose.yml` — Two services:
  - `db`: postgres:16-alpine (port 5432, health check via pg_isready)
  - `ml`: builds from `./ml-service` (port 8000, health check via curl `/health`)

## Environment Configuration

**Required env vars (from `.env.example`):**
- `NODE_ENV` — "development" | "production"
- `PORT` — Server port (default: 3000)
- `DATABASE_URL` — PostgreSQL connection string
- `DATABASE_DIRECT_URL` — Direct PostgreSQL connection (for Prisma CLI)
- `JWT_SECRET` — At least 32 characters (validated in production)
- `JWT_EXPIRY` — Token lifetime string (e.g. "1h")
- `GROQ_API_KEY` — Groq API key for LLM camp context parsing
- `ML_SERVICE_URL` — ML microservice URL (default: `http://localhost:8000`)
- `CORS_ORIGIN` — Frontend origin for CORS (default: `http://localhost:5173`)
- `LOG_LEVEL` — Winston level: "debug" | "info" | "error"
- `LOG_FILE` — Log file path (default: `./logs/app.log`)

**Optional env vars:**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — Fallback when `DATABASE_URL` not set
- `SHADOW_DATABASE_URL` — For `prisma migrate dev`
- `DAILY_RATIONS_CRON` — Cron expression (default: `* * * * *`)
- `DAILY_PRODUCTION_CRON` — Cron expression (default: `0 5 * * *`)
- `RESOURCE_ALERTS_CRON` — Cron expression (default: `0 * * * *`)
- `CHILD_AGE` — Age threshold for child priority in rations (default: 12)

**Secrets location:**
- `.env` file (gitignored) — All secrets
- `.env.example` — Template without real secrets

## Webhooks & Callbacks

**Incoming:**
- None — No webhook endpoints detected

**Outgoing:**
- `POST {ML_SERVICE_URL}/evaluate` — Evaluation request from `src/ai/admission-evaluator.ts` to ML microservice (5s timeout)
- Groq API chat completions — Camp context parsing from `src/ai/admission-evaluator.ts`

## Internal Integration Points

**Rate Limiting:**
- `express-rate-limit` 8.5.2 — Applied to `POST /api/admission/camps/:campId`
  - Window: 60 seconds
  - Max: 10 requests per window
  - Response: 429 with JSON error body
  - Implementation: `src/middlewares/rateLimit.middleware.ts`
  - Applied in: `src/modules/admission/admission.routes.ts` (after validation, before controller)

**Job Scheduler:**
- `node-cron` 4.2.1 — Three cron jobs registered at startup (`src/index.ts` line 79)
  - `daily-rations.job.ts` — Distributes daily rations per camp (cron: `* * * * *`)
  - `daily-production.job.ts` — Applies profession-based resource production (cron: `0 5 * * *`)
  - `resource-alerts.job.ts` — Logs low-stock alerts per camp (cron: `0 * * * *`)
  - Scheduler: `src/jobs/scheduler.ts` — start/stop lifecycle, graceful shutdown on SIGINT/SIGTERM

**Swagger Documentation:**
- `swagger-jsdoc` — Generates OpenAPI spec from JSDoc annotations in route files
- `swagger-ui-express` — Serves interactive API docs at `GET /api/docs`
- Raw spec available at `GET /api/docs.json`
- No `swagger-jsdoc` spec source found as separate file; generated from route comments

**Middleware Chain (from `src/index.ts`):**
1. `cors` — CORS with credentials (before routes)
2. `express.json()` — Body parsing
3. Public routes: `/api/system/*`, `/api/auth/*` (no auth)
4. Protected routes: `authMiddleware` → `sessionMiddleware` → `campMiddleware` → module routes
5. Globally: `errorHandler` (last)
6. Additional per-route: `permissionMiddleware`, `validate`, `admissionRateLimit`

---

*Integration audit: 2026-05-17*

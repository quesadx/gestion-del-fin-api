# Integrations & External Services

**Analysis Date:** 2026-05-17

## AI / LLM Service (Groq)

- **SDK:** `groq-sdk` ^1.1.2
- **Client instance:** `src/lib/ai.ts` — `new Groq({ apiKey: process.env.GROQ_API_KEY })`
- **Model:** `llama-3.3-70b-versatile`
- **Purpose:** Parse camp `ai_context_prompt` (natural language) into structured admission priority weights (`CampWeights` object with fields like `weight_medical`, `strict_health_check`, `minimum_age`)
- **Files:**
  - `src/ai/admission-evaluator.ts` — function `parseCampWeights()` (lines 28–77)
  - `src/lib/ai.ts` — SDK initialization
- **Config:** `GROQ_API_KEY` environment variable
- **Security:** Prompt injection countermeasures — sanitizes context (removes `ignore previous instructions`, truncates to 500 chars, Zod-validates JSON response)
- **Response format:** `response_format: { type: 'json_object' }` for structured parsing

## ML Microservice (Internal HTTP)

- **Stack:** Python FastAPI 0.115.0 + scikit-learn 1.5.2 (DecisionTreeClassifier)
- **Location:** `ml-service/` directory (Docker image: `python:3.12-slim`)
- **Port:** 8000 (internal to Docker Compose network)

### Endpoints

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/evaluate` | POST | Decision tree admission evaluation | `{ decision, confidence, reasoning_path[], profession_category }` |
| `/health` | GET | Health + model status | `{ status: "ok", model_trained: bool }` |

### Client Integration

- **File:** `src/ai/admission-evaluator.ts` — function `evaluateWithDecisionTree()` (lines 79–112)
- **Call:** `fetch(\`${ML_SERVICE_URL}/evaluate\`)` with JSON body containing `age`, `skills`, `health_notes`, `camp_weights`
- **Timeout:** 5 seconds (`AbortSignal.timeout(5000)`)
- **Error handling:** Throws `AppError('Decision tree service unavailable', 502)` if not OK
- **Test mode:** When `NODE_ENV === 'test'`, returns hardcoded `ACCEPTED` with profession — no external call
- **Config:** `ML_SERVICE_URL` env var (default: `http://localhost:8000`)

## Database

- **Type:** PostgreSQL 16
- **Provider/prisma:** `prisma/schema.prisma` datasource block: `provider = "postgresql"`
- **Adapter:** `@prisma/adapter-pg` ^7.8.0 (native PostgreSQL driver, no Prisma query engine binary)
- **Driver:** `pg` ^8.12.0
- **Connection URLs:**
  - `DATABASE_URL` — Runtime connection (session pooler format for Supabase)
  - `DATABASE_DIRECT_URL` — Direct connection for Prisma CLI migrations
  - `SHADOW_DATABASE_URL` — Optional, for `prisma migrate dev`
  - Fallback: constructed from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Client init:** `src/lib/prisma.ts` — `PrismaPg` adapter wraps `connectionString`, passed to `PrismaClient`
- **Generated client:** `src/generated/prisma/` (custom `output` path in schema)
- **Docker:** `postgres:16-alpine` image in `docker-compose.yml` (service name: `db`)
- **Health check:** `pg_isready -U postgres`

## Job Scheduler

- **Library:** `node-cron` ^4.2.1
- **Scheduler:** `src/jobs/scheduler.ts` — start/stop lifecycle, graceful shutdown on SIGINT/SIGTERM
- **Cron expressions:** Configurable via env vars (`DAILY_RATIONS_CRON`, `DAILY_PRODUCTION_CRON`, `RESOURCE_ALERTS_CRON`)

| Job | File | Default Cron | Purpose |
|-----|------|-------------|---------|
| Daily Rations | `src/jobs/daily-rations.job.ts` | `* * * * *` (every minute) | Distributes daily rations per camp: priority order (children → doctors → explorers → rest), consumes inventory, logs alerts |
| Daily Production | `src/jobs/daily-production.job.ts` | `0 5 * * *` (5 AM daily) | Applies profession-based resource production per camp, handles contribution overrides |
| Resource Alerts | `src/jobs/resource-alerts.job.ts` | `0 * * * *` (hourly) | Logs WARN/ERROR for resources below minimum stock thresholds |

- **Test mode:** Jobs disabled when `NODE_ENV === 'test'` (see `src/index.ts` line 92–94)

## Logging

- **Library:** Winston ^3.19.0
- **File:** `src/logger/logger.ts`
- **Transports:**
  1. Console — Colorized in dev, JSON in production
  2. Daily rotate file — `logs/app-YYYY-MM-DD.log` (14-day retention, 20MB max)
  3. Daily rotate error file — `logs/error-YYYY-MM-DD.log` (30-day retention, error level only)
- **Level:** Configurable via `LOG_LEVEL` env var (default: `"info"`)
- **File path:** Configurable via `LOG_FILE` env var (default: `./logs/app.log`)
- **Audit logging:** Separate pattern in `src/shared/utils/auditLog.ts` — writes to `audit_logs` DB table asynchronously (fire-and-forget, logs error on failure)

## Authentication

- **Type:** Custom JWT-based (no OAuth, no external identity provider)
- **Token creation:** `src/shared/utils/jwt.ts` — `signAccessToken()` signs with `JWT_SECRET` + configurable `JWT_EXPIRY`
- **Token verification:** `getAccessTokenPayloadFromHeader()` — extracts Bearer token, verifies signature, validates payload shape
- **Password hashing:** bcryptjs ^3.0.3
- **Session management:** `sessionMiddleware` — 20-min inactivity timeout, session_version check from DB, `last_activity` timestamp update on each request
- **Logout:** Increments `session_version` in DB, invalidating all existing tokens

## API Documentation

- **Spec format:** OpenAPI 3.0 (YAML) at `src/docs/openapi.yaml`
- **Loader:** `src/docs/swagger.ts` — loads YAML, injects server URL from env, serves at `GET /api/docs`
- **UI:** `swagger-ui-express` ^5.0.1 at `GET /api/docs`
- **Raw JSON:** `GET /api/docs.json`

## Rate Limiting (integration via middleware)

- **Library:** `express-rate-limit` ^8.5.2
- **Files:** `src/middlewares/rateLimit.middleware.ts`

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| Global | 15 min | 200 | All routes via `app.use(globalRateLimit)` |
| Login | 15 min (1min in test) | 5 (100 in test) | `POST /api/auth/login` — `loginRateLimit` |
| Admission | 1 min | 10 | `POST /api/admission` — `admissionRateLimit` |

All limiters are skipped when `NODE_ENV === 'test'`.

## Caching

- **None detected.** No Redis, Memcached, or in-memory cache. Session state is stored in DB (`users.last_activity`, `users.session_version`). No response caching.

## File Storage

- **Local filesystem only.** No S3, GCS, or blob storage. Photo URL fields (`photo_url`, `icon_url`) accept external URLs as strings — no upload handling.

## Monitoring & Observability

- **Error tracking:** None — no Sentry, Datadog, or APM integration.
- **Health endpoint:** `GET /api/system/time` (returns server timestamp for client clock sync, also used as Docker health check)
- **Server time utility:** `src/shared/utils/server-time.ts` — `now()`, `nowISO()`, `today()` — all server-side dates

## CI/CD

- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — runs on push/PR to all branches
  - Steps: checkout → Node 20 setup → npm install → ESLint → Prettier check → cspell → Jest tests
  - No Docker build, no deployment, no E2E tests in CI
- **Deployment:** Docker Compose for local dev; Dockerfile multi-stage for production; Railway-compatible (per health check + port 3000)

## Environment Variables

### Required

| Variable | Purpose | Source |
|----------|---------|--------|
| `DATABASE_URL` | PostgreSQL connection (runtime) | `.env` |
| `DATABASE_DIRECT_URL` | PostgreSQL direct connection (migrations) | `.env` |
| `JWT_SECRET` | JWT signing key (>=32 chars) | `.env` |
| `JWT_EXPIRY` | Token lifetime (e.g. `"1h"`) | `.env` |
| `GROQ_API_KEY` | Groq AI API key | `.env` |
| `ML_SERVICE_URL` | ML microservice URL | `.env` |
| `CORS_ORIGIN` | Allowed frontend origin | `.env` |
| `NODE_ENV` | Environment mode | `.env` |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `"info"` | Winston log level |
| `LOG_FILE` | `"./logs/app.log"` | Log file path |
| `DB_HOST` | `"localhost"` | DB host fallback |
| `DB_PORT` | `"5432"` | DB port fallback |
| `DB_USER` | `"postgres"` | DB user fallback |
| `DB_PASSWORD` | `""` | DB password fallback |
| `DB_NAME` | `"gestion_del_fin"` | DB name fallback |
| `SHADOW_DATABASE_URL` | none | Prisma migrate dev shadow DB |
| `DAILY_RATIONS_CRON` | `"* * * * *"` | Rations job schedule |
| `DAILY_PRODUCTION_CRON` | `"0 5 * * *"` | Production job schedule |
| `RESOURCE_ALERTS_CRON` | `"0 * * * *"` | Alerts job schedule |
| `CHILD_AGE` | `12` | Child age threshold for ration priority |

### Test-specific (`.env.test`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://.../gestion_del_fin_test` | Test DB |
| `JWT_SECRET` | `test-jwt-secret-at-least-32-characters-long-for-e2e` | Test signing |
| `JWT_EXPIRY` | `24h` | Long expiry for tests |
| `LOG_LEVEL` | `error` | Suppress logs in tests |
| `GROQ_API_KEY` | `sk-test-mock-key` | Mock key (admission evaluator returns hardcoded in test mode) |

## Webhooks & Callbacks

- **Incoming:** None
- **Outgoing:**
  - `{ML_SERVICE_URL}/evaluate` — HTTP POST from admission evaluator
  - `api.groq.com/openai/v1/chat/completions` — Groq SDK call for context parsing

---

*Integration audit: 2026-05-17*

# Gestión del Fin API

Multi-camp zombie survival management system. Built for **EIF209** at **Universidad Nacional, Costa Rica** (2026).

**Deployed:** https://gestion-del-fin-api-production.up.railway.app  
**Swagger UI:** https://gestion-del-fin-api-production.up.railway.app/api/docs

---

## Overview

Manages multiple survival camps in a post-apocalyptic scenario: tracks people, resources, expeditions, inter-camp transfers, and AI-assisted admission decisions. Every camp is fully isolated — one camp cannot see another's data.

### Current Test Status

| Suite | Tests | Status |
|-------|-------|--------|
| Unit (Jest) | 1 | ✅ Passing |
| E2E (Playwright) | 193 (187 ✓ + 6 skip) | ✅ 16.6s |
| Performance (Playwright) | 42 | ✅ 8.9s |

---

## Tech Stack

### Node.js / Express (TypeScript)

**Why:** Express is the most mature Node.js framework with the largest middleware ecosystem. TypeScript was chosen for strict type safety across ~~60+ endpoint definitions, Zod schemas, and Prisma models. The `module: Node16` + ESM setup ensures compatibility with modern tooling.

### PostgreSQL + Prisma ORM

**Why:** PostgreSQL provides robust JSON support, window functions for metrics, and `pg_stat_statements` for query profiling. Prisma 7.x offers type-safe queries, auto-generated clients, and a declarative schema that stays the single source of truth. The `@prisma/adapter-pg` driver is used for native PostgreSQL protocol access.

**Production:** Supabase (managed PostgreSQL with connection pooling).  
**Local:** Docker Compose (PostgreSQL 16 Alpine).

### Valkey (Redis-compatible Cache)

**Why:** Valkey is a Redis OSS alternative that remains fully open-source after Redis's license change. Used for cache-aside reads on frequently-queried catalog endpoints and for the job queue (daily rations, resource alerts). No external Redis license concerns in production.

### Python ML Microservice

**Why:** Python's scikit-learn provides battle-tested ML tooling. A Decision Tree Classifier evaluates refugee admission eligibility based on applicant data. Falls back to a rule-based evaluator if the service is unavailable, with `[FALLBACK MODE]` labeling for auditability.

### Go Microservice (Planned)

**Why:** Go's lightweight goroutines and low memory footprint make it ideal for high-throughput operations like image processing and real-time metrics aggregation that could block the Node.js event loop.

### Groq AI SDK

**Why:** Groq provides low-latency LLM inference via API. Used for admission evaluations and profession assignment, supplementing the Python ML service with natural language reasoning.

### Infrastructure

| Component | Production | Local |
|-----------|-----------|-------|
| API Server | Railway (Node.js 20) | `npm run dev` |
| Database | Supabase PostgreSQL | Docker Compose |
| Cache | Serverless Redis (Railway) | Valkey (Docker) |
| ML Service | Python microservice (Railway) | Uvicorn (manual) |
| Auth | JWT (jsonwebtoken) | Same |

---

## Architecture

### Module Structure

```
src/
  modules/
    auth/       — JWT login/logout, session validation
    camps/      — Camp CRUD, nested people routes
    people/     — Survivor records, status logs, profession reassignment
    resources/  — Resource type definitions
    inventory/  — Stock tracking, adjustments, audit log
    professions/ — Job catalog
    expeditions/ — Scheduling, status transitions (PLANNED→ONGOING→RETURNED)
    transfers/  — Inter-camp resource/people movement + approval workflow
    admission/  — AI refugee evaluation + manual override
    users/      — Admin user management
    roles/      — Role definitions
    permissions/ — Permission definitions
    metrics/    — Dashboard, resources, people, expedition aggregation
    system/     — Server time (client clock sync), health
  middlewares/
    auth.middleware.ts      — JWT verification (401)
    session.middleware.ts   — 20-min inactivity timeout (401)
    camp.middleware.ts      — Camp-scoped data isolation
    permission.middleware.ts — Role-based access (403)
    rateLimit.middleware.ts — Login + admission rate limiting
    image-upload.middleware.ts — Cloudinary upload for admission/people photos
```

### Request Flow

```
Client → globalRateLimit → auth → session → camp → permission → validate(Zod) → controller → service → Prisma
                                                                                                   ↓
                                                                                              PostgreSQL
```

### Key Design Decisions

- **Server-side time only:** No client timestamps are trusted for business logic. `GET /api/system/time` provides clock sync.
- **Camp-scoped isolation:** Every query filters by `campId: req.camp.id`. No global queries.
- **20-min sliding session:** Session resets on each request, not total lifetime.
- **All roles get all permissions in test setup:** Enables testing error cases for all endpoints without seeding complex permission trees.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Compose (for PostgreSQL + Valkey)
- npm

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
docker compose up -d db valkey

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to local database
npx prisma db push

# 5. Start dev server
npm run dev
```

The server starts at `http://localhost:3000`.

### Environment

Copy `.env.test` patterns for local development — the actual `.env` contains production credentials for Supabase and should never be committed.

---

## Running Tests

### Unit Tests

```bash
npm test
```

Jest — currently 1 test covering the Redis job queue enqueue function.

### E2E Tests

```bash
# Ensure PostgreSQL is running
docker compose up -d db

# Push schema to test database
npx dotenv -e .env.test -- npx prisma db push

# Run all 193 tests
npm run test:e2e
```

The `global.setup.ts` truncates and re-seeds the test database, generates JWT tokens for 6 test users, and the Playwright `webServer` auto-starts the Express server. Tests run serially (`workers: 1`) to prevent session middleware race conditions.

### Performance Tests

```bash
# Local
npm run test:perf

# Against deployed Railway
PERF_TARGET_URL=https://gestion-del-fin-api-production.up.railway.app \
  E2E_USER=<username> E2E_PASS=<password> \
  npm run test:perf
```

Measures response times (lists ≤2s, metrics ≤5s), verifies concurrent request handling (10 simultaneous), and checks login rate-limit behavior.

### CI Pipeline

GitHub Actions runs on every push/PR:

```
lint-and-unit → ESLint + Prettier + cspell + Jest
         e2e → PostgreSQL service → prisma db push → playwright install → e2e + perf tests
```

---

## Deployed API

The API is live at `gestion-del-fin-api-production.up.railway.app`. All endpoints except `POST /api/auth/*` and `GET /api/system/**` require a Bearer JWT token.

### Sample Request

```bash
# Public
curl https://gestion-del-fin-api-production.up.railway.app/api/system/time

# Authenticated
TOKEN=$(curl -s -X POST https://gestion-del-fin-api-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"..."}' | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
  https://gestion-del-fin-api-production.up.railway.app/api/camps
```

---

## Project Structure

```
.
├── docker/
│   └── db/init/         # PostgreSQL init scripts (test DB, shadow DB)
├── docs/                # Admission AI docs, cache docs, project PDF
├── services/
│   └── ml-service/      # Python Decision Tree microservice
├── prisma/
│   └── schema.prisma    # Database schema (25 models, 40+ indexes)
├── src/
│   ├── ai/              # Groq admission evaluator + role assigner
│   ├── jobs/            # Scheduled tasks (daily rations, resource alerts)
│   ├── lib/             # Prisma client, cache, Cloudinary
│   ├── middlewares/     # Auth, session, camp, permissions, rate-limit
│   ├── modules/         # 14 domain modules
│   └── shared/          # Constants, utils, schemas
├── tests/
│   ├── e2e/             # 20 test files, 193 tests (Playwright)
│   ├── perf/            # 3 test files, 42 tests (Playwright)
│   └── unit/            # Jest unit tests
├── AGENTS.md            # AI agent guidelines for code generation
└── docker-compose.yml   # PostgreSQL 16, Valkey 7, ML service
```

---

## Key Numbers

| Metric | Value |
|--------|-------|
| API Endpoints | 60+ |
| Database Tables | 25 |
| E2E Tests | 193 (187 pass) |
| Performance Tests | 42 (all pass) |
| Test Database Tables Truncated | 24 |
| Test Users Seeded | 7 |
| Average E2E Test Duration | 16.6s |
| JWT Session Timeout | 20 min inactivity |

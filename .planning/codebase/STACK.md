# Technology Stack

**Analysis Date:** 2026-05-17

## Runtime & Language

- **Runtime:** Node.js 20+
- **Language:** TypeScript ^5.9.3 (strict mode, ES2022 target)
- **Module system:** ES Modules (`"type": "module"` in `package.json`)
- **Entry point:** `src/index.ts` — Express app bootstrap, middleware chain, route mounting, job scheduler start
- **Compiled output:** `dist/index.js` via `tsc`

## Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP framework, routing, middleware chain |
| @prisma/client | ^7.8.0 | Typed ORM client (generated to `src/generated/prisma/`) |
| @prisma/adapter-pg | ^7.8.0 | PostgreSQL native driver adapter (replaces Prisma query engine) |
| pg | ^8.12.0 | PostgreSQL driver (used by adapter-pg) |
| zod | ^4.3.6 | Request/response/params validation schemas |
| jsonwebtoken | ^9.0.3 | JWT signing, verification, payload extraction |
| bcryptjs | ^3.0.3 | Password hashing |
| cors | ^2.8.6 | Cross-origin resource sharing |
| helmet | ^8.1.0 | HTTP security headers (CSP disabled, cross-origin relaxed) |
| express-rate-limit | ^8.5.2 | Rate limiting (global 200/15min, login 5/15min, admission 10/1min) |
| winston | ^3.19.0 | Structured logging |
| winston-daily-rotate-file | ^5.0.0 | Log rotation (daily, 14-day retention general, 30-day for errors) |
| node-cron | ^4.2.1 | Cron job scheduler (rations, production, alerts) |
| groq-sdk | ^1.1.2 | Groq AI API client (camp context parsing) |
| date-fns | ^4.1.0 | Date utilities |
| date-fns-tz | ^3.2.0 | Timezone-aware date handling |
| swagger-ui-express | ^5.0.1 | Swagger UI at `GET /api/docs` |
| js-yaml | ^4.1.1 | YAML parser (OpenAPI spec loaded from `docs/openapi.yaml`) |
| uuid | ^13.0.0 | UUID generation |
| swagger-jsdoc | indirectly via overrides | OpenAPI spec generation |

## Database

- **ORM:** Prisma ^7.8.0
- **Database:** PostgreSQL (provider: `postgresql` in schema)
- **Schema:** `prisma/schema.prisma` — 20 models (camps, users, people, professions, resources, inventories, inventory_logs, expeditions, transfers, admission_requests, audit_logs, roles, permissions, achievements, etc.) + 8 enums
- **Migrations:** `prisma/migrations/`
- **Generated client:** `src/generated/prisma/` (custom output path)
- **Connection:** `src/lib/prisma.ts` — uses `PrismaPg` adapter with `DATABASE_URL`, fallback to `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`
- **Additional URLs:** `DATABASE_DIRECT_URL` (Prisma CLI migrations), `SHADOW_DATABASE_URL` (optional, for `migrate dev`)

## Authentication & Security

- **JWT library:** jsonwebtoken ^9.0.3
- **Password hashing:** bcryptjs ^3.0.3
- **Auth flow:** `POST /api/auth/login` (rate-limited to 5/15min) → returns JWT; `POST /api/auth/logout` (requires token) → increments `session_version`
- **Token payload:** `{ userId, campId, role, sessionVersion, isAdmin, iat, exp }`
- **Token expiry:** Configurable via `JWT_EXPIRY` (default: `"1h"`)
- **Middleware chain for protected routes:**
  1. `authMiddleware` (`src/middlewares/auth.middleware.ts`) — Extracts + verifies Bearer token; attaches `user` to req
  2. `sessionMiddleware` (`src/middlewares/session.middleware.ts`) — 20-min inactivity timeout; validates `session_version`
  3. `campMiddleware` (`src/middlewares/camp.middleware.ts`) — Camp-scoped access; admin bypass
- **Selective middleware:** `roleMiddleware` — Role check against DB; `permissionMiddleware` — Fine-grained permission check via role_permissions join
- **Rate limiters:** global (200/15min), login (5/15min), admission (10/1min) — all skipped in test mode
- **Security headers:** Helmet (CSP off, cross-origin policies relaxed for Swagger UI)

## Testing

| Framework | Version | Purpose | Config File |
|-----------|---------|---------|-------------|
| Jest | ^30.2.0 | Unit tests | `jest.config.ts` |
| Playwright | ^1.58.2 | E2E tests | `playwright.config.ts` |

**Jest config** (`jest.config.ts`):
- Preset: `ts-jest`
- Environment: `node`
- Test location: `tests/unit/**/*.spec.ts`
- **No unit test files currently exist** (directory is empty)

**Playwright config** (`playwright.config.ts`):
- Test dir: `tests/e2e/`
- Workers: 1 (sequential)
- Timeout: 15s per test, 5s expect
- Base URL: `http://localhost:3000`
- Web server: `npx dotenv -e .env.test -- tsx src/index.ts`, auto-start with `reuseExistingServer: true`
- Global setup: `tests/e2e/global.setup.ts`
- Global teardown: `tests/e2e/global.teardown.ts`
- Helper utilities: `tests/e2e/helpers/auth.ts`, `assertions.ts`, `data.ts`, `fixtures.ts`

**E2E spec files (15 total):**
- `auth.spec.ts`, `camps.spec.ts`, `people.spec.ts`, `resources.spec.ts`, `professions.spec.ts`
- `inventory.spec.ts`, `admission.spec.ts`, `transfers.spec.ts`, `expeditions.spec.ts`
- `users.spec.ts`, `roles.spec.ts`, `permissions.spec.ts`, `metrics.spec.ts`, `system.spec.ts`

**Coverage:** Not configured — no coverage threshold or reporter set.

## Dev Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | ^5.9.3 | Compiler |
| tsx | ^4.21.0 | Hot-reload dev server (`npm run dev`) |
| ESLint | ^10.0.3 | Linting (flat config) |
| Prettier | ^3.8.1 | Formatting |
| @typescript-eslint/* | ^8.57.0 | TS-aware lint rules |
| cspell | ^9.7.0 | Spell checking (`npm run spell`) |
| dotenv | ^17.3.1 | Env loading |
| dotenv-cli | ^11.0.0 | CLI env loading for tests |
| ts-jest | ^29.4.6 | Jest TS transformer |
| @faker-js/faker | ^10.4.0 | Test data generation |
| ts-node | ^10.9.2 | Legacy TS execution |

**ESLint rules** (`eslint.config.js`):
- `prettier/prettier: error`
- `@typescript-eslint/no-unused-vars: warn`
- `@typescript-eslint/explicit-function-return-type: off`
- Ignored: `src/generated/prisma/**`

**Prettier config** (`.prettierrc`):
- `semi: true`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: "always"`

**TypeScript config** (`tsconfig.json`):
- `target: ES2022`, `module: Node16`, `moduleResolution: node16`
- `strict: true`, `esModuleInterop: true`, `sourceMap: true`
- `types: ["node", "jest"]`
- Include: `src/`, Exclude: `node_modules`, `dist`

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template with all required env vars documented |
| `.env.test.example` | Template for test env vars |
| `.env` | Live secrets (gitignored) |
| `.env.test` | Test overrides (gitignored) |
| `tsconfig.json` | TypeScript compiler options |
| `eslint.config.js` | ESLint flat config |
| `.prettierrc` | Prettier formatting rules |
| `.prettierignore` | Files excluded from formatting |
| `jest.config.ts` | Jest unit test config |
| `playwright.config.ts` | Playwright E2E config |
| `cspell.json` | Spell check dictionary |
| `Dockerfile` | Multi-stage production build (node:20-alpine) |
| `docker-compose.yml` | Local dev: PostgreSQL + ML service |
| `flake.nix` / `flake.lock` | Nix reproducible shell |

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- PostgreSQL 16 (Docker Compose recommended)
- Docker + Docker Compose (for full stack including ML service)

**Production:**
- Node.js 20+ runtime
- PostgreSQL 16 database (Supabase or self-hosted)
- Env vars: `DATABASE_URL`, `DATABASE_DIRECT_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `ML_SERVICE_URL`
- `JWT_SECRET` validated at startup (>=32 chars, not default)
- Health check: `GET /api/system/time` (interval 30s)
- Docker image: multi-stage build, runs `prisma generate` + `prisma migrate deploy` + `npm start`

## Overrides (package.json)

```json
{
  "@prisma/dev": "0.23.1",
  "@hono/node-server": "1.19.11",
  "hono": "4.12.8",
  "effect": "3.21.0",
  "flatted": "3.4.2"
}
```

Transitive dependency pins. `hono` and `effect` are not direct imports — they are peer/transitive deps from Prisma ecosystem packages.

---

*Stack analysis: 2026-05-17*

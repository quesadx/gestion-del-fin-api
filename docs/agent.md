# Agent Instructions - Gestión del Fin API

Quick reference for agents working on this codebase.

**Project**: Gestión del Fin API | **Domain**: Survival camp management system | **Tech Stack**: Node.js + TypeScript + Express + MariaDB  
**Course**: EIF209, Universidad Nacional (2026)

---

## 📋 Quick Navigation

| Section                                                  | Purpose                    |
| -------------------------------------------------------- | -------------------------- |
| [⚡ Quick Start](#-quick-start)                          | Essential paths & commands |
| [Architecture](#architecture-layer)                      | Request flow & layers      |
| [Module Structure](#module-structure)                    | Feature organization       |
| [Implementation Patterns](#implementation-patterns)      | How to add features        |
| [Security Checklist](#security-checklist)                | Auth & data protection     |
| [Task Finder](#database-schema)                          | Where to find what         |
| [Database Schema](#database-schema)                      | Tables & relationships     |
| [Testing](#testing)                                      | Unit & E2E tests           |
| [Environment Variables](#environment-variables)          | Config values              |
| [Performance & Optimization](#performance--optimization) | Indexing, caching, queries |
| [Error Handling](#error-handling)                        | Standard error format      |
| [Code Quality Standards](#code-quality-standards)        | Linting & style            |
| [Common Issues](#common-issues--solutions)               | Quick troubleshooting      |
| [Development Commands](#development-commands)            | npm scripts                |
| [Learning Path](#learning-path)                          | How to onboard             |
| [Project Status](#project-status)                        | Completion checklist       |

---

## ⚡ QUICK START

- **Main entry**: `src/index.ts`
- **Modules**: `src/modules/{auth,camps,people,resources,transfers,explorations}/`
- **Middleware**: `src/middlewares/{auth,role,camp,session,error}.middleware.ts`
- **Database**: MariaDB + Docker Compose (schema: `src/database/migrations/01-gestion-del-fin-seed.sql`)
- **Build**: `npm run build` | **Dev**: `npm run dev` | **Test**: `npm test`
- **Key Pattern**: Routes → Controllers → Services → Database

---

## Architecture Layer

```
Request → Routes (express) → Middleware → Controllers → Services → Database
```

Each request flows through middleware for validation, then to handlers:

- Auth middleware: verify JWT
- Role middleware: check permissions
- Camp middleware: verify camp access
- Session middleware: enforce 20-min timeout
- Error middleware: catch & format errors (runs last)

---

## Module Structure

All feature domains follow identical structure:

```
modules/{feature}/
├── {feature}.routes.ts    # Route definitions
├── {feature}.controller.ts # Request handlers
├── {feature}.service.ts    # Business logic
└── {feature}.schema.ts     # Zod validations
```

**Available Modules**:
| Module | Purpose |
|--------|---------|
| `auth/` | User authentication, JWT, password management |
| `camps/` | Camp CRUD, status management |
| `people/` | User/survivor management |
| `resources/` | Resource inventory CRUD |
| `transfers/` | Inter-camp resource trading |
| `explorations/` | Expeditions/missions |

**Cross-Cutting Concerns**:
| Directory | Purpose |
|-----------|---------|
| `logger/` | Winston logging, audit trails |
| `ai/` | Ingress evaluator, role assigner |
| `jobs/` | Background tasks (node-cron) |
| `config/` | Environment configuration |
| `shared/` | Constants, types, utilities |
| `middlewares/` | Express middleware (auth, role, session, error) |

---

## Implementation Patterns

### 1. Adding an Endpoint (Standard Flow)

**Step 1: Define validation** (`{module}.schema.ts`)

```typescript
export const createResourceSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  camp_id: z.number().int().positive(),
});
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
```

**Step 2: Service logic** (`{module}.service.ts`)

```typescript
export class ResourceService {
  async createResource(data: CreateResourceInput): Promise<Resource> {
    // Validate business rules
    // Query database
    // Return result
  }
}
```

**Step 3: Controller handler** (`{module}.controller.ts`)

```typescript
export function createResourceHandler(req: Request, res: Response) {
  const validated = createResourceSchema.parse(req.body);
  const resource = await resourceService.createResource(validated);
  return res.status(201).json(resource);
}
```

**Step 4: Register route** (`{module}.routes.ts`)

```typescript
export const resourceRoutes = express.Router();
resourceRoutes.post('/', createResourceHandler);
resourceRoutes.get('/:id', getResourceHandler);
```

**Step 5: Mount in app** (`src/index.ts`)

```typescript
app.use(
  '/resources',
  express.json(),
  authMiddleware,
  roleMiddleware(['resource_manager']),
  resourceRoutes,
);
```

### 2. Securing an Endpoint

Apply middleware in order (most restrictive first):

```typescript
app.get(
  '/protected',
  authMiddleware, // JWT valid?
  roleMiddleware(['admin']), // Has role?
  campMiddleware, // Camp access?
  sessionMiddleware, // Not timed out?
  handlerFunction,
);
```

### 3. Database Queries (When Implemented)

Pattern: Use prepared statements to prevent SQL injection

```typescript
const [rows] = await pool.query(
  'SELECT * FROM resources WHERE id = ? AND camp_id = ?',
  [resourceId, req.user.campId], // Parameters prevent injection
);
```

---

## Security Checklist

**Authentication & Authorization**:

- ✅ JWT in Authorization header
- ✅ Token payload: `userId`, `campId`, `role`, `expiresAt`
- ✅ Roles: `system_admin`, `resource_manager`, `travel_coordinator`, `worker`
- ✅ Verify tokens in `auth.middleware.ts`
- ✅ Check roles in `role.middleware.ts`
- ✅ Prevent cross-camp access in `camp.middleware.ts`

**Password & Data**:

- ✅ Never store plain passwords
- ✅ Hash with bcryptjs v3.0.3+ before storage
- ✅ Use prepared statements (parameterized queries)
- ✅ Validate all input with Zod schemas
- ✅ Sanitize user input before database queries
- ✅ Never log passwords or hashes

**Session Management**:

- ✅ 20-minute inactivity timeout in `session.middleware.ts`
- ✅ Update `users.last_activity` on each request
- ✅ Implement refresh tokens for long operations
- ✅ Clear tokens on logout

---

## Database Schema

**Location**: `src/database/migrations/01-gestion-del-fin-seed.sql`

Tables & relationships:

```
camps ─── users ─── roles
       ├── resources
       └── explorations

professions ─┬─ assigned to users

system_config (singleton: id=1)
```

**Key Tables** (for quick reference):
| Table | Key Fields | Notes |
|-------|-----------|-------|
| `users` | id, camp_id (FK), role_id (FK), username, password_hash, last_activity | Use password_hash for bcryptjs |
| `camps` | id, name (UNIQUE), location, status (ACTIVE\|ABANDONED) | Singleton: 1 camp per user |
| `roles` | id, name (UNIQUE), description | Immutable reference data |
| `resources` | id, camp_id (FK), name, quantity | Owned by camps |
| `professions` | id, name (UNIQUE), description | Reference data |
| `system_config` | id (=1), version, server_time | Game clock |

**Connection Implementation** (when needed):

```typescript
// src/database/connection.ts
import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
```

**Index Priorities**:

- `users.username` (UNIQUE)
- `users.camp_id` (FK + frequently filtered)
- `camps.name` (UNIQUE)
- `resources.camp_id` (FK + frequently filtered)

---

## Testing

**Unit Tests** (`tests/unit/`):

- Test service logic in isolation
- Mock database
- Framework: Jest
- Pattern: `{feature}.spec.ts`
- Command: `npm test`

**End-to-End Tests** (`tests/e2e/`):

- Test complete workflows
- Framework: Playwright
- Hit real endpoints
- Pattern: `{feature}.spec.ts`
- Command: `npm test:e2e`

**Example Test**:

```typescript
describe('ResourceService', () => {
  it('should create resource', async () => {
    const result = await resourceService.createResource({
      name: 'Food',
      quantity: 100,
      camp_id: 1,
    });
    expect(result.id).toBeDefined();
    expect(result.quantity).toBe(100);
  });
});
```

---

## Environment Variables

Required in `.env`:

**Server**:

```
PORT=3000
NODE_ENV=development|production
```

**Database**:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=admin
DB_NAME=gestion_del_fin
```

**JWT**:

```
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
```

**Logging**:

```
LOG_LEVEL=info|debug|error
LOG_FILE=./logs/app.log
```

**AI Models** (future):

```
AI_INGRESS_MODEL=path/to/model
AI_ROLE_MODEL=path/to/model
```

(See `.env.example` if available)

---

## Performance & Optimization

**Database Indexing** (create in migrations):

- `users.username` (UNIQUE)
- `users.camp_id` (FK, frequently filtered)
- `camps.name` (UNIQUE)
- `resources.camp_id` (FK, frequently filtered)

**Query Patterns**:

- Use JOINs, not N+1 queries
- Use pagination for large result sets (default: 20 items, max: 100)
- Use `utils/pagination.ts` helper

**Caching Strategy** (future consideration):

- Cache role definitions (rarely change)
- Cache camp rules
- Invalidate on update

---

## Error Handling

**Standard error format** (from `error.middleware.ts`):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable description",
    "statusCode": 400,
    "details": { "field": "error message" }
  }
}
```

**Codes**:

- `VALIDATION_ERROR` (400) - Zod schema failed
- `UNAUTHORIZED` (401) - Missing/invalid JWT
- `FORBIDDEN` (403) - Insufficient role/camp access
- `NOT_FOUND` (404) - Resource doesn't exist
- `SESSION_EXPIRED` (401) - 20-min timeout
- `SERVER_ERROR` (500) - Unexpected error

---

## Code Quality Standards

**Linting**:

- `npm run lint` - Find issues
- `npm run lint:fix` - Auto-fix
- `npm run format` - Prettier formatting
- `npm run spell` - Spell check

**Style Guide**:

- Variables/functions: camelCase
- Classes/types: PascalCase
- Constants: UPPER_SNAKE_CASE
- Comments: Explain "why", not "what"
- JSDoc for public functions

**TypeScript**:

- Strict mode enabled
- No `any` types without justification
- Explicit return types on functions

---

## Common Issues & Solutions

| Issue                             | Solution                                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| Type errors                       | Check `shared/types/index.ts`, add missing interfaces              |
| Route not found (404)             | Verify route mounted in `index.ts` with correct prefix             |
| Middleware not running            | Check order - some must run before others (e.g., auth before role) |
| DB connection fails               | Verify `docker-compose up`, env vars set, port 3306 available      |
| Zod validation fails              | Schema mismatch - check request body structure matches schema      |
| JWT expired                       | Implement refresh tokens or ask user to re-login                   |
| 20-min timeout fires unexpectedly | Update `users.last_activity` on every request in middleware        |
| `Cannot find module`              | Check import path, verify file exists, run `npm install`           |
| Tests fail                        | Ensure test database exists, migrations ran, seed data present     |
| Prettier conflicts ESLint         | Run `npm run lint:fix` then `npm run format` (that order)          |

---

## Development Commands

| Command               | Purpose                           |
| --------------------- | --------------------------------- |
| `npm run dev`         | Start dev server with hot reload  |
| `npm run build`       | Compile TypeScript to JavaScript  |
| `npm start`           | Run compiled production build     |
| `npm test`            | Run unit tests (Jest)             |
| `npm test:e2e`        | Run end-to-end tests (Playwright) |
| `npm run lint`        | Check code style                  |
| `npm run lint:fix`    | Auto-fix style issues             |
| `npm run format`      | Auto-format with Prettier         |
| `npm run spell`       | Check spelling                    |
| `docker-compose up`   | Start database container          |
| `docker-compose down` | Stop database container           |

---

## Learning Path

**Before coding**:

1. Read [core.md](./core.md) - understand project scope
2. Review this file - architecture & patterns
3. Skim database schema: `src/database/migrations/01-gestion-del-fin-seed.sql`
4. Look at `package.json` - dependencies

**Starting implementation**:

1. `src/modules/auth/` - foundational auth layer
2. `src/middlewares/` - understand request flow
3. Pick a module: `src/modules/{feature}/`
4. Follow module structure: routes → controller → service → schema

**Before committing**:

1. Write tests (unit + e2e)
2. Update types if needed: `shared/types/index.ts`
3. Run `npm run lint:fix && npm run format`
4. Run `npm test && npm test:e2e`
5. Verify behavior locally

---

## Project Status

**Current State**: Early-stage implementation (architecture defined, many TODO files)

**Complete**:

- ✅ Project structure & naming conventions
- ✅ Database schema (SQL)
- ✅ Middleware stack defined
- ✅ Module structure template
- ✅ Dependencies configured

**TODO**:

- ⏳ Database connection layer
- ⏳ Configuration files
- ⏳ All module implementations (auth, camps, people, resources, transfers, explorations)
- ⏳ Middleware logic
- ⏳ AI evaluators
- ⏳ Background job scheduler
- ⏳ Test coverage
- ⏳ API documentation

---

## Key Resources

- **Owner**: Matteo Quesada
- **Course**: EIF209, Universidad Nacional (2026)
- **Schema**: `src/database/migrations/01-gestion-del-fin-seed.sql`
- **Beginner Guide**: [core.md](./core.md)
- **Setup**: [README.md](./README.md)

---

## Reference Table: All Files

| Path                         | Status  | Purpose                 |
| ---------------------------- | ------- | ----------------------- |
| `src/index.ts`               | Partial | Server entry point      |
| `src/config/`                | TODO    | Configuration files     |
| `src/database/connection.ts` | TODO    | DB connection pool      |
| `src/database/seed.ts`       | TODO    | DB seed data            |
| `src/modules/*/`             | TODO    | Feature modules         |
| `src/middlewares/`           | TODO    | Express middleware      |
| `src/logger/`                | TODO    | Logging utilities       |
| `src/ai/`                    | TODO    | AI decision makers      |
| `src/jobs/`                  | TODO    | Background tasks        |
| `src/shared/`                | Partial | Constants, types, utils |
| `tests/`                     | TODO    | Test files              |
| `docker-compose.yml`         | ✅      | Database setup          |
| `jest.config.ts`             | ✅      | Test config             |
| `package.json`               | ✅      | Dependencies            |

---

**Last Updated**: March 13, 2026

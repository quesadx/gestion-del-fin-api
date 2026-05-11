# Agent Instructions - Gestión del Fin API

**Role**: AI Developer / Architect
**Stack**: Node.js, TS, Express, Prisma, Zod

## Core Architecture (Strict)

Reference: `docs/base-crud-flow.md`

### 1. Golden Standard

Use **`src/modules/camps/`** as the reference pattern.

### 2. Controller Rules

- **NO `try/catch`**. Errors must bubble to global middleware.
- **NO Business Logic**.
- **ID Validation**: Use `parseIdParam(req.params.id)`.
- **Response**: `res.json(result)` or `res.status(201).json(result)`.

### 3. Service Rules

- **Explicit 404s**: Check existence (`findUnique`) before `update`/`delete`. Throw `AppError` if missing.
- **Prisma Errors**:
  - `try/catch` only for constraints.
  - Use `handleUniqueConstraintError(error)` & `handleForeignKeyError(error)`.
- **Data Prep**: Use internal helper functions to clean inputs.

### 4. Validation (Zod)

- **Middleware**: `validate(Schema)` required on all routes.
- **Inference**: usage: `z.infer<typeof Schema>['body']`.

---

## File Structure

```text
src/
  modules/{name}/
    {name}.controller.ts  # Thin HTTP layer
    {name}.service.ts     # Logic & DB
    {name}.routes.ts      # Router & Middleware
    {name}.schema.ts      # Zod definitions
  shared/utils/
    parseIdParam.ts        # ID validation
    handlePrismaError.ts   # Error mapping
    appError.ts            # Error class
```

---

## Directives

- **Auth**: `authMiddleware` (JWT), `roleMiddleware`.
- **Context**: `campMiddleware` (scope), `sessionMiddleware` (timeout).
- **Database**: Prisma Client only. No raw SQL.
- **Tests**: Jest (`tests/unit/`), Playwright (`tests/e2e/`).

## Key Tables

- `camps`: Singleton per user (id, name, status).
- `users`: Auth & Permissions.
- `resources`: Owned by camps.

## Environment

`PORT`, `NODE_ENV`, `DB_URL`, `JWT_SECRET`.

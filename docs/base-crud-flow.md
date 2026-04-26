# Base CRUD Flow Documentation

Canonical architecture for `gestion-del-fin-api`. Reference: `camps` module.

## Architecture: Route -> Controller -> Service

### 1. Request Validation (Middleware/Zod)

- **File**: `{module}.schema.ts`, `{module}.routes.ts`
- **Pattern**: `zod` schema definitions -> `validate(Schema)` middleware.

### 2. Controllers (Orchestrator)

- **File**: `{module}.controller.ts`
- **Rules**:
  - **NO `try/catch`** (relies on async error bubbling).
  - Use `parseIdParam(req.params.id)`.
  - Return `res.json()`.

```typescript
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function getOne(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await Service.getById(id);
  return res.json(result);
}
```

### 3. Services (Logic)

- **File**: `{module}.service.ts`
- **Rules**:
  - Handle business logic.
  - **Prisma**: Check existence before update/delete (Throw `AppError` 404).
  - **Errors**: Catch only constraints using `handleUniqueConstraintError` / `handleForeignKeyError`.

```typescript
import { handleUniqueConstraintError } from '../../shared/utils/handlePrismaError.js';
import { AppError } from '../../shared/utils/appError.js';

export async function create(data: CreateDto) {
  try {
    return await prisma.model.create({ data: prepareData(data) });
  } catch (error) {
    handleUniqueConstraintError(error);
  }
}
```

### 4. Error Handling (Global)

- Throw `new AppError(msg, code)`.
- Unexpected errors bubble to global handler (500).

## New Module Checklist

1. [ ] `schema.ts`: Zod definitions.
2. [ ] `routes.ts`: `validate()` middleware.
3. [ ] `controller.ts`: `parseIdParam`, no try/catch.
4. [ ] `service.ts`: `handlePrismaError` utils, 404 checks.
5. [ ] `index.ts`: Register routes.

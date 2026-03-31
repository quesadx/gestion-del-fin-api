# Changes Summary for Re-apply (Dev Branch)

This document consolidates all the changes introduced during our session so you can replay them in your dev branch.

## 1) Global Error Handling

### File: src/middlewares/error.middleware.ts

#### Goal

- Centralize all API error mapping in one place.
- Capture AppError, ZodError, and PrismaClientKnownRequestError globally.

#### Changes made

- Added Zod and Prisma imports.
- Added AppError import.
- Added Prisma error mapper with:
  - P2002 -> 409
  - P2003 -> 409
  - P2025 -> 404
  - fallback -> 400
- Added reusable sendErrorResponse helper.
- Added res.headersSent guard.
- Added explicit handling for:
  - AppError
  - ZodError
  - Prisma.PrismaClientKnownRequestError
  - generic shaped errors (statusCode + message)
- Improved unhandled error logging context:
  - method, url, name, message, stack
- In production, hide raw internal error messages for 500.

#### Notes

If you want strict parity with the CRUD pattern, this file should be the primary error response authority.

---

## 2) Validation Middleware Delegation

### File: src/middlewares/validate.middleware.ts

#### Goal

- Avoid direct error responses inside validate middleware.
- Let global error middleware format errors consistently.

#### Changes made

- Removed direct ZodError response block.
- Kept parseAsync and delegated errors via next(error).

#### Intended end state

- validate() only validates and forwards errors.

---

## 3) People Controller Normalization

### File: src/modules/people/people.controller.ts

#### Goal

- Match the same structure as camps/resources/users controllers.

#### Changes made

- Removed local try/catch blocks from handlers.
- Switched ID parsing from Number(req.params.id) to parseIdParam(req.params.id).
- Normalized handler variable naming to result.
- Renamed listPeopleHandler -> getPeopleHandler (for naming consistency with other modules).

#### Intended handler style

- Thin controller.
- No business logic.
- No local error shaping.
- Errors bubble to global middleware.

---

## 4) People Routes Normalization

### File: src/modules/people/people.routes.ts

#### Goal

- Match canonical router style used in camps/resources/explorations.

#### Changes made

- Changed import from express to named Router import.
- Changed router init from express.Router() to Router().
- Updated route handler import/use from listPeopleHandler to getPeopleHandler.

---

## 5) People Service Refactor and Consistency

### File: src/modules/people/people.service.ts

#### Goal

- Improve readability and match CRUD service structure.
- Use shared Prisma error utilities.
- Make control flow easier to follow.

#### Changes made

- Added imports:
  - handleUniqueConstraintError
  - handleForeignKeyError
- Fixed missing profession check bug in createPerson:
  - if profession does not exist -> throw AppError(404)
  - removed potential undefined return path
- Added helper preparation functions:
  - preparePersonCreateData
  - preparePersonUpdateData
- Added reusable include constant:
  - personInclude = { camps: true, professions: true }
- Added readability helpers:
  - ensureCampExists
  - ensureProfessionExists
  - ensurePersonExists
  - validateRelations
- Centralized relation validation calls in create/update.
- Switched manual P2002 handling to shared handleUniqueConstraintError.
- Added foreign key handling on delete via handleForeignKeyError.

#### Result

- Cleaner top-down flow:
  - validate -> prepare -> persist -> map constraints

---

## 6) Schema Cleanup (Comment Noise)

### Files

- src/modules/camps/camps.schema.ts
- src/modules/resources/resources.schema.ts

#### Goal

- Remove low-value comments and keep schema files lean.

#### Changes made

- Removed comment lines above exported inferred types.

---

## 7) URL and Date Schema Upgrades (Zod)

### File: src/modules/people/people.schema.ts

#### Goal

- Replace deprecated URL API usage.
- Align datetime input validation with Prisma DateTime.

#### Changes made

- photo_url:
  - z.string().url().optional() -> z.url().optional()
- admitted_at:
  - custom refine date string -> z.iso.datetime()

### File: src/modules/explorations/explorations.schema.ts

#### Goal

- Align date validators with Prisma @db.Date fields.

#### Changes made

- dateStringSchema:
  - custom refine date string -> z.iso.date()
- Kept relational date-order validation in superRefine.
- Removed explanatory comment noise in schema body.

---

## 8) JWT Flow Refactor (Readability + Explicitness)

### File: src/shared/utils/jwt.ts

#### Goal

- Make token lifecycle explicit and typed.

#### Changes made

- Added AccessTokenPayload type.
- Added helper functions:
  - getJwtSecret()
  - getJwtExpiry()
  - signAccessToken(userId)
  - verifyAccessToken(token)
  - extractBearerToken(authorizationHeader)
- Kept compatibility exports:
  - generateToken(payload)
  - verifyToken(token)

---

## 9) Auth Service Token Usage Simplification

### File: src/modules/auth/auth.service.ts

#### Goal

- Use explicit access-token helper for readability.

#### Changes made

- Replaced generateToken({ userId: user.id }) with signAccessToken(user.id).

---

## 10) Auth Middleware Implementation

### File: src/middlewares/auth.middleware.ts

#### Goal

- Implement JWT auth gate for protected routes.

#### Changes made

- Replaced TODO with functional middleware.
- Added bearer extraction and token verification path.
- Added typed request augmentation interface (auth payload on request).
- Standardized 401 on missing/invalid/expired token.

---

## 11) Production JWT Secret Guard Hardening

### File: src/index.ts

#### Goal

- Fail fast in production if JWT secret is unsafe.

#### Changes made

- Hardened startup guard to reject:
  - missing JWT_SECRET
  - default insecure JWT_SECRET

---

## 12) Build Validation Performed

After each change batch, TypeScript build validation was run:

- npm run build

No type errors were introduced by the intended refactors.

---

## Quick Re-apply Order (Recommended)

1. error.middleware.ts
2. validate.middleware.ts
3. people.controller.ts
4. people.routes.ts
5. people.service.ts
6. people.schema.ts
7. explorations.schema.ts
8. jwt.ts
9. auth.service.ts
10. auth.middleware.ts
11. index.ts
12. camps.schema.ts and resources.schema.ts cleanup

---

## Optional Follow-up After Re-apply

- Ensure protected route strategy is explicitly documented (which routes require auth).
- Add unit tests for:
  - JWT helper functions
  - auth middleware success/failure paths
  - schema validation (z.url, z.iso.datetime, z.iso.date)
- Add E2E checks for:
  - login -> token -> protected endpoint access
  - invalid token -> 401

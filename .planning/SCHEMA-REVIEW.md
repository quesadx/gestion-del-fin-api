---
phase: schema-review
reviewed: 2026-05-24T14:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - prisma/schema.prisma
  - src/shared/utils/auditLog.ts
  - src/shared/utils/server-time.ts
  - src/modules/admission/admission.service.ts
  - src/modules/explorations/explorations.service.ts
  - src/modules/people/people.service.ts
  - src/modules/people/people.schema.ts
  - src/modules/inventory/inventory.service.ts
  - src/modules/system/system.service.ts
  - src/modules/system/system.controller.ts
  - src/modules/camps/camps.service.ts
  - src/modules/transfers/transfers.service.ts
  - src/modules/users/users.service.ts
  - src/modules/auth/auth.service.ts
  - src/jobs/daily-production.job.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Schema & Design Review

**Reviewed:** 2026-05-24T14:00:00Z
**Depth:** standard
**Files Reviewed:** 15 (12 listed + 3 cross-referenced: auth.service.ts, daily-production.job.ts, people.schema.ts)
**Status:** issues_found

## Summary

Five specific schema/design issues were investigated across the Prisma schema, service layer, and utility modules. One **critical** finding (incomplete audit coverage — violates project requirement for audit trails), four **warnings** (missing `@updatedAt`, inconsistent decimal precision, absent DB date-ordering constraints, dead `server_time` column), and one **info** item (application-level date validation does exist for expeditions despite no DB constraint).

---

## Critical Issues

### CR-01: Incomplete Audit Coverage — Admissions, Expeditions, People, and Inventory Operations Are Not Logged

**Files:**
- `prisma/schema.prisma:542-562` — `audit_log_action` and `audit_log_target_type` enums
- `src/modules/admission/admission.service.ts` — no `auditLog()` call anywhere
- `src/modules/explorations/explorations.service.ts` — no `auditLog()` call anywhere
- `src/modules/people/people.service.ts` — no `auditLog()` call anywhere
- `src/modules/inventory/inventory.service.ts` — no `auditLog()` call anywhere

**Issue:** The `audit_log_action` enum (schema lines 542–556) defines actions only for camps (`CREATE_CAMP`, `UPDATE_CAMP`, `DELETE_CAMP`), users (`CREATE_USER`, `UPDATE_USER`, `DELETE_USER`), transfers (`CREATE_TRANSFER`, `APPROVE_TRANSFER_SOURCE`, `APPROVE_TRANSFER_TARGET`, `COMPLETE_TRANSFER`, `REJECT_TRANSFER`), and auth (`LOGIN`, `LOGOUT`). The `audit_log_target_type` enum (lines 558–561) only covers `users`, `camps`, and `camp_transfers`.

There are **no enum entries** and **no `auditLog()` calls** for:
- **Admissions** — creating, reviewing, overriding an admission is not tracked
- **Expeditions** (explorations) — creating, starting, returning, canceling expeditions is not tracked
- **People** — creating, updating, deleting people; status changes; profession reassignments; contribution overrides are not tracked
- **Inventory** — manual adjustments, consumption, gains are not tracked

This violates project requirement #6 ("Audit Trail — Log user actions for security review") from AGENTS.md. There is no fallback or raw-string mechanism; these operations are simply omitted from audit logging entirely.

**Fix:**

1. Extend `audit_log_action` enum in `prisma/schema.prisma`:
```prisma
enum audit_log_action {
  CREATE_CAMP
  UPDATE_CAMP
  DELETE_CAMP
  CREATE_USER
  UPDATE_USER
  DELETE_USER
  CREATE_TRANSFER
  APPROVE_TRANSFER_SOURCE
  APPROVE_TRANSFER_TARGET
  COMPLETE_TRANSFER
  REJECT_TRANSFER
  LOGIN
  LOGOUT
  CREATE_ADMISSION
  REVIEW_ADMISSION
  OVERRIDE_ADMISSION
  CREATE_EXPEDITION
  UPDATE_EXPEDITION_STATUS
  CANCEL_EXPEDITION
  CREATE_PERSON
  UPDATE_PERSON
  DELETE_PERSON
  CHANGE_PERSON_STATUS
  REASSIGN_PROFESSION
  CREATE_OVERRIDE
  MANUAL_INVENTORY_ADJUST
}
```

2. Extend `audit_log_target_type` enum:
```prisma
enum audit_log_target_type {
  users
  camps
  camp_transfers
  admission_requests
  expeditions
  people
  inventory_logs
}
```

3. Add `auditLog()` calls to each service's mutation methods following the pattern in `camps.service.ts` and `users.service.ts`.

---

## Warnings

### WR-01: Missing `@updatedAt` on Four Models

**File:** `prisma/schema.prisma`

| Model | Has `created_at` | Has `@updatedAt` / `updated_at` | Evidence in service |
|-------|:-:|:-:|------|
| `camps` (line 116) | ✅ `created_at @default(now())` | ❌ **Missing** | `camps.service.ts` `updateCamp()` does not manually set `updated_at` |
| `admission_requests` (line 24) | ✅ `created_at @default(now())` | ❌ **Missing** (has `reviewed_at` which is not the same) | `admission.service.ts` `reviewAdmission()` sets `reviewed_at` but not `updated_at` |
| `camp_transfers` (line 84) | ✅ `created_at @default(now())` | ❌ **Missing** (has `approved_source_at`, `approved_target_at`) | `transfers.service.ts` updates `approved_source_at`/`approved_target_at` but not `updated_at` |
| `expeditions` (line 194) | ✅ `created_at @default(now())` | ❌ **Missing** | `explorations.service.ts` `updateExploration()`/`updateExpeditionStatus()` never sets `updated_at` |

Compare with models that DO have `@updatedAt`: `people`, `inventories`, `professions`, `resource_types`, `roles`, `permissions`, `contribution_overrides`, `camp_transfer_items`, `profession_reassignment_logs`. The pattern is inconsistently applied.

**Issue:** Without `@updatedAt`, Prisma does not auto-track update timestamps. The service code does not manually compensate either (no `updated_at: new Date()` in mutations for these four models). This means it is impossible to determine when a camp, admission request, camp transfer, or expedition was last modified.

**Fix:**
```prisma
model camps {
  // ... existing fields ...
  created_at  DateTime  @default(now())
+ updated_at  DateTime  @updatedAt
}

model admission_requests {
  // ... existing fields ...
  created_at   DateTime  @default(now())
+ updated_at   DateTime  @updatedAt
}

model camp_transfers {
  // ... existing fields ...
  created_at   DateTime  @default(now())
+ updated_at   DateTime  @updatedAt
}

model expeditions {
  // ... existing fields ...
  created_at   DateTime  @default(now())
+ updated_at   DateTime  @updatedAt
}
```

---

### WR-02: Inconsistent Decimal Precision — `contribution_overrides.amount` Uses `Decimal(8,2)` While All Other Amount Fields Use `Decimal(12,2)`

**File:** `prisma/schema.prisma:144`

**Issue:** The `contribution_overrides.amount` column is defined as `Decimal(8,2)` (max 999,999.99) while nearly every other amount field in the schema uses `Decimal(12,2)` (max 9,999,999,999.99):
- `expedition_allocated_resources.amount` — `Decimal(12,2)` (line 161)
- `expedition_found_resources.amount` — `Decimal(12,2)` (line 173)
- `professions_resources_amounts.amount` — `Decimal(12,2)` (line 346)
- `inventories.quantity` — `Decimal(12,2)` (line 225)
- `inventory_logs.quantity_change` — `Decimal(12,2)` (line 244)

The Zod schema (`people.schema.ts:74-78`) explicitly validates this limit:
```typescript
amount: z.number()
  .max(999999.99, 'amount exceeds DECIMAL(8,2) range')
  .min(-999999.99, 'amount exceeds DECIMAL(8,2) range'),
```

The value is used in `daily-production.job.ts:92` via `asNumber(override.amount)` and passed to `increaseInventoryWithLog()` which targets `inventories` (Decimal(12,2)). The `asNumber()` conversion bridges the types, but the asymmetric precision is a bug waiting to happen:
- If the Zod validation is ever removed or loosened, values > 999,999.99 will crash at the DB layer
- The `daily_ration` field on `resource_types` is also `Decimal(8,2)` (line 360), which is reasonable for a per-person daily amount, but an override amount that represents a total production addition has the same 8-digit cap as a per-person ration value, which is logically inconsistent
- Other "amount" fields that participate in the same aggregation math (e.g., `professions_resources_amounts.amount` = Decimal(12,2) summed with `contribution_overrides.amount` = Decimal(8,2)) have different ranges

**Fix:** Change `contribution_overrides.amount` to `Decimal(12, 2)` for consistency:
```prisma
model contribution_overrides {
  // ...
- amount  Decimal  @db.Decimal(8, 2)
+ amount  Decimal  @db.Decimal(12, 2)
  // ...
}
```
Update Zod schema constraint to match (`max(9999999999.99)`). Also consider changing `resource_types.daily_ration` from `Decimal(8,2)` to `Decimal(12,2)` for the same reason.

---

### WR-03: No Database-Level Date-Ordering Constraints on `expeditions`

**File:**
- `prisma/schema.prisma:194-217` — `expeditions` model
- `src/modules/explorations/explorations.service.ts:38-57` — `validateDateOrder()` function

**Issue:** The `expeditions` table has four date fields (`departure_date`, `expected_return_date`, `max_return_date`, `actual_return_date`) with no database constraint enforcing their logical ordering (e.g., `departure_date ≤ expected_return_date ≤ max_return_date`).

**Application-level validation DOES exist** in `explorations.service.ts:38-57` via the `validateDateOrder()` function, which is called from:
- `prepareCreateData()` (line 307)
- `prepareUpdateData()` (line 333)
- `updateExploration()` directly with merged dates (line 438)

However, there is no CHECK constraint in the database schema. This means:
- Direct SQL inserts/updates (e.g., migrations, data patches, admin queries) can violate date ordering
- Race conditions or bugs in the application code can slip past the service-layer check
- There is no schema-level documentation that these dates should be ordered

**Fix:** Add a `@@constraint` or raw SQL CHECK constraint to the `expeditions` model. Since Prisma does not natively support CHECK constraints in the schema DSL, use a migration with raw SQL:
```sql
ALTER TABLE expeditions ADD CONSTRAINT expeditions_date_order_check
  CHECK (
    expected_return_date >= departure_date
    AND max_return_date >= expected_return_date
    AND (actual_return_date IS NULL OR actual_return_date >= departure_date)
  );
```

---

### WR-04: `system_configs.server_time` Column Is Dead — Never Read, Never Updated After Seed

**Files:**
- `prisma/schema.prisma:412-419` — `system_configs` model with `server_time` column
- `src/modules/system/system.service.ts:1-9` — reads from `serverTime` utility, not DB
- `src/shared/utils/server-time.ts:1-7` — returns `new Date()` from local process clock
- `prisma/seed.ts:834-838` — only place that writes to `system_configs`

**Issue:** The `system_configs` table has a `server_time` column (line 415) that is **written exactly once** in `prisma/seed.ts` during seeding and **never read or written** by any application code. The `/api/system/time` endpoint (implemented in `system.service.ts`) returns `serverTime.now()` which is simply `new Date()` from the Node.js process clock, not from the database.

This creates two problems:

1. **Dead schema column** — `system_configs.server_time` occupies space and implies an intent (centralized time authority) that is not implemented. Any future developer reading the schema would reasonably expect that the system time comes from the database.

2. **No time synchronization** — The advertised `/api/system/time` endpoint is supposed to be "critical for client sync" (AGENTS.md). It returns the server's local process time, not a database-anchored timestamp. If the server's clock drifts (NTP failure, container clock skew, etc.), all time-dependent operations (rations, sessions, expedition scheduling) will be affected, and clients have no reliable time source to sync against.

The `server-time.ts` utility is only imported by `system.service.ts` — no other module uses it (confirmed by grep). Every other module calls `new Date()` directly, meaning there is no single time authority at all.

**Fix:** Either (a) remove the dead `server_time` column and accept that system time = server clock time, or (b) implement a proper time oracle:

Option A (simplest — remove dead schema):
```prisma
model system_configs {
  id         Int      @id @default(1)
  version    String?  @db.VarChar(20)
  created_at DateTime @default(now())
  @@map("system_config")
}
```

Option B (implement actual DB time authority):
```typescript
// src/shared/utils/server-time.ts
import { prisma } from '../../lib/prisma.js';

async function getDbTime(): Promise<Date> {
  const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
  return result[0].now;
}

export async function writeHeartbeat(): Promise<void> {
  await prisma.system_configs.update({
    where: { id: 1 },
    data: { server_time: new Date() },
  });
}

// Update system.service.ts to query DB time instead of local clock
export async function getServerTime() {
  const dbNow = await getDbTime();
  return {
    now: dbNow,
    iso: dbNow.toISOString(),
    today: dbNow.toISOString().split('T')[0],
  };
}
```

---

## Info

### IN-01: Application-Level Date Validation Exists for Expeditions (Mitigates WR-03)

**File:** `src/modules/explorations/explorations.service.ts:38-57`

**Issue:** While WR-03 documents the absence of a DB-level constraint, the application-level validation in `validateDateOrder()` is correctly implemented and thorough. It validates three ordering rules:
1. `expected_return_date ≥ departure_date`
2. `max_return_date ≥ expected_return_date`
3. `actual_return_date ≥ departure_date`

It is called during both creation and update flows, including in `updateExploration()` where it merges incoming dates with existing ones before validating (lines 432–443), ensuring partial updates don't skip the check.

Consider promoting this to a DB CHECK constraint (as described in WR-03's fix) to guard against direct-DB writes.

---

_Reviewed: 2026-05-24T14:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_

---
phase: schema-final
reviewed: 2026-05-17T22:00:00Z
depth: deep
files_reviewed: 1
files_reviewed_list:
  - prisma/schema.prisma
findings:
  critical: 1
  warning: 7
  info: 4
  total: 12
status: issues_found
---

# Schema Final Review: Code Review Report

**Reviewed:** 2026-05-17T22:00:00Z
**Depth:** deep
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Final deep review of `prisma/schema.prisma` (481 lines, 25 models, 11 enums) after two previous review passes and two fix phases.

**Previous review fixes verified (10/12 resolved):**
- CR-01: `ai_profession_id` FK added ✅
- WR-01: Datasource doc corrected to PostgreSQL ✅
- WR-02: `persons` → `people` with `@@map("persons")` ✅
- WR-03: `camp_transfers` → `led_transfers` with named relation ✅
- WR-05: `person_status_log.changed_by` onDelete SetNull ✅
- WR-06: `camp_transfer_item.person_id` onDelete Restrict ✅
- WR-07: `admission_requests → person` FK added ✅
- WR-08: `photo_url` VarChar 255→500 ✅
- WR-09: `@@unique([user_id, achievement_id])` added ✅
- WR-10: 6 redundant indexes removed ✅

**What remains:**
1. **BLOCKER**: `contribution_overrides` has orphaned columns, misindexed FKs, and a camelCase relation name — a structural integrity failure.
2. The `user_achievements` redundant index from v2 review was NOT fixed.
3. Several new issues found: missing `@updatedAt`, unconstrained audit log strings, singleton enforcement gap, FK relation inconsistencies, and model naming anti-patterns.

---

## Critical Issues

### CR-01: `contribution_overrides` — orphaned FK columns, misindexed relations, camelCase violation

**File:** `prisma/schema.prisma:120-138`

**Issue:** The `contribution_overrides` model has three structural defects that create data integrity risks and index coverage gaps:

**(A) Orphaned columns (no @relation):**
- `created_by Int` (line 127) — a required integer named with `_id` suffix pattern, implying a FK reference to `users`, but has **no** `@relation` field. The database has no FK constraint here.
- `resource_type_id Int` (line 123) — a required integer named as a FK to `resource_type`, but has **no** `@relation` field. The database has no FK constraint here.

**(B) Actual relations point to DIFFERENT columns:**
```prisma
resourceType     resource_type? @relation(fields: [resource_typeId], references: [id])
resource_typeId  Int?           // ← the ACTUAL FK, but optional
users            users?         @relation(fields: [usersId], references: [id])
usersId          Int?           // ← the ACTUAL FK, but optional
```
The relations use `resource_typeId Int?` and `usersId Int?` (both nullable), while `resource_type_id Int` (required) and `created_by Int` (required) sit next to them without constraints. This means:
- Two different Int columns exist for the same FK reference
- The relations point to the nullable versions, so `resource_type_id` and `created_by` can hold stale/invalid IDs
- There's **no referential integrity** on `resource_type_id` or `created_by`

**(C) Indexes are on the WRONG columns:**
```prisma
@@index([created_by])        // indexes orphaned column — useless
@@index([resource_type_id])  // indexes orphaned column — useless
// MISSING: @@index([usersId])       — no index on actual FK
// MISSING: @@index([resource_typeId]) — no index on actual FK
```

**(D) camelCase relation name:**
```prisma
resourceType     resource_type? @relation(...)  // ← should be resource_type (snake_case)
```

**Fix:** Restructure the model to have a single, consistent FK per relation:

```prisma
model contribution_overrides {
  id               Int            @id @default(autoincrement())
  person_id        Int
  resource_type_id Int
  reason           String         @db.VarChar(255)
  start_date       DateTime       @default(now()) @db.Date
  end_date         DateTime?      @db.Date
  created_by       Int
  amount           Decimal        @db.Decimal(8, 2)

  persons          people         @relation(fields: [person_id], references: [id], onDelete: Cascade, onUpdate: Cascade)
  resource_type    resource_type  @relation(fields: [resource_type_id], references: [id], onDelete: Restrict, onUpdate: Cascade)
  users            users          @relation(fields: [created_by], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([created_by])
  @@index([person_id])
  @@index([resource_type_id])
}
```

If `created_by` should allow SetNull (per original WR-04 intent), make `created_by Int?` and set `onDelete: SetNull`. But given the audit trail requirement, `Restrict` is safer — don't delete a user who created overrides.

Remove `resourceType`, `resource_typeId`, `users`, `usersId` — these are the double columns.

---

## Warnings

### WR-01: Redundant `@@index([user_id])` on `user_achievements` (UNFIXED from v2)

**File:** `prisma/schema.prisma:371-374`

**Issue:** The v2 review (schema-REVIEW-v2.md, WR-01) identified this but it was never fixed. `user_achievements` has:
```prisma
@@unique([user_id, achievement_id])   // ← B-tree index on (user_id, achievement_id)
@@index([achievement_id])              // ← needed: non-leading column
@@index([user_id])                     // ← REDUNDANT: user_id is leading column of @@unique
```
The `@@unique` constraint already creates an index that covers `user_id`-only queries via leftmost prefix. A separate `@@index([user_id])` provides zero additional benefit while costing write overhead.

**Fix:** Remove `@@index([user_id])` (line 373):
```prisma
@@unique([user_id, achievement_id])
@@index([achievement_id])
// @@index([user_id])  ← DELETE
```

---

### WR-02: `contribution_overrides` relations missing explicit referential actions

**File:** `prisma/schema.prisma:130-133`

**Issue:** Two of the model's three relations have NO `onDelete`/`onUpdate` specified:
```prisma
resourceType  resource_type? @relation(fields: [resource_typeId], references: [id])
//            ^^ no onDelete, no onUpdate — relies on Prisma defaults
users         users?         @relation(fields: [usersId], references: [id])
//            ^^ no onDelete, no onUpdate — relies on Prisma defaults
```
Prisma defaults vary by provider and relation optionality. For optional relations (`users?`), Prisma applies `onDelete: SetNull, onUpdate: Cascade` by default. For required relations (`users`), the default is `onDelete: Restrict, onUpdate: Cascade`. **Relying on defaults makes the schema behavior implicit and version-dependent.** Every `@relation` should explicitly declare its referential actions.

**Note:** This issue is partially caused by the orphaned-column problem in CR-01. Once CR-01 is fixed (consolidating onto single FK columns), these relations will need explicit actions anyway.

**Fix:** Add explicit `onDelete`/`onUpdate` to every `@relation`:

```prisma
resource_type  resource_type? @relation(fields: [resource_type_id], references: [id], onDelete: Restrict, onUpdate: Cascade)
```

---

### WR-03: `audit_log.action` and `audit_log.target_type` are unconstrained strings

**File:** `prisma/schema.prisma:408-409`

**Issue:** These fields represent values from a known, finite set of actions and entity types:
```prisma
action      String   @db.VarChar(100)
target_type String   @db.VarChar(80)
```
But they are plain `String` with no enum constraint. This means:
- Any arbitrary string can be stored (typos, inconsistent casing — "CREATE" vs "create" vs "Create")
- No database-level validation that only valid action/entity types are recorded
- Querying/filtering by action type is error-prone due to casing inconsistencies

**Fix:** Create enums for the constrained values:

```prisma
enum audit_log_action {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  // ... add all known actions
}

enum audit_log_target_type {
  CAMP
  PERSON
  RESOURCE
  EXPEDITION
  TRANSFER
  ADMISSION
  USER
  ROLE
  PERMISSION
  INVENTORY
  // ... add all known entity types
}
```

Then update the model:
```prisma
action      audit_log_action
target_type audit_log_target_type
```

If the action/target_type sets are genuinely dynamic (e.g., plugins add new types), keep as String but document this design choice explicitly.

---

### WR-04: `inventory.last_updated` does not auto-update on row modification

**File:** `prisma/schema.prisma:201`

**Issue:**
```prisma
last_updated DateTime @default(now())
```
The field uses `@default(now())` which sets the timestamp **on creation only**. When `quantity` is updated (the primary operational field), `last_updated` remains unchanged unless the application code explicitly sets it. This means:
- `last_updated` will always show the creation time, not the last modification time
- Inventory freshness tracking is broken — you can't tell if a stock level was just updated or hasn't been touched in days

**Fix:** Change to `@updatedAt` (Prisma's auto-updating timestamp decorator):
```prisma
last_updated DateTime @updatedAt
```

Or keep `@default(now())` for initial value and ensure the application code always passes `last_updated: new Date()` on every `update` call. The `@updatedAt` approach is safer and more maintainable.

---

### WR-05: `system_config` singleton pattern has no enforcement mechanism

**File:** `prisma/schema.prisma:358-362`

**Issue:**
```prisma
model system_config {
  id          Int      @id @default(1)
  version     String?  @db.VarChar(20)
  server_time DateTime
}
```
The pattern `@id @default(1)` suggests a singleton row (always id=1). However, there is nothing preventing a second row from being inserted with a hardcoded id=2:
- No application-level enforcement in the schema
- No `@@unique` constraint that limits id values
- If a second row is inserted, queries like `findUnique({ where: { id: 1 } })` will still work, but `findFirst()` or `findMany()` would return unexpected data
- The `server_time` field is likely updated by a cron job — if two rows exist, which one is authoritative?

**Fix:** Either:
- Make `id` a `@default(autoincrement())` and add application logic to prevent more than one row, or
- Accept the risk as a known singleton pattern and document it clearly (current approach)

This is currently not an active bug, but the lack of enforcement makes it fragile.

---

### WR-06: `/api/system/time` server time could become stale without a refresh mechanism

**File:** `prisma/schema.prisma:361`

**Issue:** The `system_config.server_time` field is a `DateTime` column that stores server time. This field is used by the `GET /api/system/time` endpoint. But there is no:
- Auto-refresh mechanism (no `@updatedAt`, no `@default(now())`)
- Index on `server_time` (not needed for a singleton, but concerning if stale)
- Default value or constraint ensuring it's always populated

If the application sets `server_time` once at startup and never refreshes it, clients will see stale timestamps indefinitely. The system should either:
1. Set this from server's `new Date()` on each request to `/api/system/time` (not ideal — blocks on DB write)
2. Have a cron job that updates it periodically
3. Serve the time directly from the Node.js process without database round-trip

This is a design note more than a schema defect — the schema cannot enforce runtime freshness.

---

### WR-07: Model naming convention remains inconsistent

**File:** `prisma/schema.prisma` (throughout)

**Issue:** Despite the `persons→people` rename, the schema still mixes singular and plural model names without consistent convention:

| Convention | Models |
|---|---|
| **Plural** | `admission_requests`, `camp_transfers`, `camps`, `contribution_overrides`, `expedition_allocated_resources`, `expedition_found_resources`, `expedition_members`, `expeditions`, `professions`, `professions_resources_amounts`, `roles`, `permissions`, `role_permissions`, `user_achievements`, `users`, `achievements`, `people` |
| **Singular** | `camp_transfer_item`, `inventory`, `inventory_log`, `person_status_log`, `profession_reassignment_log`, `resource_type`, `system_config`, `audit_log` |

8 of 25 models are singular. This creates inconsistency in generated Prisma client helpers and makes it harder for developers to predict model names. Every junction/log table should follow the same convention as the rest.

**Fix:** Rename the 8 singular models to plural:
- `camp_transfer_item` → `camp_transfer_items`
- `inventory` → `inventories` (or `inventory_records`)
- `inventory_log` → `inventory_logs`
- `person_status_log` → `person_status_logs`
- `profession_reassignment_log` → `profession_reassignment_logs`
- `resource_type` → `resource_types`
- `system_config` → `system_configs`
- `audit_log` → `audit_logs`

Each rename requires updating `prisma.xxx` references in application code and adding `@@map("original_name")` if the DB table name must stay unchanged.

---

## Info

### IN-01: `inventory_log.delta` has no sign constraint

**File:** `prisma/schema.prisma:216`

**Issue:** `delta Decimal @db.Decimal(12, 2)` can be positive (inflow) or negative (outflow), but this is documented nowhere. A developer could assume only positive values and miscompute inventory balances. The `log_type` enum (`DAILY_GAIN`, `DAILY_RATION`, `MANUAL_IN`, `MANUAL_OUT`, etc.) provides context for whether a delta should be positive or negative, but there's no CHECK constraint enforcing that `DAILY_GAIN` always has positive delta and `DAILY_RATION` always has negative.

Consider adding application-level validation that delta sign matches log_type semantics.

---

### IN-02: `professions_resources_amounts.amount` vs `contribution_overrides.amount` precision mismatch

**File:** `prisma/schema.prisma:128,305`

**Issue:** Both fields store resource quantities per person, but with different precision:
```prisma
// contribution_overrides.amount
amount Decimal @db.Decimal(8, 2)     // max 999,999.99

// professions_resources_amounts.amount
amount Decimal @db.Decimal(12, 2)    // max 9,999,999,999.99
```
If a contribution override amount is used in calculations with profession amounts (e.g., a person's total contribution = profession baseline + override), the override's `Decimal(8,2)` could overflow. If there's ever an override for a resource type where profession amount is > 6 digits, the math fails.

Align precision if these values are ever combined in the same calculation.

---

### IN-03: `admission_requests.photo_url` and `id_card_url` still unmatched duplicates

**File:** `prisma/schema.prisma:29-30`

**Issue:** These two URL fields hold related-but-distinct data:
- `photo_url String? @db.VarChar(500)` — person's photo
- `id_card_url String? @db.VarChar(500)` — ID card image

Both are `@db.VarChar(500)` and both are `String?` — these match consistently ✅. However, there's a subtle concern: when a `person` record is created from an admission request, the `photo_url` is copied from `admission_requests` to `people`, but `id_card_url` has no corresponding field in `people`. The ID card photo is lost after admission unless stored elsewhere.

This is a domain design observation, not a schema defect.

---

### IN-04: `expeditions.date` constraint consistency

**File:** `prisma/schema.prisma:179-182`

**Issue:** Four date fields are defined with no logical ordering constraints:
```prisma
departure_date       DateTime  @db.Date
expected_return_date DateTime  @db.Date
actual_return_date   DateTime? @db.Date
max_return_date      DateTime  @db.Date
```

There should exist: `departure_date <= expected_return_date <= max_return_date` and `actual_return_date >= departure_date` (if set). Prisma cannot enforce CHECK constraints, but the application code should validate these relationships before insert/update. This is a dependency for the expeditions module to verify.

---

## Verification Summary

| Previous Finding | Status | Notes |
|---|---|---|
| CR-01: ai_profession_id missing FK | ✅ Fixed | Relation added with SetNull |
| WR-01: Datasource mismatch | ✅ Fixed | AGENTS.md corrected to PostgreSQL |
| WR-02: persons → people | ✅ Fixed | `@@map("persons")` preserves table name |
| WR-03: persons.camp_transfers | ✅ Fixed | Renamed to `led_transfers` |
| WR-04: contribution_overrides users Restrict | ❌ **WRONG FIX** | See CR-01 — fix introduced orphaned columns |
| WR-05: person_status_log users Restrict | ✅ Fixed | Changed to SetNull |
| WR-06: camp_transfer_item persons SetNull | ✅ Fixed | Changed to Restrict |
| WR-07: admission→person link | ✅ Fixed | person_id FK added |
| WR-08: photo_url VarChar length | ✅ Fixed | Changed to 500 |
| WR-09: unique on user_achievements | ✅ Fixed | `@@unique` added |
| WR-10: redundant indexes | ✅ Fixed | 6 redundant indexes removed |
| WR-01 (v2): redundant user_achievements index | ❌ **NOT FIXED** | See WR-01 in this review |

---

_Reviewed: 2026-05-17T22:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: deep_

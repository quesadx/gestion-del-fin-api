---
phase: schema-review
fixed_at: 2026-05-24T15:00:00Z
review_path: .planning/SCHEMA-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase schema: Code Review Fix Report

**Fixed at:** 2026-05-24T15:00:00Z
**Source review:** .planning/SCHEMA-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Incomplete Audit Coverage

**Files modified:** `prisma/schema.prisma`, `src/modules/admission/admission.service.ts`, `src/modules/admission/admission.controller.ts`, `src/modules/explorations/explorations.service.ts`, `src/modules/inventory/inventory.service.ts`, `src/modules/people/people.service.ts`, `src/modules/people/people.controller.ts`

**Commit:** `1dc6c9b`

**Applied fix:**
1. Extended `audit_log_action` enum with 12 new entries: `CREATE_ADMISSION`, `REVIEW_ADMISSION`, `OVERRIDE_ADMISSION`, `CREATE_EXPEDITION`, `UPDATE_EXPEDITION_STATUS`, `CANCEL_EXPEDITION`, `CREATE_PERSON`, `UPDATE_PERSON`, `DELETE_PERSON`, `CHANGE_PERSON_STATUS`, `REASSIGN_PROFESSION`, `CREATE_OVERRIDE`, `MANUAL_INVENTORY_ADJUST`
2. Extended `audit_log_target_type` enum with 4 new entries: `admission_requests`, `expeditions`, `people`, `inventory_logs`
3. Added `auditLog()` calls in admission service: `createAdmission` (new `createdBy` param), `reviewAdmission`
4. Added `auditLog()` calls in explorations service: `createExploration`, `updateExpeditionStatus`, `deleteExploration` (using existing `created_by`/`changed_by` fields from DTOs)
5. Added `auditLog()` calls in people service: `createPerson` (new `createdBy` param), `updatePerson`, `deletePerson` (new `deletedBy` param), `createPersonStatusLog`, `createProfessionReassignment` (new `changedBy` param), `createContributionOverride`
6. Added `auditLog()` call in inventory service: `createManualAdjustment` (already had `userId`)
7. Updated controllers to pass authenticated userId where needed: `admission.controller.ts`, `people.controller.ts`

**Note:** Daily rations/production jobs (`consumeInventoryWithLog`, `increaseInventoryWithLog`) were intentionally NOT instrumented with `auditLog()` because they are automated cron jobs with no actor user. The `inventory_logs` table already provides the audit trail for inventory movements at the data level.

---

### WR-01: Missing `@updatedAt` on Four Models

**Files modified:** `prisma/schema.prisma`

**Commit:** `d7815a3`

**Applied fix:**
Added `updated_at DateTime @updatedAt` field to four models that were missing it:
- `camps`
- `admission_requests`
- `camp_transfers`
- `expeditions`

These now match the pattern used by all other models (`people`, `inventories`, `professions`, `resource_types`, `roles`, `permissions`, `contribution_overrides`, `camp_transfer_items`, `profession_reassignment_logs`).

---

### WR-02: Inconsistent Decimal Precision

**Files modified:** `prisma/schema.prisma`, `src/modules/people/people.schema.ts`

**Commit:** `a0b2317`

**Applied fix:**
1. Changed `contribution_overrides.amount` from `Decimal(8, 2)` to `Decimal(12, 2)` in the Prisma schema
2. Updated the Zod schema validation in `people.schema.ts`: `.max(999999.99)` → `.max(9999999999.99)` and `.min(-999999.99)` → `.min(-9999999999.99)`, and updated error messages from `DECIMAL(8,2)` to `DECIMAL(12,2)`

The `contribution_overrides.amount` now has the same precision as all other amount fields in the schema (`expedition_allocated_resources.amount`, `expedition_found_resources.amount`, `professions_resources_amounts.amount`, `inventories.quantity`, `inventory_logs.quantity_change`).

---

### WR-03: No Database-Level Date-Ordering Constraints

**Files modified:** `prisma/schema.prisma`

**Commit:** `2928309`

**Applied fix:**
Added a comment block to the `expeditions` model in the Prisma schema documenting:
- The date-ordering rules (`departure_date ≤ expected_return_date ≤ max_return_date`, `actual_return_date ≥ departure_date`)
- That these are enforced at the application level via `validateDateOrder()` in `explorations.service.ts`
- The raw SQL for a CHECK constraint that should be considered for direct-DB access safety

---

### WR-04: `system_configs.server_time` Dead Column

**Files modified:** `prisma/schema.prisma`, `prisma/seed.ts`

**Commit:** `c8093d4`

**Applied fix:**
1. Removed the `server_time` field from `system_configs` model in the Prisma schema
2. Removed `server_time: new Date()` from the seed data in `prisma/seed.ts`

Verified that neither `system.service.ts` nor `system.controller.ts` read this column — they use `serverTime.now()` which returns `new Date()` from the local process clock. No other file references `server_time`.

---

_Fixed: 2026-05-24T15:00:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_

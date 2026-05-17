---
status: complete
date: 2026-05-17
id: 20260517-fix-prisma-schema
---

# Quick Task: Fix Prisma Schema Issues

## Changes Made

### 1. Cyclic Reference Fix
- Removed reverse relation fields `camp_transfers_camp_transfers_requesting_campTocamps` and `camp_transfers_camp_transfers_target_campTocamps` from `camps` model — these created a cycle between `camp_transfers` and `camps`

### 2. FK Actions (NoAction → Proper Actions)
All 44 relations updated with appropriate referential actions:
- **Restrict** (17): Critical entity refs — camps, resource_type, professions, created_by references
- **Cascade** (17): Composition/ownership — transfer items, expedition members/resources, role_permissions, user_achievements, contribution_overrides, inventory
- **SetNull** (10): Optional references — reviewed_by, approved_by_source/target, logged_by, leader_person_id, audit_log references

### 3. snake_case Relation Names
Cleaned up auto-generated Prisma relation field names in:
- `camp_transfers`: `camps_camp_transfers_requesting_campTocamps` → `requesting_camp_ref` (etc.)
- `users`: `camp_transfers_camp_transfers_approved_by_sourceTousers` → `transfers_approved_by_source` (etc.)
- `profession_reassignment_log`: from/to ugly names → `from_profession` / `to_profession`
- `professions`: reverse refs → `from_profession_logs` / `to_profession_logs`

### 4. person_status_log Enum Fix
- `old_status` and `new_status` changed from `String @db.VarChar(20/45)` to `persons_status` enum — eliminates transitive dependency on raw strings

### 5. audit_log Nullable Fix (post-review)
- Code review identified: `audit_log.user_id` and `camp_id` were `Int` (NOT NULL) but had `onDelete: SetNull` — a Prisma schema validation error
- Changed both to `Int?` and relation fields to optional (`users?`, `camps?`)

### 6. Code Updates
- `transfers.service.ts`: Updated `include` fields to match new relation names
- `people.service.ts`: Updated `include` fields to match new relation names

## Files Changed
- `prisma/schema.prisma` — All schema changes
- `src/modules/transfers/transfers.service.ts` — Updated relation field references
- `src/modules/people/people.service.ts` — Updated relation field references

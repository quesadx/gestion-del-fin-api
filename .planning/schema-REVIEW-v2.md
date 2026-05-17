---
phase: schema-v2
reviewed: 2026-05-17T12:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - prisma/schema.prisma
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Schema Re-Review: Fix Verification Report

**Reviewed:** 2026-05-17T12:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Re-reviewed `prisma/schema.prisma` to verify 4 previously-requested fixes (CR-01, WR-06, WR-09, WR-10). Three of four fixes are correctly applied. One new issue found: a redundant index on `user_achievements` mirroring the same anti-pattern that was corrected in WR-10 but missed on this table.

---

## Fix Verification Results

### CR-01: ai_profession_id @relation to professions — ✅ VERIFIED

**File:** `prisma/schema.prisma:34,41`

The `ai_profession_id` field (line 34) has a corresponding `@relation` field `ai_profession` of type `professions?` on line 41, referencing `professions.id` with `onDelete: SetNull`.

```prisma
ai_profession_id        Int?
// ...
ai_profession           professions?  @relation(fields: [ai_profession_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

Additionally, an `@@index([ai_profession_id])` exists on line 45 for FK lookup performance. Fix correctly applied.

---

### WR-06: camp_transfer_item.persons onDelete Restrict — ✅ VERIFIED

**File:** `prisma/schema.prisma:57`

```prisma
persons  persons?  @relation(fields: [person_id], references: [id], onDelete: Restrict, onUpdate: Cascade)
```

`onDelete: Restrict` is set. Deleting a person referenced by a transfer item will now correctly prevent deletion rather than nullifying the FK. Fix correctly applied.

---

### WR-09: @@unique([user_id, achievement_id]) on user_achievements — ✅ VERIFIED

**File:** `prisma/schema.prisma:365`

```prisma
@@unique([user_id, achievement_id])
```

The composite unique constraint exists on `user_achievements`, preventing duplicate user-achievement pairs. Fix correctly applied.

---

### WR-10: Redundant Indexes Removed — ✅ VERIFIED

All 6 tables flagged in the original finding no longer have redundant indexes on the leading column of a composite PK/unique:

| Table | Composite PK/Unique | Remaining Index | Redundant? |
|---|---|---|---|
| `expedition_allocated_resources` | `@@id([expedition_id, resource_type_id])` | `@@index([resource_type_id])` | No (non-leading column) |
| `expedition_found_resources` | `@@id([expedition_id, resource_type_id])` | `@@index([resource_type_id])` | No (non-leading column) |
| `expedition_members` | `@@id([person_id, expedition_id])` | `@@index([expedition_id])` | No (non-leading column) |
| `inventory` | `@@unique([camp_id, resource_type_id])` | `@@index([resource_type_id])` | No (non-leading column) |
| `professions_resources_amounts` | `@@id([professions_id, resource_type_id])` | `@@index([resource_type_id])` | No (non-leading column) |
| `role_permissions` | `@@id([role_id, permission_id])` | `@@index([permission_id])` | No (non-leading column) |

Each remaining index is on the **non-leading** column of the composite constraint, which is not covered by the composite B-tree index's leftmost prefix. Fix correctly applied.

---

## New Issues Found

### WR-01 (NEW): Redundant @@index([user_id]) on user_achievements

**File:** `prisma/schema.prisma:367`

**Issue:** The `user_achievements` model has both a `@@unique([user_id, achievement_id])` constraint (line 365) and a separate `@@index([user_id])` (line 367). Since `user_id` is the **leading column** of the composite unique constraint, the unique index already covers queries filtering on `user_id` alone via leftmost prefix. The separate `@@index([user_id])` provides zero additional query optimization benefit — it is strictly redundant.

This is the exact same anti-pattern that WR-10 corrected on 6 other tables (`expedition_allocated_resources`, `expedition_found_resources`, `expedition_members`, `inventory`, `professions_resources_amounts`, `role_permissions`), but `user_achievements` was not included in the original scope.

```prisma
model user_achievements {
  // ...
  @@unique([user_id, achievement_id])   // ← already covers (user_id) queries
  @@index([achievement_id])             // ← needed: non-leading column
  @@index([user_id])                    // ← REDUNDANT: user_id is leading column of @@unique
}
```

**Fix:** Remove `@@index([user_id])` (line 367). The `@@index([achievement_id])` (line 366) should be retained since `achievement_id` is the non-leading column and is not covered by the unique constraint's index.

```prisma
model user_achievements {
  // ...
  @@unique([user_id, achievement_id])
  @@index([achievement_id])
  // @@index([user_id])  ← DELETE this redundant line
}
```

---

## Remaining Items (No Action Required)

The following schema patterns were reviewed and found acceptable:

- **`admission_requests.ai_profession` field name vs model `professions`**: The field name uses a descriptive prefix (`ai_profession`) rather than matching the model name (`professions`). While inconsistent with some relations in the same model (e.g., `camps camps`, `users users?`), `camp_transfers` already establishes precedent for descriptive field names via named relations (e.g., `approved_by_source_ref users?`). This is a stylistic variation, not a defect.

---

_Reviewed: 2026-05-17T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_

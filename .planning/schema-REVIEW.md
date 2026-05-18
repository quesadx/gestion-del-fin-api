---
phase: schema
reviewed: 2026-05-17T12:00:00Z
depth: deep
files_reviewed: 1
files_reviewed_list:
  - prisma/schema.prisma
findings:
  critical: 1
  warning: 9
  info: 3
  total: 13
status: issues_found
---

# Schema Review: Code Review Report

**Reviewed:** 2026-05-17T12:00:00Z
**Depth:** deep
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Deep review of `prisma/schema.prisma` (477 lines, 25 models, 11 enums). The schema is structurally sound with comprehensive index coverage, sensible FK defaults overall, and a well-scoped domain model. However, several concrete defects were found: one missing foreign key constraint (BLOCKER), multiple `onDelete: Restrict` choices that prevent legitimate user deletion, an ambiguous polymorphic cascade design, inconsistent naming conventions, redundant indexes, and a missing unique constraint on a junction table. The schema was likely generated via Prisma introspection from an existing database (indicated by migration warning comments on most models), which explains some of the irregularities.

---

## Critical Issues

### CR-01: Missing foreign key constraint on `admission_requests.ai_profession_id`

**File:** `prisma/schema.prisma:34`
**Issue:** `ai_profession_id Int?` is defined as a plain nullable integer field with **no `@relation` attribute** to the `professions` table. The field name uses the `_id` suffix convention indicating a foreign key reference, but no referential constraint exists in the database. This means:
- The database will accept any integer value, including IDs of non-existent professions
- No cascading behavior is defined (delete/update)
- Prisma will not automatically JOIN or validate this reference
- If application code uses this field to look up a profession, it can silently get null/wrong results

**Fix:** Add a proper FK relation to the `professions` table:

```prisma
// In admission_requests model:
ai_profession_id    Int?
ai_profession       professions? @relation(fields: [ai_profession_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

Also add `@@index([ai_profession_id])` and the back-relation on `professions`:
```prisma
// In professions model:
admission_requests admission_requests[]
```

---

## Warnings

### WR-01: Datasource provider mismatch (PostgreSQL vs documented MariaDB)

**File:** `prisma/schema.prisma:7`
**Issue:** The datasource declares `provider = "postgresql"` but `AGENTS.md` (line 23) and `.planning/PROJECT.md` document the database as "MariaDB + Prisma 7.8". Prisma's `postgresql` provider connects via the PostgreSQL wire protocol — it will NOT work against a MariaDB/MySQL server. Either the documentation is wrong or the schema has the wrong provider. If the actual database is MariaDB, the application will fail to connect at runtime.

**Fix:** Determine the actual database in use and correct whichever is wrong:
- If PostgreSQL is correct, update AGENTS.md to say "PostgreSQL"
- If MariaDB is correct, change line 7 to `provider = "mysql"` and review all `@db.*` annotations for MySQL compatibility (e.g., `@db.VarChar` is valid for both, but `@db.JsonB` → `@db.Json` for MySQL)

### WR-02: `persons` model name uses non-standard English plural

**File:** `prisma/schema.prisma:242`
**Issue:** The model is named `persons`, but the standard English plural of "person" is "people" (except in narrow legal/formal contexts). This makes the model name read unnaturally throughout the codebase — `prisma.persons.findMany()`, `req.persons`, etc. This is a broader naming issue: the project convention is inconsistent (some models use correct plurals: `camps`, `users`, `professions`, while others use idiosyncratic forms).

**Fix:** Rename model to `people` (and update all Prisma queries in the application code, plus the `person_status_log` FK references). While this is a broad refactor, doing it now is cheaper than after production data accumulates.

### WR-03: Ambiguous `persons.camp_transfers` relation field name

**File:** `prisma/schema.prisma:255`
**Issue:** The `persons` model declares `camp_transfers camp_transfers[]`, which implies "all transfers involving this person." However, this relation actually maps to `camp_transfers.leader_person_id` — it only returns transfers where this person is the **designated leader**, not all transfers that include this person as a transferred item (those are tracked via `camp_transfer_item.person_id`). This is misleading and will cause bugs when developers query `person.camp_transfers` expecting all transfers linked to that person.

**Fix:** Rename the relation field to clarify its meaning:

```prisma
// In persons model:
led_transfers camp_transfers[] @relation("transfer_leader")
```

And in `camp_transfers`:
```prisma
leader_person_ref persons? @relation("transfer_leader", fields: [leader_person_id], ...)
```

### WR-04: `contribution_overrides → users onDelete: Restrict` prevents user deletion

**File:** `prisma/schema.prisma:126`
**Issue:** `users users @relation(fields: [created_by], references: [id], onDelete: Restrict, onUpdate: Cascade)` — This prevents deleting any user who has created contribution overrides. In a zombie apocalypse scenario with potential user turnover, this creates a user management deadlock: users who created overrides can never be removed, even if they leave or are compromised. The contribution override should survive the user's deletion (for audit trail continuity).

**Fix:** Change `onDelete: Restrict` to `onDelete: SetNull`:

```prisma
users users @relation(fields: [created_by], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

### WR-05: `person_status_log → users onDelete: Restrict` prevents user deletion

**File:** `prisma/schema.prisma:234`
**Issue:** Same pattern as WR-04. `users users @relation(fields: [changed_by], references: [id], onDelete: Restrict, ...)` prevents deleting a user who has any status change log entries. This is a systemic pattern problem — three audit/log relations use `Restrict` where `SetNull` is more appropriate.

**Fix:** Change to `onDelete: SetNull`:

```prisma
users users @relation(fields: [changed_by], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

### WR-06: `camp_transfer_item.person_id onDelete: SetNull` creates inconsistent polymorphic state

**File:** `prisma/schema.prisma:55`
**Issue:** `persons persons? @relation(fields: [person_id], references: [id], onDelete: SetNull, ...)` — When a referenced person is deleted, `person_id` becomes NULL but `item_type` remains `PERSON`. This creates an invariant violation: a `camp_transfer_item` with `item_type = PERSON` but `person_id IS NULL` is semantically impossible — it's a transfer item of type PERSON that references nobody. Any code iterating transfer items must handle this inconsistent state.

**Fix:** Either:
- Change to `onDelete: Restrict` to prevent deleting persons referenced in transfer items (simplest, preserves data integrity), or
- Change to `onDelete: Cascade` to automatically remove the transfer item when the person is deleted (with the caveat that historical transfer records lose the entry).

```prisma
// Option A: Restrict (recommended)
persons persons? @relation(fields: [person_id], references: [id], onDelete: Restrict, onUpdate: Cascade)

// Option B: Cascade
persons persons? @relation(fields: [person_id], references: [id], onDelete: Cascade, onUpdate: Cascade)
```

### WR-07: No link from `admission_requests` to resulting `person` record

**File:** `prisma/schema.prisma:21-44`
**Issue:** When an admission request is approved (`final_decision = ACCEPTED`), the refugee data must be copied into the `persons` table to create a new survivor record. However, there is no FK field (e.g., `person_id Int?`) on `admission_requests` to link back to the resulting person record. This creates two problems:
1. **Audit gap:** After a refugee is admitted, there is no traceable link from the admission workflow to the resulting person record
2. **Data duplication risk:** Fields like `applicant_name`, `photo_url`, etc. are stored in both tables without synchronization

**Fix:** Add an optional FK reference back from `admission_requests` to `persons`:

```prisma
// In admission_requests:
person_id Int?
person    persons? @relation(fields: [person_id], references: [id], onDelete: SetNull, onUpdate: Cascade)

@@index([person_id])
```

### WR-08: `admission_requests.photo_url @db.VarChar(255)` too short and inconsistent with `persons`

**File:** `prisma/schema.prisma:29,251`
**Issue:** `admission_requests.photo_url` is `@db.VarChar(255)` while `persons.photo_url` is `@db.VarChar(500)`. URLs with CDN paths, query parameters, and signed tokens can easily exceed 255 characters. Furthermore, photo data flows from `admission_requests → persons` during admission, so the lengths should match. The current inconsistency means photo URLs valid for `persons` might not fit in `admission_requests`.

**Fix:** Increase `admission_requests.photo_url` to match `persons`:

```prisma
// Line 29, change:
photo_url   String? @db.VarChar(255)
// To:
photo_url   String? @db.VarChar(500)
```

Also consider the same issue with other URL fields (`achievements.icon_url @db.VarChar(500)` — adequate, but `id_card_url @db.VarChar(500)` and `persons.photo_url @db.VarChar(500)` are borderline for long CDN URLs).

### WR-09: Missing unique constraint on `user_achievements(user_id, achievement_id)`

**File:** `prisma/schema.prisma:360-370`
**Issue:** The `user_achievements` junction table has a surrogate auto-increment `id` as its primary key but **no `@@unique` constraint on `[user_id, achievement_id]`**. This means:
- A user can earn the same achievement multiple times (duplicate entries)
- There is no database-level enforcement that each achievement is earned at most once per user
- The application must manually check for duplicates, and race conditions can cause duplicate insertions

**Fix:** Add a unique constraint on the natural key:

```prisma
model user_achievements {
  id             Int          @id @default(autoincrement())
  user_id        Int
  achievement_id Int
  earned_at      DateTime     @default(now())
  achievements   achievements @relation(fields: [achievement_id], references: [id], onDelete: Cascade, onUpdate: Cascade)
  users          users        @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@unique([user_id, achievement_id])
  @@index([achievement_id])
  @@index([user_id])
}
```

If achievements are designed to be earned multiple times, this is intentional — but that should be documented since most achievement systems enforce uniqueness.

### WR-10: Redundant indexes on 6 models (composite PK/unique first-column indexes duplicated)

**File:** Multiple locations
**Issue:** In PostgreSQL, a composite index (via `@@id` or `@@unique`) on columns `(a, b)` can efficiently serve queries filtering on column `a` alone (leftmost prefix rule). The following models have standalone `@@index` on the first column of a composite index that are therefore redundant:

| Model | Composite key/unique | Redundant index |
|---|---|---|
| `expedition_allocated_resources` | `@@id([expedition_id, resource_type_id])` (line 140) | `@@index([expedition_id])` (line 141) |
| `expedition_found_resources` | `@@id([expedition_id, resource_type_id])` (line 152) | `@@index([expedition_id])` (line 153) |
| `expedition_members` | `@@id([person_id, expedition_id])` (line 163) | `@@index([person_id])` (line 165) |
| `inventory` | `@@unique([camp_id, resource_type_id])` (line 201) | `@@index([camp_id])` (line 202) |
| `professions_resources_amounts` | `@@id([professions_id, resource_type_id])` (line 303) | `@@index([professions_id])` (line 304) |
| `role_permissions` | `@@id([role_id, permission_id])` (line 348) | `@@index([role_id])` (line 350) |

Each redundant index wastes storage and slows down writes (INSERT/UPDATE/DELETE). Remove the redundant lines.

**Note:** `expedition_members.@@index([expedition_id])` (line 164) is **not** redundant because the PK is `@@id([person_id, expedition_id])` — queries filtering on `expedition_id` alone cannot use the leftmost prefix.

**Fix:** Remove each redundant `@@index` line listed above.

---

## Info

### IN-01: Inconsistent model naming convention (singular vs plural)

**File:** `prisma/schema.prisma` (throughout)
**Issue:** The schema mixes singular and plural model names without a consistent convention:

- **Plural:** `admission_requests`, `camp_transfers`, `camps`, `contribution_overrides`, `expeditions`, `inventory_log` (arguable), `persons`, `professions`, `roles`, `permissions`, `users`, `achievements`
- **Singular:** `camp_transfer_item` (should be `camp_transfer_items`), `expedition_allocated_resources` (plural but not consistent), `expedition_found_resources`, `inventory`, `person_status_log`, `profession_reassignment_log`, `resource_type`, `system_config`, `audit_log`

Prisma convention typically uses singular (e.g., `User`, `Camp`, `Person`) but this project uses plural for some models. Pick one convention and apply it consistently. Since this project is already predominantly plural-snake_case, convert the singular holdouts.

### IN-02: Dual storage of profession suggestion in `admission_requests`

**File:** `prisma/schema.prisma:33-34`
**Issue:** Two fields store overlapping profession data:
- `ai_suggested_profession String? @db.VarChar(80)` — raw AI output (profession name as text)
- `ai_profession_id Int?` — resolved FK to `professions` table

When `ai_profession_id` is set, `ai_suggested_profession` is derivable via the FK. This dual-storage pattern serves the AI workflow (AI outputs free text that might not match any known profession), which is a reasonable design. However, the redundancy should be explicitly documented to prevent maintenance confusion — a future developer might assume one field is unused and remove it.

### IN-03: Prisma introspection migration warnings on most models

**File:** `prisma/schema.prisma` (lines 10, 20, 46, 63, 95, 114, 168, 191, 206, 225, 241, 267, 285, 308, 325, 334, 353, 372)
**Issue:** 18 of the 25 models carry the comment: _"This model or at least one of its fields has comments in the database, and requires an additional setup for migrations"_ with a link to Prisma docs. This indicates these models were generated via `prisma db pull` (introspection) rather than defined in Prisma schema and applied via `prisma migrate`. This means:
- Database comments exist that Prisma cannot manage natively
- Future Prisma migrations may have issues with these models
- The schema might have quirks inherited from the original database design

These warnings should be addressed by either removing the database comments or configuring Prisma to handle them properly before relying on `prisma migrate` for schema changes.

---

_Reviewed: 2026-05-17T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: deep_

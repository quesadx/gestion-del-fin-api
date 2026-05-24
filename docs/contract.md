# API Contract — Gestión del Fin

**Base URL:** `http://localhost:3000/api`

All endpoints (except System and Auth login) require:
```
Authorization: Bearer <JWT>
```

Middleware chain for protected routes: `authMiddleware` → `sessionMiddleware` → `campMiddleware` → `permissionMiddleware`

**Error Responses** follow a uniform envelope:
```json
{ "error": { "message": "...", "statusCode": 400 } }
```

**Paginated Responses** wrap arrays in:
```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 50, "hasNextPage": true, "totalPages": 3 } }
```

---

## 1. System

**Base:** `/api/system` — Public, no auth.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/system/time` | Server time |

**`GET /system/time`** response:
```json
{ "now": "14:05:30", "iso": "2026-04-25T14:05:30.000Z", "today": "2026-04-25" }
```

---

## 2. Auth

**Base:** `/api/auth` — Public on login; authMiddleware on logout.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login — rate limited (5 req/15min) |
| `POST` | `/auth/logout` | Logout — invalidates session |

**`POST /auth/login`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `username` | string | ✓ | min 1, max 60 |
| `password` | string | ✓ | min 8, max 255 |

Response:
```json
{
  "user": { "username": "admin", "role": "system_admin" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**`POST /auth/logout`** — No body. Returns `{ "message": "Logged out" }`.

---

## 3. Camps

**Base:** `/api/camps`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/camps` | `camps.read` |
| `GET` | `/camps/:id` | `camps.read` |
| `POST` | `/camps` | `camps.create` |
| `PUT` | `/camps/:id` | `camps.update` |
| `DELETE` | `/camps/:id` | `camps.delete` |

**`POST /camps`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `name` | string | ✓ | min 1, max 100 |
| `location` | string | | max 100 |
| `status` | `"ACTIVE"` \| `"ABANDONED"` | | default `ACTIVE` |
| `ai_context_prompt` | string | | |

**`PUT /camps/:id`** — All fields partial, at least one required.

---

## 4. Resources

**Base:** `/api/resources`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/resources` | `resources.read` |
| `GET` | `/resources/:id` | `resources.read` |
| `POST` | `/resources` | `resources.create` |
| `PUT` | `/resources/:id` | `resources.update` |
| `DELETE` | `/resources/:id` | `resources.delete` |

**`POST /resources`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `name` | string | ✓ | min 1, max 80 |
| `unit` | string | ✓ | min 1, max 20 |
| `daily_ration` | number | ✓ | ≥ 0, max 999999.99 |
| `minimum_stock` | number | ✓ | ≥ 0, max 99999999.99 |
| `auto_daily` | boolean | | |

**`PUT /resources/:id`** — All fields partial.

---

## 5. People

**Base:** `/api/camps/:campId/people` (nested under camps router). Image upload available on POST/PUT via `multipart/form-data`.

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/camps/:campId/people` | `people.read` |
| `GET` | `/camps/:campId/people/:id` | `people.read` |
| `POST` | `/camps/:campId/people` | `people.create` |
| `PUT` | `/camps/:campId/people/:id` | `people.update` |
| `DELETE` | `/camps/:campId/people/:id` | `people.delete` |
| `POST` | `/camps/:campId/people/status-log` | `people.status_log` |
| `POST` | `/camps/:campId/people/profession-reassignments` | `people.reassign` |
| `POST` | `/camps/:campId/people/contribution-overrides` | `people.override` |

**`POST .../people`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `full_name` | string | ✓ | min 1, max 150 |
| `camp_id` | int | ✓ | positive |
| `profession_id` | int | ✓ | positive |
| `admitted_at` | ISO datetime | ✓ | |
| `status` | `"SICK"` \| `"HEALTHY"` \| `"INJURED"` \| `"AWAY"` \| `"DEAD"` | | |
| `age` | int | | 0–255 |
| `identification_code` | string | | max 20 |
| `blood_type` | string | | max 5 |
| `skills_summary` | string | | |
| `photo_url` | string (URL) | | max 500 |

**`PUT .../people/:id`** — All fields partial.

**`POST .../people/status-log`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `person_id` | int | ✓ | positive |
| `new_status` | `"SICK"` \| `"HEALTHY"` \| `"INJURED"` \| `"AWAY"` \| `"DEAD"` | ✓ | |
| `reason` | string | | |

**`POST .../people/profession-reassignments`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `person_id` | int | ✓ | positive |
| `from_profession_id` | int | ✓ | positive, ≠ `to_profession_id` |
| `to_profession_id` | int | ✓ | positive, ≠ `from_profession_id` |
| `reason` | string | | |
| `start_date` | ISO date (YYYY-MM-DD) | | end_date ≥ start_date |
| `end_date` | ISO date (YYYY-MM-DD) | | |

**`POST .../people/contribution-overrides`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `person_id` | int | ✓ | positive |
| `resource_type_id` | int | ✓ | positive |
| `reason` | string | ✓ | min 1, max 255 |
| `amount` | number | ✓ | ±999999.99 |
| `start_date` | ISO date | | end_date ≥ start_date |
| `end_date` | ISO date | | |

---

## 6. Inventory

**Base:** `/api/inventory`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/inventory/:campId` | `inventory.read` |
| `GET` | `/inventory/audit/:campId` | `inventory.audit` |
| `POST` | `/inventory/adjustment` | `inventory.adjust` |

**`POST /inventory/adjustment`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `camp_id` | int | ✓ | positive |
| `resource_type_id` | int | ✓ | positive |
| `type` | `"MANUAL_IN"` \| `"MANUAL_OUT"` | ✓ | |
| `quantity` | number | ✓ | > 0, max 9999999999.99 |
| `description` | string | | max 255 |

---

## 7. Admission

**Base:** `/api/admission` — Rate limited (10 req/15min) on POST. Image upload available.

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/admission/camps/:campId` | `admission.read` |
| `GET` | `/admission/:id` | `admission.read` |
| `POST` | `/admission/camps/:campId` | `admission.create` |
| `PATCH` | `/admission/:id/review` | `admission.review` |

**`POST /admission/camps/:campId`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `applicant_name` | string | ✓ | min 1, max 150 |
| `applicant_age` | int | | 0–255 |
| `applicant_skills` | string | | |
| `health_notes` | string | | |
| `background_notes` | string | | |
| `photo_url` | string (URL) | | max 255 |
| `id_card_url` | string (URL) | | max 500 |

**`PATCH /admission/:id/review`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `final_decision` | `"ACCEPTED"` \| `"REJECTED"` | ✓ | |
| `corrected_profession_id` | int | | positive |
| `correction_reason` | string | | max 255 |

---

## 8. Explorations

**Base:** `/api/expeditions`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/expeditions` | `expeditions.read` |
| `GET` | `/expeditions/:id` | `expeditions.read` |
| `POST` | `/expeditions` | `expeditions.create` |
| `PUT` | `/expeditions/:id` | `expeditions.update` |
| `PATCH` | `/expeditions/:id/status` | `expeditions.status` |
| `DELETE` | `/expeditions/:id` | `expeditions.delete` |

**`POST /expeditions`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `camp_id` | int | ✓ | positive |
| `created_by` | int | ✓ | positive |
| `destination` | string | ✓ | min 1, max 255 |
| `departure_date` | ISO date (YYYY-MM-DD) | ✓ | ≤ expected ≤ max |
| `expected_return_date` | ISO date (YYYY-MM-DD) | ✓ | |
| `max_return_date` | ISO date (YYYY-MM-DD) | ✓ | |
| `status` | `"PLANNED"` \| `"ONGOING"` \| `"RETURNED"` \| `"CANCELLED"` | | |
| `notes` | string | | |
| `members` | `[{ person_id: int }]` | | no duplicate person_ids |
| `allocated_resources` | `[{ resource_type_id: int, amount: number }]` | | no duplicate resource_type_ids |

**`PUT /expeditions/:id`** — Same fields partial (except `status`).

**`PATCH /expeditions/:id/status`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `status` | `"PLANNED"` \| `"ONGOING"` \| `"RETURNED"` \| `"CANCELLED"` | ✓ | |
| `actual_return_date` | ISO date | conditional | required if status = `RETURNED` |
| `changed_by` | int | ✓ | positive |
| `notes` | string | | |
| `resources_to_return` | `[{ resource_type_id: int, amount: number }]` | | |
| `members` | `[{ person_id: int }]` | | |
| `return_member_status` | `"SICK"` \| `"HEALTHY"` \| `"INJURED"` \| `"AWAY"` \| `"DEAD"` | | |

**`DELETE /expeditions/:id`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `changed_by` | int | ✓ | positive |
| `return_member_status` | `"SICK"` \| `"HEALTHY"` \| `"INJURED"` \| `"AWAY"` \| `"DEAD"` | | |

---

## 9. Transfers

**Base:** `/api/transfers`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/transfers` | `transfers.read` |
| `GET` | `/transfers/:id` | `transfers.read` |
| `POST` | `/transfers` | `transfers.create` |
| `PATCH` | `/transfers/:id/schedule` | `transfers.schedule` |
| `PATCH` | `/transfers/:id/approve-source` | `transfers.approve_source` |
| `PATCH` | `/transfers/:id/approve-target` | `transfers.approve_target` |
| `PATCH` | `/transfers/:id/complete` | `transfers.complete` |
| `PATCH` | `/transfers/:id/reject` | `transfers.reject` |

**`POST /transfers`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `requesting_camp` | int | ✓ | positive, ≠ `target_camp` |
| `target_camp` | int | ✓ | positive |
| `type` | `"RESOURCE"` \| `"PERSON"` \| `"MIXED"` | ✓ | must match item types |
| `requested_by` | int | ✓ | positive |
| `notes` | string | | |
| `leader_person_id` | int | | positive |
| `scheduled_delivery_date` | ISO datetime | | |
| `items` | `TransferItem[]` | ✓ | min 1, no duplicate ids |

**`TransferItem`** (per element in `items` array):

| Field | Type | Required (RESOURCE) | Required (PERSON) | Constraints |
|-------|------|:---:|:---:|-------------|
| `item_type` | `"RESOURCE"` \| `"PERSON"` | ✓ | ✓ | |
| `resource_type_id` | int | ✓ | ✗ (must not be present) | positive |
| `person_id` | int | ✗ (must not be present) | ✓ | positive |
| `quantity` | number | ✓ | ✗ (must not be present) | > 0 |

**`PATCH /transfers/:id/schedule`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `scheduled_delivery_date` | ISO datetime | ✓ | |

**`PATCH /transfers/:id/approve-source`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `notes` | string | | |
| `scheduled_delivery_date` | ISO datetime | | |

**`PATCH /transfers/:id/approve-target`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `notes` | string | | |

**`PATCH /transfers/:id/complete`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `notes` | string | | |
| `person_status` | `"SICK"` \| `"HEALTHY"` \| `"INJURED"` \| `"AWAY"` \| `"DEAD"` | | |

**`PATCH /transfers/:id/reject`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `reason` | string | ✓ | min 1, max 500 |

---

## 10. Users

**Base:** `/api/users`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/users` | `users.read` |
| `GET` | `/users/:id` | `users.read` |
| `POST` | `/users` | `users.create` |
| `PUT` | `/users/:id` | `users.update` |
| `DELETE` | `/users/:id` | `users.delete` |

**`POST /users`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `username` | string | ✓ | min 1, max 60 |
| `password` | string | ✓ | min 8, max 255 |
| `camp_id` | int | ✓ | positive |
| `role_id` | int | ✓ | positive |
| `is_active` | boolean | | |
| `last_activity` | ISO datetime | | |
| `created_at` | ISO datetime | | |

**`PUT /users/:id`** — All fields partial.

---

## 11. Professions

**Base:** `/api/professions`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/professions` | `professions.read` |
| `GET` | `/professions/:id` | `professions.read` |
| `POST` | `/professions` | `professions.create` |
| `PUT` | `/professions/:id` | `professions.update` |
| `DELETE` | `/professions/:id` | `professions.delete` |

**`POST /professions`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `name` | string | ✓ | min 1, max 80 |
| `description` | string | | |

**`PUT /professions/:id`** — All fields partial.

---

## 12. Roles

**Base:** `/api/roles`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/roles` | `roles.read` |
| `GET` | `/roles/:id` | `roles.read` |
| `POST` | `/roles` | `roles.create` |
| `PUT` | `/roles/:id` | `roles.update` |
| `DELETE` | `/roles/:id` | `roles.delete` |

**`POST /roles`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `name` | string | ✓ | min 1, max 60, regex `/^[a-z_]+$/` |
| `description` | string | | max 255 |
| `permission_ids` | int[] | | positive integers |

**`PUT /roles/:id`** — All fields partial, at least one required.

---

## 13. Permissions

**Base:** `/api/permissions`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/permissions` | `permissions.read` |
| `GET` | `/permissions/:id` | `permissions.read` |
| `POST` | `/permissions` | `permissions.create` |
| `PUT` | `/permissions/:id` | `permissions.update` |
| `DELETE` | `/permissions/:id` | `permissions.delete` |

**`POST /permissions`** request body:

| Field | Type | Required | Constraints |
|-------|------|:--------:|-------------|
| `name` | string | ✓ | min 3, max 80, regex `/^[a-z]+(?:\.[a-z_]+)+$/` |
| `description` | string | | max 255 |

**`PUT /permissions/:id`** — All fields partial.

---

## 14. Metrics

**Base:** `/api/metrics`

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/metrics/dashboard` | `metrics.dashboard` |
| `GET` | `/metrics/resources` | `metrics.resources` |
| `GET` | `/metrics/people` | `metrics.people` |
| `GET` | `/metrics/expeditions` | `metrics.expeditions` |

No request body or query params — pure GET, camp-scoped aggregation endpoints.

---

## HTTP Status Code Reference

| Code | Meaning |
|:----:|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation failure / FK constraint |
| 401 | Missing or invalid JWT |
| 401 | Session timeout (20 min inactivity) |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Unique constraint violation (e.g., duplicate name) |
| 500 | Internal server error |

## Common Query Parameters

Used on all `GET` list endpoints:

| Param | Type | Default | Description |
|-------|------|:-------:|-------------|
| `page` | int | 1 | Page number (positive) |
| `pageSize` | int | 20 | Items per page (positive) |

## Person Status Enum

Used in People, Transfers, Expeditions:

| Value | Description |
|-------|-------------|
| `SICK` | Sick/ill |
| `HEALTHY` | Healthy |
| `INJURED` | Injured |
| `AWAY` | Away from camp |
| `DEAD` | Deceased |

## Transfer Types

| Value | Description |
|-------|-------------|
| `RESOURCE` | Only resource items |
| `PERSON` | Person items + resource items for rations |
| `MIXED` | Both RESOURCE and PERSON items |

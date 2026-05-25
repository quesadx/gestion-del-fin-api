# Gestión del Fin API — Contract (2026-05-24)

> **Audience**: Frontend developers & AI coding agents.  
> **Accuracy note**: Every response shape here is traced from the actual Prisma `select`/`include` in each service file, NOT copied from OpenAPI.  
> **Source commit**: Generated from live source code at `src/modules/*/`.

---

## 1. Global Info

### Base URL
```
http://localhost:3000
```

### Auth mechanism
**Bearer JWT** — every protected endpoint requires `Authorization: Bearer <token>`.

### Token format (decoded payload)
```json
{
  "sub": "<userId>",
  "campId": 1,
  "role": "system_admin",
  "sessionVersion": 1,
  "isAdmin": true,
  "iat": 1680000000,
  "exp": 1680086400
}
```

### Rate limiting
| Scope          | Window      | Max requests | Skipped in test? |
|----------------|-------------|-------------|-------------------|
| Global         | 15 min      | 200         | Yes               |
| Login          | 15 min      | 5 (production) | Yes           |
| Admission POST | 1 min       | 10          | Yes               |

### Session timeout
**20 minutes of inactivity**. On each request, `last_activity` is bumped. If 20+ min since last activity, the session is killed and returns **401**. Session is also killed if `session_version` in token doesn't match DB (e.g., after logout or deactivation).

### Error response format
```json
{
  "error": {
    "message": "<human-readable error>",
    "statusCode": 400,
    "details": null
  }
}
```
- For validation errors (400), `details` contains Zod issue array.
- For Prisma errors, `details` contains Prisma `.meta`.

### Pagination format
Every paginated list endpoint returns:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "hasNextPage": true,
    "totalPages": 3
  }
}
```
Query params: `?page=1&pageSize=20`. `pageSize` defaults to 20, max 100.

### Multipart coercion (`validate` middleware)
In `multipart/form-data` requests, **all** string values matching `/^-?\d+$/` are auto-coerced to `Number.parseInt`, float-like strings to `Number.parseFloat`, and `"true"`/`"false"` to `boolean`. This means you can send `"1"` and it becomes `1` when Zod parses it.

### Media URLs (Cloudinary signed URLs)
Fields named `photo_url` or `id_card_url` in responses are **replace with time-limited signed Cloudinary URLs** (default 600s TTL) wherever `signMediaUrls()` is called in the controller.

**Which endpoints sign:**
- `GET /api/camps/:campId/people` — YES (but POST does NOT)
- `GET /api/camps/:campId/people/:id` — YES
- `PUT /api/camps/:campId/people/:id` — YES
- `POST /api/camps/:campId/people` — **NO** (returns raw URL)
- `POST /api/admission/camps/:campId` — YES
- `GET /api/admission/camps/:campId` — YES
- `GET /api/admission/:id` — YES
- `PATCH /api/admission/:id/review` — YES

### HTTP status codes summary
| Code | Meaning                                      |
|------|----------------------------------------------|
| 200  | Success (GET, PUT, PATCH)                   |
| 201  | Created (POST)                               |
| 204  | Deleted (DELETE) — no body                   |
| 400  | Validation error, bad request, or FK violation |
| 401  | Unauthorized (no/invalid token, session expired) |
| 403  | Forbidden (insufficient permissions)         |
| 404  | Resource not found                           |
| 409  | Unique constraint violation (duplicate name) |
| 429  | Rate limited                                 |
| 500  | Internal server error                        |

---

## 2. All Enums

### `persons_status` (person status)
```
SICK, HEALTHY, INJURED, AWAY, DEAD
```

### `camps_status` (camp status)
```
ACTIVE, ABANDONED
```

### `admission_requests_ai_decision` (DB enum — AI output)
```
ACCEPTED, PENDING, REJECTED
```
> **Note**: The Zod `aiDecisionEnum` only allows `ACCEPTED` and `REJECTED` (the AI evaluator returns only these two). But the DB column and Prisma include `PENDING` as a default.

### `admission_requests_final_decision` (human reviewer)
```
ACCEPTED, REJECTED, PENDING
```
> **Note**: The Zod `finalDecisionEnum` (review endpoint) only allows `ACCEPTED` and `REJECTED`. `PENDING` is the initial DB default.

### `expeditions_status` (expedition status)
```
PLANNED, ONGOING, RETURNED, CANCELLED
```

### `camp_transfers_status` (transfer status)
```
PENDING, APPROVED_SOURCE, APPROVED_TARGET, COMPLETED, REJECTED
```

### `camp_transfers_type` (transfer type)
```
RESOURCE, PERSON, MIXED
```

### `camp_transfer_item_item_type` (transfer item type)
```
RESOURCE, PERSON
```

### `inventory_log_log_type` (inventory log type)
```
DAILY_GAIN, DAILY_RATION, MANUAL_IN, MANUAL_OUT, EXPEDITION_OUT, EXPEDITION_IN, TRANSFER_OUT, TRANSFER_IN
```

### `audit_log_action` (audit)
```
LOGIN, LOGOUT, CREATE_CAMP, UPDATE_CAMP, DELETE_CAMP,
CREATE_USER, UPDATE_USER, DELETE_USER,
CREATE_PERSON, UPDATE_PERSON, DELETE_PERSON, CHANGE_PERSON_STATUS, REASSIGN_PROFESSION, CREATE_OVERRIDE,
CREATE_ADMISSION, REVIEW_ADMISSION, OVERRIDE_ADMISSION,
CREATE_EXPEDITION, UPDATE_EXPEDITION_STATUS, CANCEL_EXPEDITION,
CREATE_TRANSFER, APPROVE_TRANSFER_SOURCE, APPROVE_TRANSFER_TARGET, COMPLETE_TRANSFER, REJECT_TRANSFER,
MANUAL_INVENTORY_ADJUST
```

### `audit_log_target_type` (audit target types)
```
users, camps, camp_transfers, admission_requests, expeditions, people, inventory_logs
```

### Hard-coded role names (source: `ROLES` constant)
```
system_admin, worker, resource_manager, travel_coordinator
```

### Built-in permission names (source: `PERMISSIONS` constant)
```
camps.create, camps.read, camps.update, camps.delete
people.create, people.read, people.update, people.delete
people.status_log.create, people.profession_reassign.create, people.contribution_override.create
resources.create, resources.read, resources.update, resources.delete
professions.create, professions.read, professions.update, professions.delete
users.create, users.read, users.update, users.delete
inventory.read, inventory.audit.read, inventory.adjust
admission.create, admission.read, admission.review
transfers.create, transfers.read, transfers.schedule
transfers.approve_source, transfers.approve_target, transfers.complete, transfers.reject
expeditions.create, expeditions.read, expeditions.update, expeditions.update_status, expeditions.delete
metrics.dashboard, metrics.resources, metrics.people, metrics.expeditions
roles.create, roles.read, roles.update, roles.delete
permissions.create, permissions.read, permissions.update, permissions.delete
admin.bypass_camp_scoping
```

### Metrics resource status (computed)
```
OK, LOW, CRITICAL, OVERSTOCKED
```
- LOW: quantity < minimum_stock
- CRITICAL: quantity < minimum_stock * 0.5
- OVERSTOCKED: quantity > minimum_stock * 3
- OK: otherwise

---

## 3. Module-by-Module Endpoint Reference

---

### 3.1 System

#### `GET /`
- **Auth**: none
- **Description**: Health check
- **Response 200**:
```json
{ "message": "gestion-del-fin-api is alive and kicking!" }
```

#### `GET /api/system/time`
- **Auth**: none
- **Description**: Server time snapshot for client clock sync
- **Response 200**:
```json
{
  "now": "14:05:30",
  "iso": "2026-05-24T14:05:30.000Z",
  "today": "2026-05-24"
}
```

---

### 3.2 Auth

#### `POST /api/auth/login`
- **Auth**: none
- **Rate limit**: 5 attempts / 15 minutes (production), 100/min in test
- **Description**: Authenticate and get JWT token
- **Request body** (JSON):
```json
{
  "username": "admin",            // string, 1-60 chars, trimmed
  "password": "my-secure-password" // string, 8-255 chars
}
```
- **Response 200**:
```json
{
  "user": {
    "username": "admin",
    "role": "system_admin",
    "permissions": [
      "camps.read",
      "roles.read"
    ]
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```
- **Errors**: 400 (validation), 401 (invalid credentials or inactive), 429 (rate limit)

#### `POST /api/auth/logout`
- **Auth**: required (but no session check — only `authMiddleware`)
- **Description**: Invalidates session by incrementing `session_version` and clearing `last_activity`
- **Response 200**:
```json
{ "message": "Logged out successfully" }
```
- **Errors**: 401 (no token)

---

### 3.3 Camps

> **Note**: Camps routes also mount people sub-routes at `/:campId/people`.

#### `POST /api/camps`
- **Auth**: required (auth + session + camp)
- **Permission**: `camps.create`
- **Description**: Create a new camp
- **Request body** (JSON):
```json
{
  "name": "Alpha Base",                    // string, 1-100 chars, required
  "location": "Downtown Shelter",          // string, max 100 chars, optional
  "status": "ACTIVE",                      // "ACTIVE" | "ABANDONED", optional, default ACTIVE
  "ai_context_prompt": "This camp..."      // string, optional
}
```
- **Response 201** (exact Prisma output — `create()` with no select):
```json
{
  "id": 1,
  "name": "Alpha Base",
  "location": "Downtown Shelter",
  "status": "ACTIVE",
  "ai_context_prompt": "This camp prioritizes...",
  "created_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null
}
```
- **Errors**: 400, 401, 403, 409 (duplicate name)

#### `GET /api/camps`
- **Auth**: required
- **Permission**: `camps.read`
- **Description**: Paginated list of all camps
- **Query**: `?page=1&pageSize=20`
- **Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Alpha Base",
      "location": "Downtown Shelter",
      "status": "ACTIVE",
      "ai_context_prompt": "...",
      "created_at": "2026-05-24T14:05:30.000Z",
      "updated_at": "2026-05-24T14:05:30.000Z",
      "deleted_at": null
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 50, "hasNextPage": true, "totalPages": 3 }
}
```
- **Errors**: 401, 403

#### `GET /api/camps/:id`
- **Auth**: required
- **Permission**: `camps.read`
- **Path params**: `id` (integer, positive)
- **Response 200**: Single camp object (same shape as above)
- **Errors**: 401, 403, 404

#### `PUT /api/camps/:id`
- **Auth**: required
- **Permission**: `camps.update`
- **Path params**: `id` (integer, positive)
- **Request body** (JSON, at least one field required):
```json
{
  "name": "Alpha Base",
  "location": "Downtown Shelter",
  "status": "ACTIVE",
  "ai_context_prompt": "..."
}
```
- **Response 200**: Updated camp object
- **Errors**: 400, 401, 403, 404, 409 (duplicate name)

#### `DELETE /api/camps/:id`
- **Auth**: required
- **Permission**: `camps.delete`
- **Path params**: `id` (integer, positive)
- **Response**: 204 No Content
- **Errors**: 400 (FK violation — camp has associated records), 401, 403, 404

---

### 3.4 People

> **Mount point**: `/api/camps/:campId/people` (sub-routed under camps)

#### `POST /api/camps/:campId/people`
- **Auth**: required
- **Permission**: `people.create`
- **Content-Type**: `multipart/form-data` (supports `photo` file upload)
- **Path params**: `campId` (integer, positive)
- **Description**: Create a person. `camp_id` in body MUST match URL `campId`. Photo upload is handled by image-upload middleware — uploaded file URL is placed into `photo_url`.
- **Request body** (multipart/form-data, numeric strings are auto-coerced):
```
full_name        (string, 1-150 chars, required)
camp_id          (integer, positive, required — MUST match URL campId)
profession_id    (integer, positive, required)
admitted_at      (ISO datetime string, required)
status           (enum persons_status, optional, default HEALTHY)
age              (integer, 0-255, optional)
identification_code (string, max 20 chars, optional — auto-generated if omitted)
blood_type       (string, max 5 chars, optional)
skills_summary   (string, optional)
photo            (binary file, optional — uploaded to Cloudinary, URL placed in photo_url)
photo_url        (string URL, max 500 chars, optional — direct URL alternative to file upload)
```
- **Response 201** (NO media URL signing — raw URLs returned):
```json
{
  "id": 1,
  "camp_id": 1,
  "profession_id": 2,
  "identification_code": "MED-001",
  "full_name": "John Doe",
  "age": 32,
  "blood_type": "O+",
  "skills_summary": "Medical training",
  "photo_url": "https://res.cloudinary.com/...",
  "status": "HEALTHY",
  "admitted_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null,
  "camps": {
    "id": 1,
    "name": "Alpha Base",
    "location": "Downtown Shelter",
    "status": "ACTIVE",
    "ai_context_prompt": "...",
    "created_at": "2026-05-24T14:05:30.000Z",
    "updated_at": "2026-05-24T14:05:30.000Z",
    "deleted_at": null
  },
  "professions": {
    "id": 2,
    "name": "Medic",
    "description": "Medical personnel",
    "created_at": "2026-05-24T14:05:30.000Z",
    "updated_at": "2026-05-24T14:05:30.000Z",
    "deleted_at": null
  },
  "admission_requests": [],
  "camp_transfer_items": [],
  "led_transfers": [],
  "contribution_overrides": [
    {
      "id": 1,
      "person_id": 1,
      "resource_type_id": 1,
      "reason": "Medical exemption",
      "start_date": "2026-05-24T00:00:00.000Z",
      "end_date": null,
      "created_by": 1,
      "amount": "0.30",
      "created_at": "...",
      "updated_at": "...",
      "deleted_at": null,
      "resource_type": { "id": 1, "name": "Canned Food", "unit": "kg", ... },
      "users": { "id": 1, "username": "admin", ... }
    }
  ],
  "expedition_members": [],
  "person_status_logs": [
    {
      "id": 1,
      "person_id": 1,
      "old_status": "HEALTHY",
      "new_status": "SICK",
      "reason": "...",
      "changed_by": 1,
      "changed_at": "...",
      "users": { "id": 1, "username": "admin" }
    }
  ],
  "profession_reassignment_logs": [
    {
      "id": 1,
      "person_id": 1,
      "from_profession_id": 2,
      "to_profession_id": 3,
      "reason": "...",
      "start_date": "...",
      "end_date": null,
      "created_at": "...",
      "updated_at": "...",
      "from_profession": { "id": 2, "name": "Medic", ... },
      "to_profession": { "id": 3, "name": "Scout", ... }
    }
  ]
}
```
- **Errors**: 400, 401, 403, 404 (camp/profession not found), 409 (duplicate identification_code)

#### `GET /api/camps/:campId/people`
- **Auth**: required
- **Permission**: `people.read`
- **Path params**: `campId` (integer, positive)
- **Query**: `?page=1&pageSize=20`
- **Description**: Paginated list of people in camp
- **Response 200**: Paginated response with same person shape as POST (but `photo_url` and nested `id_card_url` fields are SIGNED)
- **Errors**: 401, 403

#### `GET /api/camps/:campId/people/:id`
- **Auth**: required
- **Permission**: `people.read`
- **Path params**: `campId`, `id` (both integer, positive)
- **Response 200**: Single person (same shape, media URLs SIGNED)
- **Errors**: 401, 403, 404, 409 (person doesn't belong to camp)

#### `PUT /api/camps/:campId/people/:id`
- **Auth**: required
- **Permission**: `people.update`
- **Content-Type**: `multipart/form-data`
- **Path params**: `campId`, `id`
- **Request body**: All fields optional (`createPersonSchema.partial()`). If `status` is provided and differs from current, a `person_status_logs` entry is auto-created.
- **Response 200**: Updated person (same shape, media URLs SIGNED). Returns full include (camps, professions, logs, etc.)
- **Errors**: 400, 401, 403, 404, 409

#### `DELETE /api/camps/:campId/people/:id`
- **Auth**: required
- **Permission**: `people.delete`
- **Path params**: `campId`, `id`
- **Response**: 204 No Content
- **Errors**: 400 (FK violation), 401, 403, 404

#### `POST /api/camps/:campId/people/status-log`
- **Auth**: required
- **Permission**: `people.status_log.create`
- **Path params**: `campId`
- **Request body** (JSON):
```json
{
  "person_id": 1,        // integer, positive, required
  "new_status": "INJURED", // persons_status enum, required
  "reason": "Wounded..."  // string, optional
}
```
- **Response 201**:
```json
{
  "id": 1,
  "person_id": 1,
  "old_status": "HEALTHY",
  "new_status": "INJURED",
  "reason": "Wounded...",
  "changed_by": 1,
  "changed_at": "2026-05-24T14:05:30.000Z",
  "persons": {
    "id": 1,
    "full_name": "John Doe",
    "status": "INJURED"
  },
  "users": {
    "id": 1,
    "username": "admin"
  }
}
```
- **Errors**: 400, 401, 403, 404, 409

#### `POST /api/camps/:campId/people/profession-reassignments`
- **Auth**: required
- **Permission**: `people.profession_reassign.create`
- **Path params**: `campId`
- **Request body** (JSON):
```json
{
  "person_id": 1,                  // integer, positive, required
  "from_profession_id": 2,         // integer, positive, required
  "to_profession_id": 3,           // integer, positive, required (must differ from from_profession_id)
  "reason": "Combat skills...",    // string, optional
  "start_date": "2026-05-24",      // ISO date YYYY-MM-DD, optional
  "end_date": "2026-06-24"         // ISO date YYYY-MM-DD, optional
}
```
- **Response 201**:
```json
{
  "id": 1,
  "person_id": 1,
  "from_profession_id": 2,
  "to_profession_id": 3,
  "reason": "Combat skills...",
  "start_date": "2026-05-24T00:00:00.000Z",
  "end_date": null,
  "created_at": "...",
  "updated_at": "...",
  "persons": {
    "id": 1,
    "full_name": "John Doe",
    "profession_id": 3
  },
  "from_profession": {
    "id": 2,
    "name": "Medic"
  },
  "to_profession": {
    "id": 3,
    "name": "Scout"
  },
  "target_profession_had_no_active_people": false
}
```
- **Errors**: 400, 401, 403, 404, 409 (person has active reassignment)

#### `POST /api/camps/:campId/people/contribution-overrides`
- **Auth**: required
- **Permission**: `people.contribution_override.create`
- **Path params**: `campId`
- **Request body** (JSON):
```json
{
  "person_id": 1,                     // integer, positive, required
  "resource_type_id": 1,              // integer, positive, required
  "reason": "Medical exemption",      // string, 1-255 chars, required
  "amount": 0.3,                      // number, -9999999999.99 to 9999999999.99, required
  "start_date": "2026-05-24",         // ISO date, optional
  "end_date": "2026-06-24"            // ISO date, optional
}
```
- **Response 201**:
```json
{
  "id": 1,
  "person_id": 1,
  "resource_type_id": 1,
  "reason": "Medical exemption",
  "start_date": "2026-05-24T00:00:00.000Z",
  "end_date": null,
  "created_by": 1,
  "amount": "0.30",
  "created_at": "...",
  "updated_at": "...",
  "deleted_at": null,
  "persons": {
    "id": 1,
    "full_name": "John Doe"
  },
  "resource_type": {
    "id": 1,
    "name": "Canned Food",
    "unit": "kg"
  },
  "users": {
    "id": 1,
    "username": "admin"
  }
}
```
- **Errors**: 400, 401, 403, 404

---

### 3.5 Resources

#### `POST /api/resources`
- **Auth**: required
- **Permission**: `resources.create`
- **Description**: Create a new resource type
- **Request body** (JSON):
```json
{
  "name": "Canned Food",     // string, 1-80 chars, required
  "unit": "kg",              // string, 1-20 chars, required
  "daily_ration": 0.5,       // number, 0 to 999999.99, required
  "minimum_stock": 100,      // number, 0 to 99999999.99, required
  "auto_daily": false        // boolean, optional, default false
}
```
- **Response 201** (full resource_types row):
```json
{
  "id": 1,
  "name": "Canned Food",
  "unit": "kg",
  "daily_ration": "0.50",
  "minimum_stock": "100.00",
  "auto_daily": false,
  "created_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null
}
```
> **NOTE**: `daily_ration` and `minimum_stock` are `Decimal` values — returned as **strings** from Prisma.
- **Errors**: 400, 401, 403, 409 (duplicate name)

#### `GET /api/resources`
- **Auth**: required
- **Permission**: `resources.read`
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list of resource_type objects (same shape as POST)
- **Errors**: 401, 403

#### `GET /api/resources/:id`
- **Auth**: required
- **Permission**: `resources.read`
- **Response 200**: Single resource_type
- **Errors**: 401, 403, 404

#### `PUT /api/resources/:id`
- **Auth**: required
- **Permission**: `resources.update`
- **Request body** (all fields optional):
```json
{
  "name": "Canned Food",
  "unit": "kg",
  "daily_ration": 0.5,
  "minimum_stock": 100,
  "auto_daily": false
}
```
- **Response 200**: Updated resource_type
- **Errors**: 400, 401, 403, 404, 409

#### `DELETE /api/resources/:id`
- **Auth**: required
- **Permission**: `resources.delete`
- **Response**: 204 No Content
- **Errors**: 400 (FK violation), 401, 403, 404

---

### 3.6 Inventory

> **Mount point**: `/api/inventory`

#### `GET /api/inventory/:campId`
- **Auth**: required
- **Permission**: `inventory.read`
- **Path params**: `campId` (integer, positive)
- **Query**: `?page=1&pageSize=20`
- **Description**: Current inventory levels for a camp. **NOTE**: Response shape is CUSTOM (not `InventoryItem` from OpenAPI).
- **Response 200**:
```json
{
  "data": [
    {
      "resource_type_id": 1,
      "resource_name": "Canned Food",
      "unit": "kg",
      "quantity": 500.0,
      "minimum_stock": 100.0,
      "is_below_minimum": false,
      "created_at": "2026-05-24T14:05:30.000Z",
      "deleted_at": null,
      "resource_type": {
        "id": 1,
        "name": "Canned Food",
        "unit": "kg",
        "minimum_stock": 100.0,
        "created_at": "2026-05-24T14:05:30.000Z",
        "updated_at": "2026-05-24T14:05:30.000Z",
        "deleted_at": null
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 5, "hasNextPage": false, "totalPages": 1 }
}
```
> **NOTE**: `quantity`, `minimum_stock` are **numbers** (converted from Decimal). Values sorted alphabetically by resource_name.

#### `GET /api/inventory/audit/:campId`
- **Auth**: required
- **Permission**: `inventory.audit.read`
- **Path params**: `campId` (integer, positive)
- **Query**: `?page=1&pageSize=20`
- **Description**: Inventory audit — cross-validates snapshot vs log deltas per resource type. Paginated.
- **Response 200** (NOTE: extra top-level field `has_inconsistencies`):
```json
{
  "data": [
    {
      "resource_type_id": 1,
      "resource_name": "Canned Food",
      "unit": "kg",
      "inventory_quantity": 500.0,
      "log_delta_sum": 500.0,
      "is_consistent": true,
      "discrepancy": 0.0
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 5, "hasNextPage": false, "totalPages": 1 },
  "has_inconsistencies": false
}
```
> **NOTE**: This response has `has_inconsistencies` at the top level alongside `data` and `pagination`.

#### `POST /api/inventory/adjustment`
- **Auth**: required
- **Permission**: `inventory.adjust`
- **Description**: Manual inventory adjustment. Non-admin users can only adjust their own camp.
- **Request body** (JSON):
```json
{
  "camp_id": 1,                  // integer, positive, required
  "resource_type_id": 1,         // integer, positive, required
  "type": "MANUAL_IN",           // "MANUAL_IN" | "MANUAL_OUT", required
  "quantity": 50,                // number, > 0, max 9999999999.99, required
  "description": "Donation..."   // string, max 255, optional
}
```
- **Response 201** (NOTE: CUSTOM shape, NOT flat log):
```json
{
  "movement": {
    "id": 1,
    "camp_id": 1,
    "resource_type_id": 1,
    "logged_by": 1,
    "log_type": "MANUAL_IN",
    "quantity_change": 50.0,
    "logged_at": "2026-05-24T14:05:30.000Z",
    "created_at": "2026-05-24T14:05:30.000Z",
    "description": "Donation..."
  },
  "inventory": {
    "camp_id": 1,
    "resource_type_id": 1,
    "quantity": 550.0,
    "last_updated": "2026-05-24T14:05:30.000Z",
    "created_at": "2026-05-24T14:05:30.000Z",
    "deleted_at": null
  }
}
```
> **NOTE**: Response is `{ movement: {...}, inventory: {...} }`, NOT a single flat object.
- **Errors**: 400 (insufficient stock for MANUAL_OUT), 401, 403, 404

---

### 3.7 Admission

> **Mount point**: `/api/admission`

#### `POST /api/admission/camps/:campId`
- **Auth**: required
- **Permission**: `admission.create`
- **Rate limit**: 10 per minute
- **Content-Type**: `multipart/form-data` (supports `photo` and `id_card` file uploads)
- **Path params**: `campId` (integer, positive)
- **Description**: Create admission request. Triggers AI evaluation (Groq). The AI returns a decision (`ai_decision`), reasoning, confidence score, suggested profession, and profession ID.
- **Request body** (multipart/form-data):
```
applicant_name     (string, 1-150 chars, required)
applicant_age      (integer, 0-255, optional)
applicant_skills   (string, optional)
health_notes       (string, optional)
background_notes   (string, optional)
photo              (binary file, optional → photo_url)
id_card            (binary file, optional → id_card_url)
photo_url          (string URL, max 500, optional)
id_card_url        (string URL, max 500, optional)
```
- **Response 201** (media URLs SIGNED):
```json
{
  "id": 1,
  "camp_id": 1,
  "applicant_name": "Jane Smith",
  "applicant_age": 28,
  "applicant_skills": "Medical training",
  "health_notes": "Minor injury",
  "background_notes": "Former medic",
  "photo_url": "https://res.cloudinary.com/...?signature=...",
  "id_card_url": "https://res.cloudinary.com/...?signature=...",
  "ai_decision": "ACCEPTED",
  "ai_reasoning": "Step-by-step...",
  "ai_confidence": 0.92,
  "ai_suggested_profession": "Medic",
  "ai_profession_id": 2,
  "corrected_profession_id": null,
  "correction_reason": null,
  "person_id": null,
  "reviewed_by": null,
  "final_decision": "PENDING",
  "reviewed_at": null,
  "updated_at": "2026-05-24T14:05:30.000Z",
  "created_at": "2026-05-24T14:05:30.000Z"
}
```
> **NOTE**: The DB column `ai_decision` can be `PENDING` (default), but the AI evaluator only returns `ACCEPTED` or `REJECTED`. If AI errors, the fallback is `PENDING`.
- **Errors**: 400, 401, 403, 429

#### `GET /api/admission/camps/:campId`
- **Auth**: required
- **Permission**: `admission.read`
- **Path params**: `campId` (integer, positive)
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list, same shape as POST (media URLs SIGNED), ordered by `created_at` DESC
- **Errors**: 401, 403

#### `GET /api/admission/:id`
- **Auth**: required
- **Permission**: `admission.read`
- **Response 200**: Single admission (media URLs SIGNED)
- **Errors**: 401, 403, 404

#### `PATCH /api/admission/:id/review`
- **Auth**: required
- **Permission**: `admission.review`
- **Description**: Human reviews AI decision. If ACCEPTED, a Person is auto-created and linked via `person_id`.
- **Request body** (JSON):
```json
{
  "final_decision": "ACCEPTED",        // "ACCEPTED" | "REJECTED", required
  "corrected_profession_id": 2,        // integer, positive, optional — override AI profession
  "correction_reason": "Better match"  // string, max 255, optional
}
```
> **NOTE**: The Zod `finalDecisionEnum` only accepts `ACCEPTED` and `REJECTED`. Once reviewed, `PENDING` cannot be set.
- **Response 200** (media URLs SIGNED):
  - Same shape as admission object, with `final_decision`, `reviewed_by`, `reviewed_at` set.
  - If `ACCEPTED`: `person_id` will be the newly created person's ID.
- **Errors**: 400, 401, 403, 404

---

### 3.8 Explorations (Expeditions)

> **Mount point**: `/api/expeditions`

**CRITICAL KNOWN ISSUE**: Expedition responses include `users: true` (full user object). This means **`password_hash` IS leaked** in expedition responses. The frontend should strip or ignore this field. This is a known bug.

Also: `camps: true` returns the full camp object.

#### `POST /api/expeditions`
- **Auth**: required
- **Permission**: `expeditions.create`
- **Description**: Create expedition. If status is ONGOING, members' status changes to AWAY. Resources are deducted from inventory immediately.
- **Request body** (JSON):
```json
{
  "camp_id": 1,                        // integer, positive, required
  "created_by": 1,                     // integer, positive, required
  "destination": "East Sector Mall",   // string, 1-255 chars, required
  "departure_date": "2026-05-25",      // ISO date YYYY-MM-DD, required
  "expected_return_date": "2026-05-27", // ISO date, required
  "max_return_date": "2026-05-30",     // ISO date, required
  "actual_return_date": "2026-05-27",  // ISO date, optional
  "status": "PLANNED",                 // enum, optional, default PLANNED (RETURNED/CANCELLED not allowed)
  "notes": "Scout for supplies",       // string, optional
  "members": [                         // array, optional, default []
    { "person_id": 1 }
  ],
  "allocated_resources": [             // array, optional, default []
    { "resource_type_id": 1, "amount": 5.0 }
  ]
}
```
> **Constraints**: `departure_date <= expected_return_date <= max_return_date`. No duplicate `resource_type_id` in `allocated_resources`.

- **Response 201**:
```json
{
  "id": 1,
  "camp_id": 1,
  "destination": "East Sector Mall",
  "status": "PLANNED",
  "created_by": 1,
  "departure_date": "2026-05-25T00:00:00.000Z",
  "expected_return_date": "2026-05-27T00:00:00.000Z",
  "actual_return_date": null,
  "max_return_date": "2026-05-30T00:00:00.000Z",
  "notes": "Scout for supplies",
  "created_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null,
  "camps": {
    "id": 1,
    "name": "Alpha Base",
    "location": "...",
    "status": "ACTIVE",
    "ai_context_prompt": "...",
    "created_at": "...",
    "updated_at": "...",
    "deleted_at": null
  },
  "users": {
    // *** FULL user object INCLUDING password_hash *** (known bug)
    "id": 1,
    "camp_id": 1,
    "role_id": 1,
    "session_version": 1,
    "username": "admin",
    "password_hash": "$2b$...",
    "is_active": true,
    "last_activity": "2026-05-24T14:05:30.000Z",
    "created_at": "2026-05-24T14:05:30.000Z"
  },
  "expedition_members": [
    { "expedition_id": 1, "person_id": 1, "created_at": "..." }
  ],
  "expedition_allocated_resources": [
    { "expedition_id": 1, "resource_type_id": 1, "amount": "5.00", "created_at": "..." }
  ]
}
```
> **IMPORTANT**: `created_by` is the user **column name** in the expedition, but the response nests the full `users` object under key `"users"`. The `"users"` key contains `password_hash`. Frontend MUST NOT render or store this.

- **Errors**: 400, 401, 403, 404

#### `GET /api/expeditions`
- **Auth**: required
- **Permission**: `expeditions.read`
- **Description**: List expeditions for user's camp (scoped via `req.user.campId`)
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list. Each expedition includes `camps`, `users`, `expedition_members`, `expedition_allocated_resources`, **AND** `expedition_found_resources` (returned resources array). Ordered by `id` DESC.
- **Errors**: 401, 403

#### `GET /api/expeditions/:id`
- **Auth**: required
- **Permission**: `expeditions.read`
- **Response 200**: Single expedition with `camps`, `users`, `expedition_members`, `expedition_allocated_resources`, `expedition_found_resources`
- **Errors**: 401, 403, 404

#### `PUT /api/expeditions/:id`
- **Auth**: required
- **Permission**: `expeditions.update`
- **Description**: Update expedition details (NOT status — use PATCH for that)
- **Request body** (all fields optional, partial):
```json
{
  "camp_id": 1,
  "created_by": 1,
  "destination": "East Sector Mall",
  "departure_date": "2026-05-25",
  "expected_return_date": "2026-05-27",
  "max_return_date": "2026-05-30",
  "actual_return_date": null,
  "notes": "Updated notes",
  "members": [{ "person_id": 1 }],
  "allocated_resources": [{ "resource_type_id": 1, "amount": 3.0 }]
}
```
- **Response 200**: Updated expedition with `camps`, `users` includes
- **Errors**: 400, 401, 403, 404

#### `PATCH /api/expeditions/:id/status`
- **Auth**: required
- **Permission**: `expeditions.update_status`
- **Description**: Change expedition status. Transitions: PLANNED→ONGOING/CANCELLED, ONGOING→RETURNED/CANCELLED. RETURNED/CANCELLED are terminal. When RETURNED, actual_return_date is required. Resources can be returned (auto-uses allocated amounts if not specified).
- **Request body** (JSON):
```json
{
  "status": "RETURNED",                          // enum, required
  "actual_return_date": "2026-05-27",            // ISO date, REQUIRED if status=RETURNED
  "notes": "All members returned",               // string, optional
  "changed_by": 1,                               // integer, positive, required
  "resources_to_return": [                       // array, optional (defaults to allocated amounts)
    { "resource_type_id": 1, "amount": 5.0 }
  ],
  "members": [                                    // array, optional (subset of expedition members)
    { "person_id": 1 }
  ],
  "return_member_status": "HEALTHY"              // persons_status, optional (default HEALTHY)
}
```
- **Response 200**: Expedition with `camps`, `users`, `expedition_members`, `expedition_allocated_resources`, `expedition_found_resources`
- **Errors**: 400, 401, 403, 404

#### `DELETE /api/expeditions/:id`
- **Auth**: required
- **Permission**: `expeditions.delete`
- **Description**: Cancel (not hard-delete) an expedition. Can't cancel RETURNED or already CANCELLED expeditions.
- **Request body** (JSON, required):
```json
{
  "changed_by": 1,                   // integer, positive, required
  "return_member_status": "HEALTHY"  // persons_status, optional
}
```
- **Response**: 204 No Content
- **Errors**: 400, 401, 403, 404

---

### 3.9 Transfers

> **Mount point**: `/api/transfers`

#### `POST /api/transfers`
- **Auth**: required
- **Permission**: `transfers.create`
- **Description**: Create inter-camp transfer. Source and target must be different camps. `requested_by` must belong to requesting camp. PERSON transfers must include RESOURCE items for travel rations.
- **Request body** (JSON):
```json
{
  "requesting_camp": 1,                            // integer, positive, required
  "target_camp": 2,                                // integer, positive, required
  "type": "MIXED",                                 // "RESOURCE"|"PERSON"|"MIXED", required
  "notes": "Emergency supply",                     // string, optional
  "requested_by": 1,                               // integer, positive, required
  "leader_person_id": 5,                           // integer, positive, optional
  "scheduled_delivery_date": "2026-05-28T10:00:00.000Z", // ISO datetime, optional
  "items": [                                       // array, min 1, required
    {
      "item_type": "RESOURCE",                     // "RESOURCE"|"PERSON", required
      "resource_type_id": 1,                       // integer, required if RESOURCE
      "quantity": 50                               // number, required if RESOURCE, positive
    },
    {
      "item_type": "PERSON",                       // required
      "person_id": 1                               // integer, required if PERSON
    }
  ]
}
```
- **Response 201**:
```json
{
  "id": 1,
  "requesting_camp": 1,
  "target_camp": 2,
  "status": "PENDING",
  "type": "MIXED",
  "notes": "Emergency supply",
  "requested_by": 1,
  "leader_person_id": 5,
  "scheduled_delivery_date": "2026-05-28T10:00:00.000Z",
  "approved_by_source": null,
  "approved_by_target": null,
  "approved_source_at": null,
  "approved_target_at": null,
  "updated_at": "2026-05-24T14:05:30.000Z",
  "created_at": "2026-05-24T14:05:30.000Z",
  "camp_transfer_items": [
    {
      "id": 1,
      "camp_transfer_id": 1,
      "item_type": "RESOURCE",
      "resource_type_id": 1,
      "person_id": null,
      "quantity": "50.00",
      "created_at": "...",
      "updated_at": "...",
      "deleted_at": null
    },
    {
      "id": 2,
      "camp_transfer_id": 1,
      "item_type": "PERSON",
      "resource_type_id": null,
      "person_id": 1,
      "quantity": "0.00",
      "created_at": "...",
      "updated_at": "...",
      "deleted_at": null
    }
  ]
}
```
> **NOTE**: `camp_transfer_items` quantities are Decimal → returned as **strings**. Transfer items for PERSON type have `quantity: "0.00"` (default).
- **Errors**: 400, 401, 403, 404

#### `GET /api/transfers`
- **Auth**: required
- **Permission**: `transfers.read`
- **Description**: List transfers where user's camp is either requesting or target camp
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list. Each transfer includes `camp_transfer_items`, `requesting_camp_ref` (full camp object), and `target_camp_ref` (full camp object). Ordered by `created_at` DESC.
- **Errors**: 401, 403

#### `GET /api/transfers/:id`
- **Auth**: required
- **Permission**: `transfers.read`
- **Response 200**: Single transfer with `camp_transfer_items`. Does NOT include `requesting_camp_ref` or `target_camp_ref`.
- **Errors**: 401, 403, 404

#### `PATCH /api/transfers/:id/schedule`
- **Auth**: required
- **Permission**: `transfers.schedule`
- **Description**: Set delivery date. Only requesting camp can schedule. Cannot be in the past.
- **Request body** (JSON):
```json
{
  "scheduled_delivery_date": "2026-05-28T10:00:00.000Z"  // ISO datetime, required
}
```
- **Response 200**: Transfer with `camp_transfer_items`
- **Errors**: 400, 401, 403, 404

#### `PATCH /api/transfers/:id/approve-source`
- **Auth**: required
- **Permission**: `transfers.approve_source`
- **Description**: Source camp approves. Transfer must be PENDING. `scheduled_delivery_date` is required (either set now or already scheduled).
- **Request body** (JSON):
```json
{
  "notes": "Approved by source",                     // string, optional
  "scheduled_delivery_date": "2026-05-28T10:00:00Z" // ISO datetime, optional (must be set somewhere)
}
```
- **Response 200**: Transfer with `camp_transfer_items`, status → `APPROVED_SOURCE`
- **Errors**: 400, 401, 403, 404

#### `PATCH /api/transfers/:id/approve-target`
- **Auth**: required
- **Permission**: `transfers.approve_target`
- **Description**: Target camp approves. Transfer must be APPROVED_SOURCE.
- **Request body** (JSON):
```json
{
  "notes": "Ready to receive"   // string, optional
}
```
- **Response 200**: Transfer with `camp_transfer_items`, status → `APPROVED_TARGET`
- **Errors**: 400, 401, 403, 404

#### `PATCH /api/transfers/:id/complete`
- **Auth**: required
- **Permission**: `transfers.complete`
- **Description**: Complete transfer. Deducts resources from source, adds to target. Moves people between camps. Only source or target camp users can complete.
- **Request body** (JSON):
```json
{
  "notes": "Transfer completed",   // string, optional
  "person_status": "HEALTHY"       // persons_status, optional (default HEALTHY)
}
```
- **Response 200**: Transfer with `camp_transfer_items`, status → `COMPLETED`
- **Errors**: 400 (insufficient stock, missing rations), 401, 403, 404

#### `PATCH /api/transfers/:id/reject`
- **Auth**: required
- **Permission**: `transfers.reject`
- **Description**: Reject transfer. Can't reject COMPLETED or already REJECTED transfers. Only source or target camp users can reject.
- **Request body** (JSON):
```json
{
  "reason": "Insufficient supplies"   // string, 1-500 chars, required
}
```
- **Response 200**: Transfer with `camp_transfer_items`, status → `REJECTED`, notes appended with rejection reason
- **Errors**: 400, 401, 403, 404

---

### 3.10 Users

#### `POST /api/users`
- **Auth**: required
- **Permission**: `users.create`
- **Description**: Create new system user
- **Request body** (JSON):
```json
{
  "username": "operator1",                            // string, 1-60 chars, required
  "password": "my-secure-pw",                         // string, 8-255 chars, required
  "camp_id": 1,                                       // integer, positive, required
  "role_id": 2,                                       // integer, positive, required
  "is_active": true,                                  // boolean, optional, default true
  "last_activity": "2026-05-24T14:05:30.000Z",        // ISO datetime, optional
  "created_at": "2026-05-24T14:05:30.000Z"            // ISO datetime, optional
}
```
- **Response 201** (password_hash EXCLUDED, session_version INCLUDED):
```json
{
  "id": 1,
  "camp_id": 1,
  "role_id": 2,
  "session_version": 1,
  "username": "operator1",
  "is_active": true,
  "last_activity": null,
  "created_at": "2026-05-24T14:05:30.000Z"
}
```
> **NOTE**: `password_hash` is NEVER returned. `session_version` IS included.
- **Errors**: 400, 401, 403, 409 (duplicate username)

#### `GET /api/users`
- **Auth**: required
- **Permission**: `users.read`
- **Description**: List users. Admins see all users (campId=0 bypass), non-admins see only their camp's users.
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list of user objects (shape same as POST, no password_hash)
- **Errors**: 401, 403

#### `GET /api/users/:id`
- **Auth**: required
- **Permission**: `users.read`
- **Response 200**: Single user (no password_hash, session_version included)
- **Errors**: 401, 403, 404

#### `PUT /api/users/:id`
- **Auth**: required
- **Permission**: `users.update`
- **Request body** (all fields optional):
```json
{
  "username": "newuser",
  "password": "new-secure-pw",
  "camp_id": 1,
  "role_id": 2,
  "is_active": true,
  "last_activity": "..."
}
```
- **Response 200**: Updated user (no password_hash, session_version included)
- **Errors**: 400, 401, 403, 404, 409 (duplicate username)

#### `DELETE /api/users/:id`
- **Auth**: required
- **Permission**: `users.delete`
- **Description**: Soft-deactivate — sets `is_active: false`, increments `session_version`, clears `last_activity`. Not a hard delete.
- **Response**: 204 No Content
- **Errors**: 401, 403, 404

---

### 3.11 Professions

#### `POST /api/professions`
- **Auth**: required
- **Permission**: `professions.create`
- **Request body** (JSON):
```json
{
  "name": "Scavenger",                                    // string, 1-80 chars, required
  "description": "Specializes in resource gathering"      // string, optional
}
```
- **Response 201**:
```json
{
  "id": 1,
  "name": "Scavenger",
  "description": "Specializes in resource gathering",
  "created_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null
}
```
- **Errors**: 400, 401, 403, 409 (duplicate name)

#### `GET /api/professions`
- **Auth**: required
- **Permission**: `professions.read`
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list
- **Errors**: 401, 403

#### `GET /api/professions/:id`
- **Auth**: required
- **Permission**: `professions.read`
- **Response 200**: Single profession
- **Errors**: 401, 403, 404

#### `PUT /api/professions/:id`
- **Auth**: required
- **Permission**: `professions.update`
- **Request body** (all optional):
```json
{ "name": "Scavenger", "description": "..." }
```
- **Response 200**: Updated profession
- **Errors**: 400, 401, 403, 404, 409

#### `DELETE /api/professions/:id`
- **Auth**: required
- **Permission**: `professions.delete`
- **Response**: 204 No Content
- **Errors**: 400 (FK violation), 401, 403, 404

---

### 3.12 Roles

> **CRITICAL**: Response shape differs from OpenAPI. The response has a `permissions` array of full permission objects, NOT `permission_ids: [1,2,3]`.

#### `POST /api/roles`
- **Auth**: required
- **Permission**: `roles.create`
- **Request body** (JSON):
```json
{
  "name": "camp_operator",              // string, 1-60 chars, regex /^[a-z_]+$/, required
  "description": "Camp operations",     // string, max 255, optional
  "permission_ids": [1, 2, 3]          // array of integers, optional
}
```
- **Response 201** (NOTE: flat `permissions` array of full objects):
```json
{
  "id": 4,
  "name": "camp_operator",
  "description": "Camp operations",
  "created_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null,
  "permissions": [
    { "id": 1, "name": "camps.read", "description": "Read camps" },
    { "id": 2, "name": "people.read", "description": "Read people" },
    { "id": 3, "name": "resources.read", "description": "Read resources" }
  ]
}
```
> **NOT** `{ ..., "permission_ids": [1, 2, 3] }`. The server maps `role_permissions[].permissions` into a flat `permissions` array.

- **Errors**: 400, 401, 403, 404 (permission not found), 409 (duplicate name)

#### `GET /api/roles`
- **Auth**: required
- **Permission**: `roles.read`
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list (same shape with `permissions` array)
- **Errors**: 401, 403

#### `GET /api/roles/:id`
- **Auth**: required
- **Permission**: `roles.read`
- **Response 200**: Single role with `permissions` array
- **Errors**: 401, 403, 404

#### `PUT /api/roles/:id`
- **Auth**: required
- **Permission**: `roles.update`
- **Request body** (at least one field, all optional):
```json
{
  "name": "new_name",
  "description": "Updated",
  "permission_ids": [1, 2]    // if provided, REPLACES all existing permissions
}
```
- **Response 200**: Updated role with `permissions` array
- **Errors**: 400, 401, 403, 404, 409

#### `DELETE /api/roles/:id`
- **Auth**: required
- **Permission**: `roles.delete`
- **Description**: Deletes role and its permission links. Fails if any users are assigned to this role.
- **Response**: 204 No Content
- **Errors**: 400 (FK violation), 401, 403, 404, 409 (role has assigned users)

---

### 3.13 Permissions

#### `POST /api/permissions`
- **Auth**: required
- **Permission**: `permissions.create`
- **Request body** (JSON):
```json
{
  "name": "camps.read",              // string, 3-80 chars, regex /^[a-z]+(\.[a-z_]+)+$/, required
  "description": "Read camps"        // string, max 255, optional
}
```
- **Response 201**:
```json
{
  "id": 1,
  "name": "camps.read",
  "description": "Read camps",
  "created_at": "2026-05-24T14:05:30.000Z",
  "updated_at": "2026-05-24T14:05:30.000Z",
  "deleted_at": null
}
```
- **Errors**: 400, 401, 403, 409 (duplicate name)

#### `GET /api/permissions`
- **Auth**: required
- **Permission**: `permissions.read`
- **Query**: `?page=1&pageSize=20`
- **Response 200**: Paginated list
- **Errors**: 401, 403

#### `GET /api/permissions/:id`
- **Auth**: required
- **Permission**: `permissions.read`
- **Response 200**: Single permission
- **Errors**: 401, 403, 404

#### `PUT /api/permissions/:id`
- **Auth**: required
- **Permission**: `permissions.update`
- **Request body** (all optional):
```json
{ "name": "camps.read", "description": "Updated" }
```
- **Response 200**: Updated permission
- **Errors**: 400, 401, 403, 404, 409

#### `DELETE /api/permissions/:id`
- **Auth**: required
- **Permission**: `permissions.delete`
- **Response**: 204 No Content
- **Errors**: 400 (FK violation — permission assigned to roles), 401, 403, 404

---

### 3.14 Metrics

> **Mount point**: `/api/metrics`. All endpoints read-only GET, scoped to user's camp. No query params or request body.

#### `GET /api/metrics/dashboard`
- **Auth**: required
- **Permission**: `metrics.dashboard`
- **Response 200** (flat counts, no nesting):
```json
{
  "survivor_count": 150,
  "healthy_count": 120,
  "injured_count": 15,
  "absent_count": 10,
  "resource_types_count": 12,
  "total_resources_value": 5000.5,
  "active_expeditions_count": 2,
  "pending_transfers_count": 3,
  "low_resource_alerts_count": 5
}
```
- **Errors**: 401, 403

#### `GET /api/metrics/resources`
- **Auth**: required
- **Permission**: `metrics.resources`
- **Response 200** (array, no pagination):
```json
[
  {
    "resource_id": 1,
    "resource_name": "Canned Food",
    "quantity_current": 500.0,
    "quantity_min_threshold": 100.0,
    "quantity_max_capacity": null,
    "status": "OK"
  }
]
```
`status` is computed: `OK`, `LOW` (qty < min), `CRITICAL` (qty < min*0.5), `OVERSTOCKED` (qty > min*3).
- **Errors**: 401, 403

#### `GET /api/metrics/people`
- **Auth**: required
- **Permission**: `metrics.people`
- **Response 200**:
```json
{
  "total_survivors": 150,
  "by_profession": [
    { "profession_name": "Medic", "count": 25 }
  ],
  "by_status": [
    { "status": "HEALTHY", "count": 120 },
    { "status": "INJURED", "count": 15 },
    { "status": "SICK", "count": 5 },
    { "status": "AWAY", "count": 10 },
    { "status": "DEAD", "count": 3 }
  ],
  "average_capacity_utilization_percent": 0
}
```
- **Errors**: 401, 403

#### `GET /api/metrics/expeditions`
- **Auth**: required
- **Permission**: `metrics.expeditions`
- **Response 200** (array, no pagination):
```json
[
  {
    "expedition_id": 1,
    "name": "East Sector Mall",
    "status": "ONGOING",
    "participant_count": 5,
    "resource_consumption_total": 25.5,
    "days_elapsed": 3,
    "expected_return_date": "2026-05-27T00:00:00.000Z"
  }
]
```
`name` is the expedition's `destination`. `days_elapsed` is computed from `departure_date` to now (≥ 0).
- **Errors**: 401, 403

---

## 4. Key Integration Notes

### 4.1 Media URL signing
- **People POST** (`createPersonHandler`): Does NOT sign media URLs. Returns raw Cloudinary URLs.
- **People GET, PUT** (`getPersonHandler`, `updatePersonHandler`, `getPeopleHandler`): Signs `photo_url` and `id_card_url` fields in the response.
- **Admission POST, GET, PATCH review**: Signs `photo_url` and `id_card_url` fields.
- Signed URLs expire after 600 seconds by default (configurable via `CLOUDINARY_SIGNED_URL_MAX_TTL_SECONDS`).

### 4.2 user.password_hash leak in expeditions
- **All expedition endpoints** (`POST`, `GET`, `PUT`, `PATCH status`) include `users: true` which returns the FULL user object including `password_hash`.
- The frontend MUST strip or ignore `password_hash` field. Do NOT render it.
- Similarly, `camps: true` returns the full camp object in expedition responses.

### 4.3 Response shape mismatches with OpenAPI
- **GET /api/inventory/:campId**: Custom shape with `resource_type_id`, `resource_name`, `unit`, `quantity`, `is_below_minimum`, nested `resource_type` — does NOT match OpenAPI `InventoryItem`.
- **POST /api/inventory/adjustment**: Returns `{ movement: {...}, inventory: {...} }` — does NOT match OpenAPI `InventoryLog`.
- **GET /api/inventory/audit/:campId**: Returns `{ data, pagination, has_inconsistencies }` — extra top-level field.
- **GET /api/roles**: Returns `{ permissions: [{ id, name, description }] }` — does NOT match OpenAPI `{ permission_ids: [1,2,3] }`.
- **Metrics all**: Flat arrays/objects, no pagination.

### 4.4 FK constraint violations
- Foreign key constraint violations (Prisma error P2003) return HTTP **400**, not 404 or 500.

### 4.5 pageSize limits
- `pageSize` defaults to 20, max 100. The service clamps with `Math.min(pageSize, 100)`.

### 4.6 Decimal values
- Prisma `Decimal` columns are returned as **strings** in JSON (e.g., `"0.50"`, `"100.00"`).
- Exception: `quantity` in inventory response items is converted to **number** via `asNumber()`.
- `amount` in expedition allocated/found resources is returned as-is from Prisma (string).
- `quantity` in transfer items is returned as-is from Prisma (string).

### 4.7 Delete endpoints
- **204 No Content** responses. Frontend must handle empty response bodies.
- Camp delete: hard delete, may fail with 400 FK violation.
- User delete: soft delete (sets `is_active: false`).
- Expedition delete: sets status to CANCELLED (not hard delete).

### 4.8 Camp scoping
- All module endpoints (except System, Auth) pass through `campMiddleware` which extracts camp from JWT.
- People routes get camp from URL param `campId`.
- Metrics, expeditions, transfers list get camp from user's token (`req.user.campId`).
- Admins with `admin.bypass_camp_scoping` permission bypass camp-scoping in campMiddleware.

### 4.9 Date formats
- ISO datetime: `"2026-05-24T14:05:30.000Z"` (full ISO 8601)
- ISO date: `"2026-05-24"` (YYYY-MM-DD, used for date-only fields like `departure_date`)
- **Never trust client time** — always sync via `GET /api/system/time`.

### 4.10 Non-paginated endpoints
The following endpoints return arrays/objects directly (NOT wrapped in pagination):
- `GET /api/metrics/dashboard` — flat object
- `GET /api/metrics/resources` — flat array
- `GET /api/metrics/people` — object with nested arrays
- `GET /api/metrics/expeditions` — flat array
- `GET /api/system/time` — flat object

### 4.11 Session auto-refresh
- Every request through `sessionMiddleware` bumps `last_activity` in the database.
- The frontend does not need to manually refresh sessions — just make requests.

### 4.12 JWT token `exp` field
- The `exp` claim in the JWT is used for two purposes:
  1. Standard JWT expiry (default 24h)
  2. Used as `tokenExp` when signing Cloudinary URLs (via `req.user.exp`). This means signed URLs expire at `min(exp, now + 600s)`.

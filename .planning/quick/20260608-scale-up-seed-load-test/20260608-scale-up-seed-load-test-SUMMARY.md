---
status: complete
---

# Summary: Scale up seed-load-test.ts

## Changes Made

1. **CAMP_DEFINITIONS**: Reduced from 6 to 4 camps (removed Echo Forward and Foxtrot Fallback). All 4 camps are ACTIVE.
2. **Foxtrot separate create**: Removed (all camps are now active, no abandoned camp needed).
3. **Population**: Increased from 350 to 1000 persons, equally distributed (250 per camp).
4. **Admissions**: Increased from 150 to 1000.
5. **Expeditions**: Increased from 90 to 1000.
6. **Transfers**: Increased from 80 to 1000.
7. **USERS_PER_CAMP**: Removed campIdx 4 and 5 entries (no longer exist).
8. **INITIAL_INVENTORY_AMOUNTS**: Removed Echo Forward entry.
9. **is_active check**: Simplified to `true` (all 4 camps active).
10. **Target log**: Updated from ~11,500 to ~30,000 records.

## Files Changed
- `prisma/seed-load-test.ts` — All scaling changes

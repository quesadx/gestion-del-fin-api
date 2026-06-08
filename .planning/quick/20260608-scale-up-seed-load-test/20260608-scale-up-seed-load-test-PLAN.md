# Quick Task: Scale up seed-load-test.ts

**Date:** 2026-06-08
**Mode:** quick

## Description

Scale `prisma/seed-load-test.ts` to generate larger realistic datasets:
- 4 camps (remove Echo Forward, Foxtrot Fallback)
- 1000 persons, equally distributed among camps
- ~1000 admission requests
- ~1000 expeditions
- ~1000 transfers

## Tasks

### Task 1: Reduce CAMP_DEFINITIONS to 4 entries
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Remove Echo Forward and Foxtrot Fallback from CAMP_DEFINITIONS array; remove separate Foxtrot create call
- **Verify:** CAMP_DEFINITIONS has exactly 4 entries, all with aiPrompt not null

### Task 2: Scale people to 1000 with equal distribution
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Change `totalPopulation` from 350 to 1000; replace weighted distribution with equal distribution (250 per camp)
- **Verify:** Script generates 1000 people across 4 camps

### Task 3: Scale admissions to ~1000
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Change loop count from 150 to 1000
- **Verify:** Script generates ~1000 admission requests

### Task 4: Scale expeditions to ~1000
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Change loop count from 90 to 1000
- **Verify:** Script generates ~1000 expeditions

### Task 5: Scale transfers to ~1000
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Change loop count from 80 to 1000
- **Verify:** Script generates ~1000 transfers

### Task 6: Fix USERS_PER_CAMP and INITIAL_INVENTORY_AMOUNTS for 4 camps
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Remove campIdx 4 and 5 entries from USERS_PER_CAMP; remove Echo Forward from INITIAL_INVENTORY_AMOUNTS
- **Verify:** No references to removed camps

### Task 7: Update target count log
- **Files:** `prisma/seed-load-test.ts`
- **Action:** Update the target count string to reflect new scale
- **Verify:** Log shows realistic expected count

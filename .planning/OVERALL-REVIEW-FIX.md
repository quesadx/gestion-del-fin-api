---
phase: overall
fixed_at: "2026-05-23T22:00:00Z"
depth: standard
findings_in_scope: 18
fixed: 18
skipped: 1
skipped_list:
  - CR-02: Daily rations cron default expression (intentionally excluded per user request)
iteration: 1
status: all_fixed
files_affected: 16
---

# Overall: Code Review Fix Report

**Fixed at:** 2026-05-23T22:00:00Z
**Depth:** standard
**Iteration:** 1

## Summary

- Findings in scope: 18 (6 Critical + 12 Warning)
- Fixed: 18
- Skipped: 1 (CR-02 — intentionally excluded per user request)
- Status: all_fixed

## Fixed Issues

### Critical

| Finding | Description | Files Modified |
|---------|-------------|---------------|
| CR-01 | Camp middleware URL extraction restricted to camp-ID routes only | `camp.middleware.ts` |
| CR-03 | Concurrency guards (running flags) added to all 3 cron jobs | `scheduler.ts` |
| CR-04 | TOCTOU race fixed — validateRelations now accepts optional tx parameter | `people.service.ts` |
| CR-05 | photo_url Zod max length 255 → 500 to match DB VarChar | `admission.schema.ts` |
| CR-06 | auditLog made awaitable (returns Promise<void>) instead of fire-and-forget | `auditLog.ts` |
| CR-07 | P2003 FK errors now return HTTP 409 instead of 400 | `handlePrismaError.ts`, `error.middleware.ts` |

### Warning

| Finding | Description | Files Modified |
|---------|-------------|---------------|
| WR-01 | Null age treated as child in ration distribution | `daily-rations.job.ts` |
| WR-02 | Null camp ID pass-through handled in middleware | `camp.middleware.ts` |
| WR-03 | Unsafe `as unknown as typeof prisma` casts removed from transfer service | `transfers.service.ts` |
| WR-04 | Unsafe casts removed from explorations service | `explorations.service.ts` |
| WR-05 | Date normalization for date-only comparisons in transfers | `transfers.service.ts` |
| WR-06 | signMediaUrls added to createPersonHandler | `people.controller.ts` |
| WR-07 | Client-settable timestamps removed from user schemas | `users.schema.ts`, `users.service.ts` |
| WR-08 | campId=0 sentinel → undefined fix | `users.controller.ts`, `users.service.ts` |
| WR-09 | Future departure_date validation for expeditions | `explorations.schema.ts` |
| WR-10 | Include field name in FK error message | `handlePrismaError.ts` |
| WR-11 | PENDING added to aiDecisionEnum | `admission.schema.ts` |
| WR-12 | Preserve leading-zero strings in multipart coercion | `validate.middleware.ts` |

## Skipped Issues

| Finding | Reason |
|---------|--------|
| CR-02 | Daily rations cron default expression — intentionally excluded per user request |

## Fix Commits

```
81c458d fix(overall): CR-01 fix camp middleware URL extraction to only match camp-ID routes
0d11b3b fix(overall): CR-03 add concurrency guards to all 3 cron jobs
2d7d1a1 fix(overall): CR-04 fix TOCTOU race in createPerson FK validation
fe75758 fix(overall): CR-05 + WR-11 admission schema fixes
04982c8 fix(overall): CR-06 make auditLog awaitable instead of fire-and-forget
17812f1 fix(overall): CR-07 + WR-10 fix FK error status and message
a0e8872 fix(overall): WR-01 treat unknown age as child in ration distribution
17a7d8f fix(overall): WR-03 + WR-05 transfer service type safety and date normalization
a3f5742 fix(overall): WR-04 remove unsafe 'as unknown as typeof prisma' casts in explorations service
5d3c692 fix(overall): WR-06 + WR-07 + WR-08 people controller signing, user schema timestamps, user campId sentinel
56c73e9 fix(overall): WR-09 validate departure_date is not in the past for expeditions
d821a62 fix(overall): WR-12 preserve leading-zero strings in multipart value coercion
```

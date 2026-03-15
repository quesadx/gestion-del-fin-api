# Prisma Cheat Sheet - The Essentials

## The Core Idea
**You describe what you want → Prisma creates SQL for you → Git tracks it → Everyone stays in sync**

---

## The 3 Files You Edit

```
1. prisma/schema.prisma      ← Define tables (YOU EDIT THIS)
2. prisma/seed.ts             ← Define initial data (YOU EDIT THIS)
3. prisma.config.ts           ← Configuration (set once, forget)
```

---

## The Flow

### **Schema Changes**
```
Edit schema.prisma
    ↓
npx prisma migrate dev --name "description"
    ↓
Prisma compares old → new
    ↓
Generates SQL automatically
    ↓
Creates/Updates: prisma/migrations/TIMESTAMP_description/migration.sql
    ↓
Runs SQL on database
    ↓
Updates TypeScript types
    ↓
git add && git commit
```

### **Data Seeding**
```
Edit prisma/seed.ts (TypeScript, not SQL)
    ↓
npm run db:seed
    ↓
Prisma Client inserts data
    ↓
Done
```

---

## Commands

| Command | Does |
|---------|------|
| `npx prisma migrate dev --name "xyz"` | Create + run migration (dev) |
| `npx prisma migrate deploy` | Run pending migrations (production) |
| `npx prisma migrate status` | Show migration status |
| `npm run db:seed` | Run seed script |
| `npx prisma studio` | Visual database browser |
| `npx prisma generate` | Regenerate TypeScript types |
| `npx prisma validate` | Check syntax |

---

## Your Current Setup

```
prisma/migrations/0_init/migration.sql
├─ GRANT CREATE, DROP (permissions)
└─ All CREATE TABLE statements (no data)

prisma/seed.ts
├─ Roles, professions, resource types
├─ Initial camp
├─ Test users
└─ You control what goes here

Application
└─ Uses Prisma Client to query
```

---

## New Teammate Flow

```bash
git clone <repo>
docker-compose up                 # Start database
npx prisma migrate deploy         # Run migrations (from git)
npm run db:seed                   # Load reference data
npm run dev                       # Works perfectly
```

---

## Key Rules

✅ **DO**
- Edit `schema.prisma` for schema changes
- Run `npx prisma migrate dev` to create migrations
- Commit migration files to git
- Edit `seed.ts` for initial data

❌ **DON'T**
- Edit migration SQL files manually
- Delete old migrations
- Edit `prisma/generated/` (auto-generated)
- Run raw SQL files directly

---

## Why This Matters

**Before** (chaos):
- Raw SQL files in multiple places
- Team members confused which is current
- Easy to lose data accidentally

**After** (clean):
- One source of truth (schema.prisma)
- Git tracks all changes
- Easy to see history
- Anyone can join project instantly

---

## Quick Decision Tree

**"I want to..."**

| Need | Do This |
|------|---------|
| Add a column | Edit schema.prisma, run `npx prisma migrate dev --name "..."` |
| Add initial data | Edit seed.ts, run `npm run db:seed` |
| Deployment | Run `npx prisma migrate deploy`, then `npm run db:seed` |
| See database visually | Run `npx prisma studio` |
| Check migration status | Run `npx prisma migrate status` |
| Reset local DB | `docker-compose down && docker-compose up && npx prisma migrate deploy && npm run db:seed` |

---

## The Mental Model

```
schema.prisma (description)
    ↓ (npx prisma migrate dev)
migration.sql (instructions)
    ↓ (executes on database)
Database (reality)
    ↓ (git tracks migrations)
Everyone in sync
```

**That's it.** Sleep well! 👊

# 🗄️ Prisma Setup - Clean Implementation Guide

**Status**: Clean 3-tier separation of concerns

---

## 📊 Three-Tier Architecture

```
┌─────────────────────────────────────────────────────┐
│  prisma/migrations/0_init/migration.sql             │
│  └─ Schema + Permissions (runs once on DB creation) │
│     • GRANT CREATE, DROP (00-grants.sql)            │
│     • All CREATE TABLE statements (01-*.sql)        │
├─────────────────────────────────────────────────────┤
│  prisma/seed.ts                                      │
│  └─ Reference Data (roles, professions, etc)        │
│     • Run manually: npm run db:seed                 │
│     • You control what data gets seeded             │
├─────────────────────────────────────────────────────┤
│  Application Code                                    │
│  └─ Use Prisma Client to query data                │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow

### **For Development (Your Laptop)**

#### **Initial Setup (first time)**

```bash
# 1. Start database
docker-compose up

# 2. Creates schema + runs migration
npx prisma migrate deploy

# 3. Populate reference data (roles, professions, etc)
npm run db:seed

# 4. Start your app
npm run dev
```

#### **When You Change Schema**

```bash
# 1. Edit prisma/schema.prisma
# (e.g., add a new table or column)

# 2. Create migration
npx prisma migrate dev --name describe_what_changed
# This:
#   - Compares schema.prisma to database
#   - Generates SQL in prisma/migrations/{timestamp}_describe.../
#   - Runs it against your database
#   - Regenerates TypeScript types

# 3. Commit to git
git add prisma/
git commit -m "Add xyz column to users table"
```

#### **When You Need to Add Reference Data**

```bash
# 1. Edit prisma/seed.ts
# Add your INSERT logic (via Prisma Client)

# 2. Run seed
npm run db:seed

# 3. Optional: commit if it's standard data
git add prisma/seed.ts
git commit -m "Add new profession type"
```

---

### **For Production / New Teammate**

```bash
# 1. Clone repo
git clone <repo>
cd gestion-del-fin-api

# 2. Start database
docker-compose up

# 3. Run all migrations (from git)
npx prisma migrate deploy
# This runs all migrations from prisma/migrations/
# in order, tracking which ones already ran

# 4. Seed reference data
npm run db:seed

# 5. ✅ Database is ready
npm start
```

---

## 📁 File Structure

```
prisma/
├── schema.prisma              ← YOU EDIT THIS (Prisma-friendly syntax)
├── prisma.config.ts           ← Configuration (set once, forget)
├── migrations/                ← Git-tracked version history
│   └── 0_init/
│       ├── migration.sql       ← Schema (auto-generated, DO NOT EDIT)
│       └── migration.lock
├── seed.ts                     ← YOU EDIT THIS (manual data)
└── generated/                  ← Auto-generated TypeScript types
    ├── client.ts
    └── models/
```

---

## ✏️ How to Edit Each File

### **1. Schema Changes** (`prisma/schema.prisma`)

You edit this to define what tables and columns you want.

**Example: Add an email column to users**

```prisma
model users {
  id       Int     @id @default(autoincrement())
  username String  @unique
  email    String  @unique   ← NEW
}
```

Then run:

```bash
npx prisma migrate dev --name add_email_to_users
```

✅ Result: SQL generated, migration file created, types updated

---

### **2. Reference Data** (`prisma/seed.ts`)

You edit this to populate initial data (roles, professions, resource types, etc).

**Example: Add a new profession type**

```typescript
// In seed.ts, inside the main() function:
const chefProfession = await prisma.professions.upsert({
  where: { name: 'chef' },
  update: {},
  create: {
    name: 'chef',
    description: 'Food preparation and cooking',
  },
});
```

Then run:

```bash
npm run db:seed
```

✅ Result: Data inserted into database

---

## ⚠️ Important Rules

### **✅ DO**

- Edit `prisma/schema.prisma` for schema changes
- Edit `prisma/seed.ts` for reference data
- Run `npx prisma migrate dev` to create migrations
- Commit migration files to git
- Use `npm run db:seed` to populate data manually

### **❌ DON'T**

- Edit `prisma/migrations/*/migration.sql` manually
- Run raw SQL files directly (use migrations)
- Edit files in `prisma/generated/` (they're auto-generated)
- Delete old migrations
- Commit `node_modules` to git

---

## 🔑 Commands Cheat Sheet

| Command                                       | Purpose                             |
| --------------------------------------------- | ----------------------------------- |
| `npx prisma migrate dev --name "description"` | Create & run migration (dev)        |
| `npx prisma migrate deploy`                   | Run pending migrations (production) |
| `npx prisma migrate status`                   | Show migration status               |
| `npm run db:seed`                             | Populate reference data             |
| `npx prisma generate`                         | Regenerate TypeScript types         |
| `npx prisma studio`                           | Visual database browser             |
| `npx prisma validate`                         | Check schema.prisma syntax          |

---

## 🎯 Example: Complete Workflow

### **Scenario: Add a new "medic" profession and seed it**

#### Step 1: Edit schema (if needed)

Schema already supports professions, so skip this.

#### Step 2: Edit seed file

```typescript
// In prisma/seed.ts, add this:
const medicProfession = await prisma.professions.upsert({
  where: { name: 'medic' },
  update: {},
  create: {
    name: 'medic',
    description: 'Medical care and health management',
  },
});
console.log('✅ Medic profession created');
```

#### Step 3: Run seed

```bash
npm run db:seed
```

#### Step 4: Commit

```bash
git add prisma/seed.ts
git commit -m "Add medic profession to seed"
```

#### Step 5: Team pulls and runs

```bash
git pull
npm run db:seed
```

✅ Everyone has the new profession!

---

## 🧪 Testing Your Setup

### **Verify migration works**

```bash
npx prisma migrate status
# Should show: "Database schema is up to date"
```

### **Verify seed works**

```bash
npm run db:seed
# Should show: "Seed completed successfully!"
```

### **Browse database visually**

```bash
npx prisma studio
# Opens browser UI to see all tables + data
```

---

## 🐛 Troubleshooting

| Issue                               | Solution                                       |
| ----------------------------------- | ---------------------------------------------- |
| "Database is not managed by Prisma" | Run `npx prisma migrate deploy` first          |
| "Seed failed"                       | Check Prisma Client import path in seed.ts     |
| Migration never runs                | Verify `docker-compose up` started database    |
| TypeScript errors in seed.ts        | Run `npm run db:seed` (should auto-compile)    |
| Want to reset database completely   | `docker-compose down` then `docker-compose up` |

---

## 🔗 Integration with Application

Once migrations run and seed completes, use Prisma Client in your code:

```typescript
// src/modules/auth/auth.service.ts
import { prisma } from '@/database/connection';

export async function createUser(data: CreateUserInput) {
  const user = await prisma.users.create({
    data: {
      username: data.username,
      password_hash: hashedPassword,
      camp_id: data.camp_id,
      role_id: data.role_id,
    },
  });
  return user;
}
```

All types are auto-generated! ✨

---

## 📝 Next Steps

1. ✅ Review what you just did in this guide
2. ⏳ When ready to switch fully to Prisma: delete `src/database/migrations/`
3. ⏳ When ready to deploy: customize `prisma/seed.ts` with production data
4. ⏳ Consider environment-specific seeds (dev vs production)

---

**You now have a clean, maintainable database workflow!** 🎉

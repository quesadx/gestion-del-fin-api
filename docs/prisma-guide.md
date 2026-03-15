# 🗄️ Prisma Migrations - Simple Guide

**Your Goal**: Change your database schema safely, have version control for it, and Prisma creates the SQL for you.

---

## 📁 The 3 Key Files

### 1. **`prisma/schema.prisma`** ← Your Source of Truth

```prisma
model users {
  id    Int     @id @default(autoincrement())
  name  String
  email String  @unique
}
```

- You write this in a **Prisma-friendly language** (not SQL)
- Defines what tables you want and their structure
- Not automatic SQL — human friendly

### 2. **`prisma/migrations/`** ← Your History Book

```
prisma/migrations/
├── 20260314_init/
│   ├── migration.sql     ← The actual SQL that runs
│   └── migration.lock
├── 20260315_add_users/
│   ├── migration.sql
│   └── migration.lock
```

- Each migration = one change to the database
- **Timestamped** so you know the order
- Stored in Git so your team sees the history
- **You don't write these** — Prisma creates them

### 3. **`prisma.config.ts`** ← Your Instruction Manual

```typescript
export default defineConfig({
  schema: 'prisma/schema.prisma', // Where to find your schema
  migrations: {
    path: 'prisma/migrations', // Where to store migration files
  },
  datasource: {
    url: env('DATABASE_URL'), // How to connect to database
  },
});
```

- Setup once, never change (usually)
- Tells Prisma where everything is

---

## 🔄 The Flow (What Actually Happens)

### Scenario: You want to add an `email` column to `users` table

#### **Step 1: Edit `prisma/schema.prisma`**

```prisma
model users {
  id     Int    @id @default(autoincrement())
  name   String
  email  String  @unique  ← NEW FIELD
}
```

#### **Step 2: Run the Command**

```bash
npx prisma migrate dev --name add_email_to_users
```

\*_What Prisma does_:

1. 🔍 Compares your schema file to the database
2. 🤔 Realizes: "Oh, you added an `email` column"
3. 🛠️ **Generates SQL automatically**:
   ```sql
   ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
   ```
4. 📝 Saves it as: `prisma/migrations/20260314_add_email_to_users/migration.sql`
5. 🚀 Runs that SQL against your database
6. ✅ Updates database (table now has email column!)
7. 📦 Regenerates TypeScript types in `prisma/generated/`

#### **Result**:

- ✅ Database has the new column
- ✅ Migration saved in Git (teammates can see history)
- ✅ Your TypeScript code has types for `email` field

---

## 📊 Two Commands You'll Use

| Command                     | When to Use                              | What It Does                                             |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `npx prisma migrate dev`    | **Development** — You're changing schema | Creates migration file + runs it + generates types       |
| `npx prisma migrate deploy` | **Production** — You're deploying        | Runs pending migrations (no new migration files created) |

### Real Example:

```bash
# On your laptop (developing)
npx prisma migrate dev --name add_email_to_users
# Result: New migration file created, database updated, types generated

# On server (deploying)
npx prisma migrate deploy
# Result: Runs the migration file from git, database updated (no new file)
```

---

## 🗂️ The `_prisma_migrations` Table

Behind the scenes, Prisma creates a hidden table in your database:

```
_prisma_migrations (in your database)
┌──────────────────────────────┬─────────────────┐
│ id                           │ execution_time  │
├──────────────────────────────┼─────────────────┤
│ 20260314_init                │ 124             │
│ 20260314_add_email_to_users  │ 52              │
└──────────────────────────────┴─────────────────┘
```

- Tracks **which migrations already ran**
- Prevents running the same migration twice
- Different databases have different histories (you can deploy to staging, then production separately)

---

## ⚠️ Common Beginner Confusions

### ❌ **Confusion #1**: "Do I write SQL files?"

**No!** You write `.prisma` schema. Prisma generates the SQL.

### ❌ **Confusion #2**: "What's the `generated/` folder?"

```
prisma/generated/
├── client.ts       ← TypeScript interfaces for your database
├── models.ts       ← Your table definitions in TypeScript
```

Prisma creates these automatically from your schema. **Don't edit manually.**

### ❌ **Confusion #3**: "Why do I need migrations if it syncs automatically?"

**Version control + team collaboration**:

- You push migration files to Git
- Your teammates pull them
- Everyone's database stays in sync
- You can see the history of what changed when

### ❌ **Confusion #4**: "Can I delete old migrations?"

**No!** They're like Git commits. If you delete `20260314_init`, Prisma won't know the table exists.

---

## 🚀 Quick Reference: Your Current Setup

**What you have**:

```
prisma/
├── schema.prisma              ✅ File you edit
├── migrations/
│   └── 0_init/
│       └── migration.sql      ✅ Prisma generated this
└── generated/
    ├── client.ts              ✅ Prisma generated this
    └── models/                ✅ Prisma generated this
```

**What Prisma is tracking**:

- If database already has these tables (from `0_init/migration.sql`)
- When you change `.prisma` schema, Prisma creates new migrations

---

## 📋 Your Migration Status Right Now

```bash
npx prisma migrate status
```

**What it shows**:

- ✅ Migrations that ran
- ⏳ Migrations pending (haven't run yet)
- ❌ Issues (if schema doesn't match database)

---

## 🎯 Your Typical Workflow

**Every time you change schema:**

```bash
# 1. Edit prisma/schema.prisma (just write what you want)
# 2. Run this command
npx prisma migrate dev --name describe_your_change

# 3. Git commit (migrations are now version controlled)
git add prisma/
git commit -m "Add email column to users"

# 4. Push to teammates
git push
```

**New teammate joins project:**

```bash
# They just run:
npx prisma migrate deploy
# → All migrations from Git run on their database
# → Database instantly matches production
```

---

## 🔑 Key Takeaway

```
You write the WHAT (schema.prisma)
        ↓
Prisma generates the HOW (SQL migrations)
        ↓
Migrations are stored in Git (version history)
        ↓
Everyone's database stays in sync (teamwork!)
```

**That's it!** You're not writing SQL migrations by hand — Prisma does it for you.

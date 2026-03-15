# 📚 Prisma Documentation Index

**Quick links to understand your database setup**

---

## 🎓 Learning Path (Read in This Order)

### **1️⃣ [prisma-guide.md](./prisma-guide.md)** 
**Start here if you're brand new to Prisma**
- What is a migration?
- How does version control work?
- Common beginner confusion debunked
- ~5 min read

### **2️⃣ [prisma-implementation-guide.md](./prisma-implementation-guide.md)**
**Once you understand the concepts**
- Your actual setup (3-tier architecture)
- Step-by-step workflow for common tasks
- File structure and what each means
- Commands reference
- ~10 min read

### **3️⃣ [prisma.config.ts](../prisma.config.ts)**
**If you need to change configuration**
- Only 12 lines
- Unlikely to edit after initial setup

---

## 🔧 Common Tasks

### **I want to add a new table/column**
1. Read: [prisma-implementation-guide.md](./prisma-implementation-guide.md) → "How to Edit Each File"
2. Edit: `prisma/schema.prisma`
3. Run: `npx prisma migrate dev --name description`
4. Commit: `git add prisma/`

### **I want to add initial data (roles, professions, etc)**
1. Read: [prisma-implementation-guide.md](./prisma-implementation-guide.md) → "How to Edit Each File"
2. Edit: `prisma/seed.ts`
3. Run: `npm run db:seed`
4. Commit: `git add prisma/seed.ts` (optional)

### **I want to deploy to production**
1. Run: `npx prisma migrate deploy` (runs pending migrations)
2. Run: `npm run db:seed` (populates reference data)

### **I want to understand my database schema**
1. Visual browser: `npx prisma studio` (opens browser UI)
2. SQL schema: see `prisma/migrations/0_init/migration.sql`
3. Type definitions: see `prisma/generated/models/`

### **I want to reset my local database**
```bash
docker-compose down
docker-compose up
npx prisma migrate deploy
npm run db:seed
```

---

## 📊 Three-Tier System at a Glance

```
Migration SQL        → Schema + Permissions (runs once on DB)
Seed Script (TS)     → Initial reference data (you control)
Application Code     → Uses Prisma Client to query
```

---

## 🚀 Quick Commands

| What I Want | Command |
|---|---|
| Create new migration | `npx prisma migrate dev --name "xyz"` |
| Run migrations | `npx prisma migrate deploy` |
| Seed reference data | `npm run db:seed` |
| Check migration status | `npx prisma migrate status` |
| Browse database visually | `npx prisma studio` |
| Regenerate types | `npx prisma generate` |
| Check schema syntax | `npx prisma validate` |

---

## ❓ FAQs

**Q: Should I edit migration.sql manually?**
A: No! Prisma generates it. Just edit `schema.prisma` and run `npx prisma migrate dev`.

**Q: Can I delete old migrations?**
A: No. They're like Git commits. Keep them forever.

**Q: Where does the seed data come from?**
A: From `prisma/seed.ts`. You write the INSERT logic there.

**Q: What if I make a migration mistake?**
A: [prisma-implementation-guide.md](./prisma-implementation-guide.md) → "Troubleshooting"

**Q: Do I need the raw SQL files in src/database/migrations/?**
A: Not anymore! They're replaced by Prisma migrations. You can delete eventually.

---

## 📞 Still Confused?

1. Check [prisma-guide.md](./prisma-guide.md) for concepts
2. Check [prisma-implementation-guide.md](./prisma-implementation-guide.md) for practical steps
3. Run `npx prisma studio` to see your actual data
4. Search the Prisma docs: https://www.prisma.io/docs/

---

**Last Updated**: March 14, 2026

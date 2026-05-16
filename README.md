# gestion-del-fin-api

Secure API for **Gestión del fin** (EIF209). Handles multi-camp management, resources, AI-driven ingress decisions, and audit logs. Features server-side time consistency, RBAC, 20min session security, and support for resource transfers and expeditions. Built with Node.js and TypeScript. Universidad Nacional 2026.

# Database

This project uses **PostgreSQL** via [Supabase](https://supabase.com) in production, and a local PostgreSQL instance (via Docker Compose) for development.

### Environment variables

Copy `.env.example` and fill in the values:

```bash
cp .env.example .env
```

For **local development**, set the database URLs to your local PostgreSQL instance:

```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/gestion_del_fin"
DATABASE_DIRECT_URL="postgresql://postgres:secret@localhost:5432/gestion_del_fin"
```

For **production (Supabase)**, use the connection strings from your Supabase project dashboard under Project Settings → Database → Connection string:

```env
DATABASE_URL="postgresql://postgres.xxx:password@aws-x-xx.pooler.supabase.com:5432/postgres"
DATABASE_DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

### Migrations

To apply migrations to the **local** database:

```bash
npx prisma migrate dev
```

To apply migrations to **Supabase** (production):

```bash
npx prisma migrate deploy
```

> Migrations are applied automatically on deploy via Railway.

### Seed

To populate the database with initial data:

```bash
npx prisma db seed
```

---

## Development Setup

This project can be run using either **manual Node setup** (recommended) or **Nix**.

> **Before committing:** format all files with Prettier:
>
> ```bash
> npm run format
> ```

### Option 1: Manual (Node.js)

1. Ensure Node 20+ is installed:

   ```bash
   node --version
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file (use `.env.example` if available) and configure your database connection.

4. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

5. Apply migrations to keep the database schema in sync:

   ```bash
   npx prisma migrate dev
   ```

6. (Optional) Seed the database (recommended after migrations):

   ```bash
   npx prisma db seed
   ```

7. Start the dev server:

   ```bash
   npm run dev
   ```

### Option 2: Nix

1. Enter the development shell:

   ```bash
   nix develop
   ```

2. If using direnv, allow it:

   ```bash
   direnv allow
   ```

3. Install dependencies (if needed):

   ```bash
   npm install
   ```

4. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

5. Apply migrations to keep the database schema in sync:

   ```bash
   npx prisma migrate dev
   ```

6. (Optional) Seed the database (recommended after migrations):

   ```bash
   npx prisma db seed
   ```

7. Start the dev server:

   ```bash
   npm run dev
   ```

> **Before committing:** format all files with Prettier:
>
> ```bash
> npm run format
> ```

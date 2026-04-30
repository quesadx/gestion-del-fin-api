# gestion-del-fin

Turbo monorepo for **Gestión del fin** (EIF209). Includes a Node/Express backend API and a React + Vite frontend for CRUD workflows. Universidad Nacional 2026.

## Monorepo Layout

- apps/backend: Express + Prisma API
- apps/frontend: React + Vite CRUD UI
- docker, docs, backup: shared resources

## Development Setup

This project can be run using either **manual Node setup** or **Nix**.

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

2. Install dependencies at the repo root:

   ```bash
   npm install
   ```

3. Create backend environment file:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

4. Generate the Prisma client:

   ```bash
   cd apps/backend
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

7. Start the monorepo dev servers from the root:

   ```bash
   cd ../..
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

4. Generate the Prisma client and run migrations in apps/backend (same as above).

### Useful Commands

- Run both apps: `npm run dev`
- Run only backend: `npm run dev -- --filter=gestion-del-fin-api`
- Run only frontend: `npm run dev -- --filter=gestion-del-fin-frontend`
- Build all: `npm run build`
- Backend tests: `npm run test -- --filter=gestion-del-fin-api`

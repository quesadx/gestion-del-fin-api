# gestion-del-fin-api

Secure API for **Gestión del fin** (EIF209). Handles multi-camp management, resources, AI-driven ingress decisions, and audit logs. Features server-side time consistency, RBAC, 20min session security, and support for resource transfers and expeditions. Built with Node.js and TypeScript. Universidad Nacional 2026.

## Development Setup

This project can be run using either **manual Node setup** (recommended) or **Nix**.

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

6. Start the dev server:

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

3. Install dependencies (if needed) and run:

   ```bash
   npm install
   npm run dev
   ```

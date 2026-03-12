# gestion-del-fin-api

Secure API for **Gestión del fin** (EIF209). Handles multi-camp management, resources, AI-driven ingress decisions, and audit logs. Features server-side time consistency, RBAC, 20min session security, and support for resource transfers and expeditions. Built with Node.js and TypeScript. Universidad Nacional 2026.

## Development Setup

You can set up the project using **Nix** or **manually** with Node.js 20+.

### Option 1: Nix

1. Enter the development shell:

   ```bash
   nix develop

   ```

2. If using direnv, allow it:

   ```bash
   direnv allow
   ```

3. Install dependencies and start the server:

   ```bash
   npm install
   npm run dev
   ```

### Option 2: Manual Setup

1. Check your Node version:

   ```bash
   node --version
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm run dev
   ```

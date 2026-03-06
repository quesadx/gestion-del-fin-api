# gestion-del-fin-api
Secure API for 'Gestión del fin' (EIF209). Handles multi-camp management, resource logic, and AI-driven ingress decisions with explainable audit logs. Enforces server-side time consistency, RBAC, and 20min session security. Supports resource transfers &amp; expeditions. Node.js/TypeScript. Universidad Nacional 2026.

```markdown
# Development Setup

This project supports two setup methods. Choose the one that fits your environment.

## Option 1: Nix
Requires Nix package manager with Flakes enabled.

1. Enter the development shell:
   ```bash
   nix develop
   ```
2. If using direnv, allow the configuration:
   ```bash
   direnv allow
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

## Option 2: Manual Setup
Requires Node.js version 20.x or higher.

1. Verify your Node version:
   ```bash
   node --version
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
```

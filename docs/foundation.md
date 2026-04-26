# TypeScript Configuration for the API

## Introduction

For the backend development of the **Gestión del Fin** project, **TypeScript** was selected instead of plain JavaScript. TypeScript extends JavaScript by adding **static typing**, which helps detect errors earlier during development and improves code maintainability as the project grows.

The behavior of the TypeScript compiler is configured through the `tsconfig.json` file. This file defines **how `.ts` files are compiled into JavaScript that can be executed by Node.js**.

The general workflow is the following:

```
TypeScript source code (.ts)
        ↓
Compilation with TypeScript
        ↓
JavaScript output in /dist
        ↓
Node.js executes the server
```

This allows the project to benefit from TypeScript’s development features while still running standard JavaScript in the execution environment.

---

# The `tsconfig.json` File

The `tsconfig.json` file contains the configuration options that control how TypeScript compiles the project.

Below is an explanation of the most relevant options used in this configuration.

---

# compilerOptions

The `compilerOptions` section defines how the TypeScript compiler processes the project files.

## target

```
"target": "ES2022"
```

This option specifies the version of JavaScript that will be generated after compilation.

In this project **ES2022** is used, which allows modern JavaScript features such as:

- modern classes
- `async / await`
- improved array and object utilities

Since modern versions of Node.js support ES2022, there is no need to transpile to older JavaScript versions.

---

## module

```
"module": "Node16"
```

This option determines the module system used in the project.

With this configuration the project uses the modern Node.js module system, allowing imports such as:

```
import express from "express"
```

instead of the older `require()` syntax.

---

## moduleResolution

```
"moduleResolution": "node16"
```

This option defines how TypeScript resolves modules when using `import` statements.

With this configuration TypeScript follows the same resolution strategy used by Node.js, meaning it searches dependencies inside directories such as:

```
node_modules/
```

---

## rootDir

```
"rootDir": "src"
```

This option defines the directory containing the **main source code of the project**.

In this case, all backend source code is stored in:

```
src/
```

This structure helps separate different parts of the project:

```
src   → source code
dist  → compiled code
tests → automated tests
```

---

## outDir

```
"outDir": "dist"
```

This option defines the directory where the compiled JavaScript files will be placed.

When the build command is executed:

```
npm run build
```

TypeScript converts `.ts` files into `.js` files and stores them in:

```
dist/
```

For example:

```
src/index.ts
↓
dist/index.js
```

---

## strict

```
"strict": true
```

This option enables **TypeScript's strict type-checking mode**, which activates a set of advanced type validation rules.

Strict mode helps:

- prevent common programming errors
- improve code quality
- enforce better type safety

For example, it requires variables and function parameters to have properly defined types.

---

## esModuleInterop

```
"esModuleInterop": true
```

This option improves compatibility with many existing Node.js libraries.

It allows the project to use imports like:

```
import express from "express"
```

instead of the more verbose form:

```
import * as express from "express"
```

---

## allowSyntheticDefaultImports

```
"allowSyntheticDefaultImports": true
```

This option allows default imports from modules that may not actually define a default export.

It improves compatibility with some external libraries that were originally designed for CommonJS.

---

## resolveJsonModule

```
"resolveJsonModule": true
```

This option allows JSON files to be imported directly in TypeScript.

For example:

```
import config from "./config.json"
```

This can be useful for configuration files or static data used within the application.

---

## types

```
"types": ["node", "jest"]
```

This option defines which global type definitions are available in the project.

In this configuration the following types are included:

- **node** → type definitions for Node.js
- **jest** → type definitions for automated tests

This allows the editor and compiler to recognize testing functions such as:

```
describe()
it()
expect()
```

when writing test files.

---

## sourceMap

```
"sourceMap": true
```

This option generates `.map` files that link the compiled JavaScript code with the original TypeScript source files.

Source maps are useful for debugging because errors can be traced back to the original `.ts` files instead of the compiled `.js` files.

---

## skipLibCheck

```
"skipLibCheck": true
```

This option tells TypeScript to skip type checking inside dependencies located in `node_modules`.

Skipping this step speeds up compilation without affecting the correctness of the application code.

---

## forceConsistentCasingInFileNames

```
"forceConsistentCasingInFileNames": true
```

This option ensures that file imports always use the correct combination of uppercase and lowercase characters.

This prevents issues when the project runs on different operating systems that treat file names differently.

---

# include

```
"include": [
  "src"
]
```

This option specifies which directories should be included in the compilation process.

In this project, only the backend source code located in:

```
src/
```

is compiled.

---

# exclude

```
"exclude": [
  "node_modules",
  "dist",
  "tests"
]
```

This option defines which directories should be excluded from the compilation process.

The following directories are excluded:

- `node_modules` → external dependencies
- `dist` → already compiled files
- `tests` → automated test files

Tests are executed using testing tools and do not need to be compiled as part of the main build.

---

# Main Commands

The following commands are used to work with TypeScript in this project.

## Compile the project

```
npm run build
```

This command runs the TypeScript compiler and generates JavaScript files in the `dist` directory.

---

## Run the compiled server

```
node dist/index.js
```

This command starts the backend server using the compiled JavaScript code.

---

# Conclusion

The TypeScript configuration used in this project provides a solid foundation for backend development by:

- enabling static typing
- improving early error detection
- maintaining a clear separation between source and compiled code
- supporting scalable project architecture

This configuration will serve as the base for implementing the API of the **Gestión del Fin** system, including routes, controllers, services, and automated tests.

**Code Quality and Linting Setup**

This part of document explains the setup of ESLint, Prettier, and CSpell in the Gestión del fin API project, describing what each tool does, how it works, and how it is configured.

1. ESLint

Purpose:
ESLint is used to enforce coding standards, detect potential errors, and ensure TypeScript code quality.

Configuration:

File: eslint.config.js (ES Module syntax)

Ignores: dist/** and node_modules/**

Plugins used:

@typescript-eslint → for TypeScript-specific rules

prettier → integrates Prettier formatting rules into ESLint

Rules:

"prettier/prettier": "error" → ensures code formatting complies with Prettier

Usage:

npm run lint # checks for code issues
npm run lint:fix # automatically fixes some problems

Notes:

ESLint v10 requires the configuration file to be eslint.config.js instead of .eslintrc.json.

The project uses ESM modules, so "type": "module" is set in package.json to avoid Node warnings.

2. Prettier

Purpose:
Prettier is a code formatter that automatically applies consistent code style rules across the project.

Configuration:

File: .prettierrc (or defaults if not present)

Integrated with ESLint using eslint-plugin-prettier and eslint-config-prettier

Usage:

npm run format # formats all source files

Notes:

Prettier ensures all .ts and .js files follow consistent indentation, spacing, and semicolons.

Files in dist/ and node_modules/ are ignored.

3. CSpell

Purpose:
CSpell is a spell checker for source code, comments, and strings. It helps maintain correct spelling in variable names, comments, and documentation.

Configuration:

File: cspell.json

Custom dictionary can include project-specific terms (e.g., gestion, campamento, zombie)

Usage:

npm run spell # checks for spelling errors in source files

Example output:

src/index.ts:19:24 - Unknown word (gestion)

Add unknown words to cspell.json to avoid false positives.

4. Project Integration

Scripts in package.json:

{
"lint": "eslint src --ext .ts",
"lint:fix": "eslint src --ext .ts --fix",
"format": "prettier --write .",
"spell": "cspell \"src/_/_.ts\""
}

Workflow for developers:

Write or update TypeScript code.

Run ESLint to check for coding issues:

npm run lint

Apply Prettier formatting automatically:

npm run format

Check spelling in code and comments:

npm run spell

Commit and push only clean, formatted, and spell-checked code.

5. Summary

ESLint ensures code quality and correctness.

Prettier enforces consistent style and formatting.

CSpell checks spelling in code and documentation.

"type": "module" in package.json ensures Node interprets ESM correctly, avoiding warnings with ESLint.

With this setup, the project maintains high code quality, readable formatting, and accurate spelling across all TypeScript files.

**Database Configuration and Connection**

This project connects to a MariaDB database using the official Node.js driver mariadb.
The configuration is managed through environment variables to ensure flexibility between development and production environments.

The application uses dotenv to load environment variables from a .env file during local development.

Environment Variables

Database configuration is defined using environment variables.

These variables are automatically loaded into process.env when the application starts.

Example:

process.env.DB_HOST
process.env.DB_USER

This approach ensures that sensitive information such as database credentials is not hardcoded into the source code.

Database Configuration (db.config.ts)

The file:

src/config/db.config.ts

is responsible for reading the environment variables and exporting a configuration object used by the database connection.

Example:

import dotenv from "dotenv";

dotenv.config();

export const dbConfig = {
host: process.env.DB_HOST,
port: Number(process.env.DB_PORT),
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
connectionLimit: 5
};
Purpose

This file centralizes database configuration so that connection details are defined in one place.

Database Connection (connection.ts)

The file:

src/database/connection.ts

creates a connection pool using the MariaDB driver.

Example:

import \* as mariadb from "mariadb";
import { dbConfig } from "../config/db.config.js";

export const pool = mariadb.createPool(dbConfig);
Connection Pool

A connection pool allows the application to reuse existing database connections instead of opening a new one for every query.

Benefits:

improved performance

reduced connection overhead

better scalability

Query Utility

A helper function is implemented to simplify database queries.

Example:

export const query = async (sql: string, params?: unknown[]) => {
let conn;

try {
conn = await pool.getConnection();
const result = await conn.query(sql, params);
return result;
} finally {
if (conn) conn.release();
}
};
Purpose

This utility function:

retrieves a connection from the pool

executes a SQL query

returns the result

releases the connection back to the pool

This prevents connection leaks and centralizes database access logic.

Database Connection Test

A test function was added to verify that the application can connect to the database when the server starts.

Example:

export const testConnection = async () => {
try {
const conn = await pool.getConnection();
console.log("Database connected successfully");
conn.release();
} catch (error) {
console.error("Database connection failed:", error);
}
};

Startup Flow
Application starts
↓
Environment variables loaded
↓
Database connection tested
↓
Express server starts
Docker Database Integration

The database runs inside a container managed by Docker Compose.

Example service:

services:
db:
image: mariadb:latest
container_name: gestion-del-fin-db
environment:
MYSQL_ROOT_PASSWORD: admin
MYSQL_DATABASE: gestion-del-fin-db
MYSQL_USER: admin
MYSQL_PASSWORD: admin
ports: - "3306:3306"

This allows the API to connect to a local database instance during development.

Development Workflow

Typical development flow:

1 Start database container
docker compose up -d

2 Start the backend
npm run dev

3 Application tests database connection

4 API becomes available
Production Considerations

In production environments:

.env files are usually not used

environment variables are provided by the hosting platform

database credentials should be managed securely

The application code remains unchanged because it reads configuration from process.env.

Architecture Summary
.env
↓
dotenv
↓
process.env
↓
db.config.ts
↓
connection.ts
↓
MariaDB

This structure ensures a clean separation between:

configuration

database connection

application logic.

# Gestión del Fin API – Seed Script Documentation

## 1. Purpose

The seed script is used to **populate the database with test data** for development and functional testing. This includes users, roles, camps, professions, and other essential data for the application's workflow.

## 2. Location

Main file:

```
src/database/seeds/seed.ts
```

- Located inside `src/database/seeds/`.
- Executed **after compiling TypeScript** (compiled file in `dist/database/seeds/seed.js`).

## 3. Usage

1. **Compile TypeScript**:

```bash
npm run build
```

2. **Run the seed script**:

```bash
npm run seed
```

- The script uses a **MariaDB connection pool**.
- Inserts initial data into tables like `roles`, `camps`, `users`, `professions`, etc.
- Designed to **respect referential integrity** (foreign keys).

## 4. Seed Script Structure

- `src/database/seeds/seed.ts` imports the database pool:

```ts
import { pool, query } from '../db.js';
```

- Contains functions to insert data into each table:

```ts
async function seedRoles() { ... }
async function seedCamps() { ... }
async function seedUsers() { ... }
```

- `main()` executes all functions sequentially and handles errors:

```ts
async function main() {
  try {
    await seedRoles();
    await seedCamps();
    await seedUsers();
    console.log('Seed data inserted successfully');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    pool.end();
  }
}

main();
```

## 5. Considerations

- The script **uses `await`** to ensure each insertion completes before the next.
- Relationship IDs (`role_id`, `camp_id`) are obtained dynamically or hardcoded as needed.
- For development testing, it is safe to run the seed multiple times, although tables may need to be cleared first to avoid duplicate entries.

## 6. Testing

1.0

```bash
docker exec -it gestion-del-fin-db mariadb -u admin -p
```

1. Run the seed script:

```bash
npm run seed
```

2. use terminal, dbeaver or your're db manager to verify, in terminal is:

```bash
docker ps
```

3. write the password

4. Show all DB in mariadb

```bash
 SHOW DATABASES;
 USE gestion_del_fin;
```

5. Do some query

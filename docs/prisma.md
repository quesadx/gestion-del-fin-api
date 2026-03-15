# Running the Project for the First Time

This guide outlines the technical steps needed to bootstrap the project, explicitly addressing resources excluded by `.gitignore` (e.g., `node_modules`, `.env`, and Prisma auto-generated files).

### 1. Install Dependencies
```bash
npm install
```
*Populates the ignored `node_modules/` directory.*

### 2. Configure Environment Variables
Create a `.env` file in the root directory (ignored by version control) and populate the necessary environment constants.
```env
# Database connection matching docker-compose.yml configuration
DATABASE_URL="mysql://root:admin@localhost:3306/gestion_del_fin"
# Set other application-specific variables (e.g., JWT_SECRET, PORT)
```

### 3. Start Database Infrastructure
Initialize the MariaDB container in detached mode:
```bash
docker-compose up -d
```

### 4. Execute Prisma Setup
Because `generated/prisma`, `prisma/generated/`, and `prisma/migrations.lock/` are ignored by git, you must manually generate the Prisma Client and align the database schema on fresh clones.
```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Development Server
Run the API in watch mode (configured to use `tsx watch src/index.ts`):
```bash
npm run dev
```
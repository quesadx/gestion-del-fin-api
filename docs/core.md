# Core Project Guide: Gestión del Fin API

## Project Overview

**Gestión del Fin** is a backend API for a zombie survival management system designed for a university course (EIF209, 2026). It manages multiple camps where survivors coordinate resources, explore dangerous areas, and make life-or-death decisions.

Think of it as a **management system for coordinating survival camps**: tracking who's alive, what resources each camp has, whether to accept new people fleeing danger, and scheduling routine tasks like food distribution.

---

## Technology Stack (The Tools We Use)

### Core Framework
- **Node.js 20+** - The JavaScript runtime that lets us run server code
- **Express.js 5.2.1** - The web framework that handles HTTP requests (when someone visits an endpoint)
- **TypeScript** - JavaScript with type safety (catches errors before they happen)

### Database
- **MariaDB** (MySQL-compatible) - Stores all persistent data
- **Docker Compose** - Runs the database in a containerized environment (isolated sandbox)

### Security & Auth
- **JWT (jsonwebtoken)** - Creates secure tokens so users don't have to log in every request
- **bcryptjs** - Hashes passwords securely (never stores plain passwords)
- **Helmet** - Adds security headers to HTTP responses
- **CORS** - Controls which domains can access our API

### Validation & Logging
- **Zod** - Validates that incoming data has the correct shape and types
- **Winston** - Logs application events and errors to console/files
- **node-cron** - Schedules tasks to run at specific times (like "every day at 6 AM")

### Testing
- **Jest** - Unit tests (testing individual functions)
- **Playwright** - End-to-end tests (testing full workflows)

### Development Tools
- **tsx** - Runs TypeScript directly without compilation (during development)
- **ESLint** - Checks code for style/logic errors
- **Prettier** - Auto-formats code to be consistent
- **Nix** - Alternative development environment setup (freezes dependencies precisely)

---

## Project File Structure

```
gestion-del-fin-api/
├── src/                          # All application source code
│   ├── index.ts                  # Application entry point (starts the server)
│   ├── config/                   # Configuration files
│   │   ├── app.config.ts         # General app settings
│   │   ├── auth.config.ts        # JWT secret, token expiry
│   │   └── db.config.ts          # Database connection details
│   ├── database/                 # Database logic
│   │   ├── connection.ts         # Opens/manages database connection
│   │   ├── seed.ts               # Fills database with initial data
│   │   └── migrations/
│   │       └── 01-gestion-del-fin-seed.sql  # Schema: tables, relationships
│   ├── modules/                  # API features (organized by domain)
│   │   ├── auth/                 # User login/registration
│   │   │   ├── auth.controller.ts     # Handles login/register requests
│   │   │   ├── auth.service.ts        # Business logic for auth
│   │   │   ├── auth.schema.ts         # Zod validation schemas
│   │   │   └── auth.routes.ts         # URL routes like POST /login
│   │   ├── camps/                # Camp management
│   │   ├── people/               # Survivor/player management
│   │   ├── resources/            # Items, supplies, inventory
│   │   ├── transfers/            # Moving resources between camps
│   │   └── explorations/         # Expeditions outside camps
│   ├── middlewares/              # Functions that process requests before handlers
│   │   ├── auth.middleware.ts    # Checks if user is logged in
│   │   ├── role.middleware.ts    # Checks if user has required role
│   │   ├── camp.middleware.ts    # Validates camp access
│   │   ├── session.middleware.ts # 20-minute inactivity timeout
│   │   └── error.middleware.ts   # Catches and formats errors
│   ├── jobs/                     # Automated background tasks
│   │   ├── scheduler.ts          # Cron job coordinator
│   │   ├── daily-rations.job.ts  # "Every day: distribute food"
│   │   └── resource-alerts.job.ts # "Alert if resources low"
│   ├── ai/                       # AI decision-making
│   │   ├── ai.types.ts           # Type definitions for AI models
│   │   ├── ingress-evaluator.ts  # "Should we accept this refugee?"
│   │   └── role-assigner.ts      # "What job suits this person?"
│   ├── logger/                   # Logging utilities
│   │   ├── logger.ts             # General logging
│   │   └── audit.logger.ts       # Tracks user actions (security audit)
│   └── shared/                   # Reusable code
│       ├── constants/
│       │   ├── roles.ts          # Role names (system_admin, worker, etc.)
│       │   └── camp-rules.ts     # Game rules (max people, resources, etc.)
│       ├── types/
│       │   └── index.ts          # Shared TypeScript types
│       └── utils/
│           ├── pagination.ts     # Format large result lists
│           └── server-time.ts    # Centralized game clock
├── tests/                        # Test files
│   ├── unit/                     # Test individual functions
│   │   ├── ai/
│   │   └── jobs/
│   └── e2e/                      # Test complete workflows
│       ├── auth.spec.ts          # Test login flow
│       ├── people.spec.ts        # Test person management
│       └── resources.spec.ts     # Test resource management
├── docker-compose.yml            # Database setup (docker)
├── jest.config.ts                # Jest testing configuration
├── flake.nix                      # Nix dev environment
├── package.json                  # Node dependencies and scripts
└── README.md                      # This project's setup guide
```

---

## How It Works: Request Flow

When someone calls an API endpoint, here's what happens:

```
1. HTTP Request arrives
   ↓
2. Express routes it to a CONTROLLER
   ↓
3. MIDDLEWARE checks:
   - Are you logged in? (auth.middleware)
   - Do you have the right role? (role.middleware)
   - Has it been 20+ minutes? (session.middleware → kick off)
   ↓
4. Controller calls SERVICE layer
   - SERVICE implements business logic
   - Calls DATABASE for data
   ↓
5. Response is built
   - Validated with ZOD schema
   - Logged with WINSTON
   ↓
6. HTTP Response sent back to client
```

**Example**: Creating a new resource
```
POST /resources
{
  "name": "Canned Food",
  "quantity": 50,
  "allocated_to_camp_id": 1
}
       ↓
[role.middleware] "Is this person a resource_manager?" → Yes
       ↓
[resources.controller] Call resourceService.createResource()
       ↓
[resources.service] Validate, insert into DB, return created resource
       ↓
[zod schema] Ensure response matches expected format
       ↓
Response: { id: 42, name: "Canned Food", ... }
```

---

## Core Concepts

### Camps
A physical location where survivors gather. Each camp has:
- Name and location
- Status (ACTIVE or ABANDONED)
- Members (people)
- Resources inventory
- Camp-specific rules

### People/Users
Survivors in the system. Each person has:
- Username and password (hashed)
- Assigned camp
- Role (defines permissions)
- Profession/specialty
- Activity status
- Last activity timestamp (for timeout)

### Roles
Define what users can do:
- `system_admin` - Full system control
- `resource_manager` - Manage inventory
- `travel_coordinator` - Organize expeditions
- `worker` - Regular survivor with limited permissions

### Resources
Physical items camps need to survive:
- Source (found, crafted, transferred)
- Quantity and type
- Which camp owns them
- Transfer history

### Transfers
Moving resources between camps (trade/aid)

### Explorations
Sending teams out from the camp (dangerous missions)

### AI Features
- **Ingress Evaluator**: Should we accept this refugee? (evaluate risk/benefit)
- **Role Assigner**: What profession suits this person? (based on skills/background)

---

## Database Schema Overview

### Core Tables

```sql
camps
├── id (primary key)
├── name (unique)
├── location
├── status (ACTIVE|ABANDONED)
└── created_at

roles
├── id (primary key)
├── name (unique: system_admin, worker, etc.)
└── description

users (survivors)
├── id (primary key)
├── camp_id (foreign key → camps)
├── role_id (foreign key → roles)
├── username (unique)
├── password_hash (bcrypt)
├── is_active
├── last_activity (for timeout)
└── created_at

professions
├── id (primary key)
├── name (unique: scout, farmer, guard, engineer)
└── description

resources
├── id (primary key)
├── camp_id (foreign key → camps)
├── name
├── quantity
└── created_at

system_config (singleton)
├── id (always 1)
├── version
└── server_time (game clock)
```

---

## Development Workflow

### Run Local Development
```bash
# Option 1: Using Nix (reproducible environment)
nix develop
npm install
npm run dev

# Option 2: Manual (requires Node.js 20+)
npm install
npm run dev
```

### Build for Production
```bash
npm run build  # Compiles TypeScript → JavaScript
npm start      # Runs compiled version
```

### Check Code Quality
```bash
npm run lint       # Find style issues
npm run lint:fix   # Auto-fix them
npm run format     # Make consistent
npm run spell      # Check spelling
```

### Run Tests
```bash
npm test       # Unit tests
npm test:e2e   # End-to-end tests
```

### Database Setup
```bash
docker-compose up  # Starts MariaDB container
                   # Automatically runs migrations from src/database/migrations/
```

---

## Key Constraints & Features

- **Session Security**: Users are logged out after 20 minutes of inactivity
- **Role-Based Access Control**: Different endpoints require different roles
- **Server-Side Time**: Single game clock (`system_config.server_time`) keeps all camps synchronized
- **Audit Logging**: User actions logged for security/debugging
- **Scheduled Jobs**:
  - Daily ration distribution
  - Resource level alerts

---

## Current Status

⚠️ **This is an early-stage project** - many files are still TODO placeholders:
- Database connection logic
- Config file implementations
- Most module implementations (controllers, services, routes)
- Middleware logic
- AI evaluators
- Logging setup

The SQL schema and project structure are defined, but core business logic needs to be built out.

---

## For Beginners: Key Takeaways

1. **Structure**: Code is organized by feature (`/modules`) so you can find auth logic, resource logic, etc. in one place
2. **Layers**: Controllers handle requests, Services handle business logic, Database handles storage
3. **Security**: Passwords are hashed, users have roles, requests are validated
4. **Testing**: Write tests to ensure features work before deploying
5. **Database**: MariaDB stores everything; migrations define the schema
6. **Schedule**: Background jobs run automatically (e.g., feed people every day)
7. **AI**: Future feature that makes smart decisions (who to accept, what job people do)


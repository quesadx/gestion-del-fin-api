/**
 * Global setup for Playwright E2E tests.
 *
 * Runs once before all E2E spec files to prepare the test database:
 * 1. Truncate all tables (clean slate)
 * 2. Seed base entities (camps, roles, permissions, role_permissions, resources, professions)
 * 3. Create 6 test users with known passwords
 * 4. Seed sample data (inventory, people)
 * 5. Generate JWT tokens for all test roles
 * 6. Write tokens to tests/e2e/.auth/tokens.json
 */

import { prisma } from '../../src/lib/prisma';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { signAccessToken } from '../../src/shared/utils/jwt';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function globalSetup(): Promise<void> {
  // ─── Phase 1: Clean slate ────────────────────────────────────────────
  const tableNames = [
    'user_achievements',
    'achievements',
    'admission_requests',
    'camp_transfer_item',
    'camp_transfers',
    'expedition_allocated_resources',
    'expedition_found_resources',
    'expedition_members',
    'expeditions',
    'inventory_log',
    'inventory',
    'contribution_overrides',
    'profession_reassignment_log',
    'person_status_log',
    'persons',
    'professions_resources_amounts',
    'professions',
    'resource_type',
    'users',
    'role_permissions',
    'permissions',
    'roles',
    'camps',
    'system_config',
  ];

  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (err) {
      console.warn(`Could not truncate ${table}:`, (err as Error).message);
    }
  }
  console.log('Setup: database truncated');

  // ─── Phase 2: Seed base entities ──────────────────────────────────────

  // 2a. Camps
  const camp1 = await prisma.camps.create({
    data: {
      name: 'Alpha Outpost',
      location: 'Grid Sector 7',
      status: 'ACTIVE',
      ai_context_prompt:
        'Prioritize technical survival value, practical skills, and reliable health stability for long-term infrastructure resilience.',
    },
  });
  const camp2 = await prisma.camps.create({
    data: {
      name: 'Beta Sanctuary',
      location: 'Grid Sector 9',
      status: 'ACTIVE',
      ai_context_prompt:
        'Prioritize adaptability, team compatibility, and field mobility for scouting and rapid-response missions.',
    },
  });
  console.log('Setup: 2 camps created');

  // 2b. Roles
  const adminRole = await prisma.roles.create({
    data: { name: 'system_admin', description: 'Administrator with full access' },
  });
  const workerRole = await prisma.roles.create({
    data: { name: 'worker', description: 'General camp worker' },
  });
  const resourceMgrRole = await prisma.roles.create({
    data: { name: 'resource_manager', description: 'Manages camp resources' },
  });
  const travelCoordRole = await prisma.roles.create({
    data: { name: 'travel_coordinator', description: 'Coordinates expeditions' },
  });
  console.log('Setup: 4 roles created');

  // 2c. Permissions
  const permissionNames = Object.values(PERMISSIONS);
  for (const permName of permissionNames) {
    await prisma.permissions.create({ data: { name: permName } });
  }
  console.log(`Setup: ${permissionNames.length} permissions created`);

  // 2d. Role-permission mapping (full access for test simplicity)
  const allPerms = await prisma.permissions.findMany();
  for (const role of [adminRole, workerRole, resourceMgrRole, travelCoordRole]) {
    for (const perm of allPerms) {
      await prisma.role_permissions.create({
        data: { role_id: role.id, permission_id: perm.id },
      });
    }
  }
  console.log('Setup: role_permissions mapped');

  // 2e. Resource types
  const rations = await prisma.resource_type.create({
    data: {
      name: 'Standard Rations',
      unit: 'kg',
      daily_ration: '0.5',
      minimum_stock: '100',
      auto_daily: true,
    },
  });
  const water = await prisma.resource_type.create({
    data: {
      name: 'Purified Water',
      unit: 'Liters',
      daily_ration: '2',
      minimum_stock: '200',
      auto_daily: true,
    },
  });
  const antibiotics = await prisma.resource_type.create({
    data: {
      name: 'Antibiotics',
      unit: 'Doses',
      daily_ration: '0',
      minimum_stock: '50',
      auto_daily: false,
    },
  });
  console.log('Setup: 3 resource types created');

  // 2f. Professions
  const engineerProf = await prisma.professions.create({
    data: { name: 'Engineer', description: 'Builds and maintains infrastructure' },
  });
  const scoutProf = await prisma.professions.create({
    data: { name: 'Scout', description: 'Explores and gathers intelligence' },
  });
  console.log('Setup: 2 professions created');

  // ─── Phase 3: Create test users ───────────────────────────────────────
  const passwordHash = await bcrypt.hash('test-password-123', 4);

  const USERS_TO_SEED = [
    { username: 'admin_master', role: adminRole, camp: camp1, isAdmin: true },
    { username: 'admin_user_2', role: adminRole, camp: camp2, isAdmin: true },
    { username: 'worker_user_1', role: workerRole, camp: camp1, isAdmin: false },
    { username: 'worker_user_2', role: workerRole, camp: camp2, isAdmin: false },
    { username: 'resource_mgr_1', role: resourceMgrRole, camp: camp1, isAdmin: false },
    { username: 'travel_coord_1', role: travelCoordRole, camp: camp1, isAdmin: false },
  ];

  const createdUsers: Record<
    string,
    { id: number; campId: number; role: string; sessionVersion: number; isAdmin: boolean }
  > = {};

  const now = new Date();
  for (const u of USERS_TO_SEED) {
    const user = await prisma.users.create({
      data: {
        username: u.username,
        password_hash: passwordHash,
        camp_id: u.camp.id,
        role_id: u.role.id,
        session_version: 1,
        is_active: true,
        last_activity: now,
      },
    });
    createdUsers[u.username] = {
      id: user.id,
      campId: u.camp.id,
      role: u.role.name,
      sessionVersion: user.session_version,
      isAdmin: u.isAdmin,
    };
  }
  console.log('Setup: 6 test users created');

  // ─── Phase 4: Seed sample data ────────────────────────────────────────

  // Inventory entries for each camp+resource combo
  for (const camp of [camp1, camp2]) {
    for (const resource of [rations, water, antibiotics]) {
      await prisma.inventory.create({
        data: {
          camp_id: camp.id,
          resource_type_id: resource.id,
          quantity: 1000,
        },
      });
    }
  }
  console.log('Setup: inventory entries created');

  // 2 people per camp
  for (const camp of [camp1, camp2]) {
    await prisma.persons.create({
      data: {
        camp_id: camp.id,
        full_name: `Test Person ${camp.name} A`,
        profession_id: engineerProf.id,
        status: 'HEALTHY',
      },
    });
    await prisma.persons.create({
      data: {
        camp_id: camp.id,
        full_name: `Test Person ${camp.name} B`,
        profession_id: scoutProf.id,
        status: 'HEALTHY',
      },
    });
  }
  console.log('Setup: 4 people created');

  // ─── Phase 5: Generate JWT tokens ─────────────────────────────────────
  const tokens: Record<string, string> = {};
  const tokenMap: Record<string, string> = {
    admin_camp1: 'admin_master',
    admin_camp2: 'admin_user_2',
    worker_camp1: 'worker_user_1',
    worker_camp2: 'worker_user_2',
    resource_mgr_camp1: 'resource_mgr_1',
    travel_coord_camp1: 'travel_coord_1',
  };

  for (const [tokenKey, username] of Object.entries(tokenMap)) {
    const user = createdUsers[username];
    tokens[tokenKey] = signAccessToken(
      user.id,
      user.campId,
      user.role,
      user.sessionVersion,
      user.isAdmin,
    );
  }

  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  fs.writeFileSync(path.join(authDir, 'tokens.json'), JSON.stringify(tokens, null, 2));
  console.log(`Setup complete: ${Object.keys(tokens).length} tokens generated`);
}

export default globalSetup;

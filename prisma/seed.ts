/**
 * Database Seed Script
 * 
 * This file contains ONLY the initial data that should be populated
 * after the schema is created. It's manual and controlled by you.
 * 
 * Usage:
 *   npx prisma db seed
 * 
 * What goes here:
 * - Reference data (roles, professions, resource types)
 * - Initial camps
 * - Test/demo users
 * NOT schema changes (those go in migrations)
 * NOT production data from 02-gestion-del-fin-data.sql yet
 */

import { PrismaClient } from './generated/client.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  try {
    // ============================================================
    // Step 1: Create Roles (Reference Data)
    // ============================================================
    console.log('Seeding roles...');
    const systemAdminRole = await prisma.roles.upsert({
      where: { name: 'system_admin' },
      update: {},
      create: {
        name: 'system_admin',
        description: 'Full system access',
      },
    });

    const resourceManagerRole = await prisma.roles.upsert({
      where: { name: 'resource_manager' },
      update: {},
      create: {
        name: 'resource_manager',
        description: 'Manages camp resources',
      },
    });

    const travelCoordinatorRole = await prisma.roles.upsert({
      where: { name: 'travel_coordinator' },
      update: {},
      create: {
        name: 'travel_coordinator',
        description: 'Coordinates expeditions and transfers',
      },
    });

    const workerRole = await prisma.roles.upsert({
      where: { name: 'worker' },
      update: {},
      create: {
        name: 'worker',
        description: 'Regular worker',
      },
    });

    console.log('Roles created:', [
      systemAdminRole.name,
      resourceManagerRole.name,
      travelCoordinatorRole.name,
      workerRole.name,
    ]);

    // ============================================================
    // Step 2: Create Professions (Reference Data)
    // ============================================================
    console.log('Seeding professions...');

    const professions = await Promise.all([
      prisma.professions.upsert({
        where: { name: 'scout' },
        update: {},
        create: {
          name: 'scout',
          description: 'Expedition and reconnaissance',
        },
      }),
      prisma.professions.upsert({
        where: { name: 'farmer' },
        update: {},
        create: {
          name: 'farmer',
          description: 'Agriculture and food production',
        },
      }),
      prisma.professions.upsert({
        where: { name: 'guard' },
        update: {},
        create: {
          name: 'guard',
          description: 'Camp security',
        },
      }),
      prisma.professions.upsert({
        where: { name: 'engineer' },
        update: {},
        create: {
          name: 'engineer',
          description: 'Construction and infrastructure',
        },
      }),
    ]);

    console.log('Professions created:', professions.map((p) => p.name));

    // ============================================================
    // Step 3: Create Resource Types (Reference Data)
    // ============================================================
    console.log('Seeding resource types...');

    const resourceTypes = await Promise.all([
      prisma.resource_type.upsert({
        where: { name: 'food' },
        update: {},
        create: {
          name: 'food',
          unit: 'kg',
          daily_ration: 0.5,
          minimum_stock: 100,
          auto_daily: 1,
        },
      }),
      prisma.resource_type.upsert({
        where: { name: 'water' },
        update: {},
        create: {
          name: 'water',
          unit: 'liters',
          daily_ration: 2.0,
          minimum_stock: 200,
          auto_daily: 1,
        },
      }),
      prisma.resource_type.upsert({
        where: { name: 'medicine' },
        update: {},
        create: {
          name: 'medicine',
          unit: 'units',
          daily_ration: 0.1,
          minimum_stock: 50,
          auto_daily: 0,
        },
      }),
    ]);

    console.log('Resource types created:', resourceTypes.map((r) => r.name));

    // ============================================================
    // Step 4: Create Initial Camp
    // ============================================================
    console.log('Seeding camps...');
    const camp = await prisma.camps.upsert({
      where: { name: 'Base Camp Alpha' },
      update: {},
      create: {
        name: 'Base Camp Alpha',
        location: 'Mountain Valley',
        status: 'ACTIVE',
      },
    });

    console.log('Camp created:', camp.name);

    // ============================================================
    // Step 5: Create System Admin User (For Testing)
    // ============================================================
    console.log('Seeding admin user...');
    // NOTE: In production, use hashed password
    const adminUser = await prisma.users.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password_hash: '$2a$10$...(use bcrypt to hash password)', // Placeholder
        camp_id: camp.id,
        role_id: systemAdminRole.id,
        is_active: 1,
      },
    });

    console.log('Admin user created:', adminUser.username);

    // ============================================================
    // Step 6: Create system_config singleton
    // ============================================================
    console.log('Seeding system config...');
    const config = await prisma.system_config.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        version: '1.0.0',
        server_time: new Date(),
      },
    });

    console.log('System config created');

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

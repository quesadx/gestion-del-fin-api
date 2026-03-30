import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Starting database seed...');

  // To deeply avoid issues with foreign keys during the clean phase
  // we execute raw SQL to disable checks.
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

  console.log('Cleaning existing data...');
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
    'roles',
    'camps',
    'system_config',
    'Post',
    'User',
  ];

  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1;`);
    } catch (err) {
      console.warn(`Could not clean table ${table} (maybe it doesn't exist)`);
    }
  }

  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
  console.log('Database cleaned.');

  // Seed base entities
  console.log('Seeding base entities...');
  const mainCamp = await prisma.camps.create({
    data: {
      name: 'Alpha Outpost',
      location: 'Grid Sector 7',
      status: 'ACTIVE',
      ai_context_prompt:
        'Prioritize technical survival value, practical skills, and reliable health stability for long-term infrastructure resilience.',
    },
  });

  const secondaryCamp = await prisma.camps.create({
    data: {
      name: 'Beta Sanctuary',
      location: 'Grid Sector 9',
      status: 'ACTIVE',
      ai_context_prompt:
        'Prioritize adaptability, team compatibility, and field mobility for scouting and rapid-response missions.',
    },
  });

  const adminRole = await prisma.roles.create({
    data: {
      name: 'ADMIN',
      description: 'Administrator with full access',
    },
  });

  const standardRole = await prisma.roles.create({
    data: {
      name: 'CAMP_MANAGER',
      description: 'Manager for a specific camp',
    },
  });

  const engineerProfession = await prisma.professions.create({
    data: {
      name: 'Engineer',
      description: 'Technical systems specialist',
    },
  });

  const scoutProfession = await prisma.professions.create({
    data: {
      name: 'Scout',
      description: 'Exploration and intelligence',
    },
  });

  const rationsResource = await prisma.resource_type.create({
    data: {
      name: 'Standard Rations',
      unit: 'kg',
      daily_ration: '1.5',
      minimum_stock: '500',
      auto_daily: true,
    },
  });

  const waterResource = await prisma.resource_type.create({
    data: {
      name: 'Purified Water',
      unit: 'Liters',
      daily_ration: '2.0',
      minimum_stock: '1000',
      auto_daily: true,
    },
  });

  const medsResource = await prisma.resource_type.create({
    data: {
      name: 'Antibiotics',
      unit: 'Doses',
      daily_ration: '0',
      minimum_stock: '50',
      auto_daily: false,
    },
  });

  // Seed dependent entities
  console.log('Seeding dependent entities...');
  const adminUser = await prisma.users.create({
    data: {
      camp_id: mainCamp.id,
      role_id: adminRole.id,
      username: 'admin_master',
      password_hash: '$2b$10$EP03SokPxyW1sJ1vPxU/UekQv1r.tH4iKIfwXbY810T84QxXZX9dK', // bcrypt hash for 'password'
      is_active: true,
    },
  });

  const standardUser = await prisma.users.create({
    data: {
      camp_id: secondaryCamp.id,
      role_id: standardRole.id,
      username: 'camp_manager',
      password_hash: '$2b$10$EP03SokPxyW1sJ1vPxU/UekQv1r.tH4iKIfwXbY810T84QxXZX9dK', // bcrypt hash for 'password'
      is_active: true,
    },
  });

  const primaryPerson = await prisma.persons.create({
    data: {
      camp_id: mainCamp.id,
      profession_id: engineerProfession.id,
      identification_code: 'ENG-001',
      full_name: 'John Doe',
      age: 35,
      blood_type: 'A+',
      skills_summary: 'Systems repair, networking',
      status: 'HEALTHY',
    },
  });

  const secondaryPerson = await prisma.persons.create({
    data: {
      camp_id: secondaryCamp.id,
      profession_id: scoutProfession.id,
      identification_code: 'SCT-001',
      full_name: 'Sarah Connor',
      age: 28,
      blood_type: 'O-',
      skills_summary: 'Reconnaissance, survival',
      status: 'HEALTHY',
    },
  });

  // Seed inventories for main camp
  await prisma.inventory.createMany({
    data: [
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        quantity: '1200.0',
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        quantity: '2500.0',
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
        quantity: '200.0',
      },
    ],
  });

  // Seed inventories for secondary camp
  await prisma.inventory.createMany({
    data: [
      {
        camp_id: secondaryCamp.id,
        resource_type_id: rationsResource.id,
        quantity: '300.0',
      },
      {
        camp_id: secondaryCamp.id,
        resource_type_id: waterResource.id,
        quantity: '600.0',
      },
    ],
  });

  await prisma.system_config.create({
    data: {
      id: 1,
      version: '1.0.0',
      server_time: new Date(),
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Graceful disconnect leveraging the initialized adapter in "src/lib/prisma.ts"
    await prisma.$disconnect();
  });

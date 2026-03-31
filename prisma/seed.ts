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

  const tertiaryPerson = await prisma.persons.create({
    data: {
      camp_id: mainCamp.id,
      profession_id: scoutProfession.id,
      identification_code: 'SCT-002',
      full_name: 'Maya Rivers',
      age: 31,
      blood_type: 'B+',
      skills_summary: 'Field recon and route planning',
      status: 'HEALTHY',
    },
  });

  const quaternaryPerson = await prisma.persons.create({
    data: {
      camp_id: mainCamp.id,
      profession_id: engineerProfession.id,
      identification_code: 'ENG-002',
      full_name: 'Elias Ward',
      age: 40,
      blood_type: 'AB+',
      skills_summary: 'Power systems and diagnostics',
      status: 'HEALTHY',
    },
  });

  const quinaryPerson = await prisma.persons.create({
    data: {
      camp_id: mainCamp.id,
      profession_id: scoutProfession.id,
      identification_code: 'SCT-003',
      full_name: 'Nora Pike',
      age: 26,
      blood_type: 'O+',
      skills_summary: 'Trail tracking and stealth',
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

  // Seed expeditions module data
  console.log('Seeding expeditions data...');

  const plannedExpedition = await prisma.expeditions.create({
    data: {
      camp_id: mainCamp.id,
      destination: 'North Relay Ruins',
      status: 'PLANNED',
      created_by: adminUser.id,
      departure_date: new Date('2026-04-05'),
      expected_return_date: new Date('2026-04-07'),
      max_return_date: new Date('2026-04-08'),
      notes: 'Recon + light scavenging run',
    },
  });

  const ongoingExpedition = await prisma.expeditions.create({
    data: {
      camp_id: mainCamp.id,
      destination: 'Old Hospital Block',
      status: 'ONGOING',
      created_by: adminUser.id,
      departure_date: new Date('2026-03-28'),
      expected_return_date: new Date('2026-03-31'),
      max_return_date: new Date('2026-04-01'),
      notes: 'Medical supplies priority mission',
    },
  });

  const returnedExpedition = await prisma.expeditions.create({
    data: {
      camp_id: mainCamp.id,
      destination: 'East Service Tunnel',
      status: 'RETURNED',
      created_by: adminUser.id,
      departure_date: new Date('2026-03-20'),
      expected_return_date: new Date('2026-03-23'),
      actual_return_date: new Date('2026-03-23'),
      max_return_date: new Date('2026-03-24'),
      notes: 'Returned with extra water filters and rations',
    },
  });

  await prisma.expedition_members.createMany({
    data: [
      { expedition_id: plannedExpedition.id, person_id: primaryPerson.id },
      { expedition_id: plannedExpedition.id, person_id: quaternaryPerson.id },
      { expedition_id: ongoingExpedition.id, person_id: tertiaryPerson.id },
      { expedition_id: ongoingExpedition.id, person_id: quinaryPerson.id },
      { expedition_id: returnedExpedition.id, person_id: primaryPerson.id },
      { expedition_id: returnedExpedition.id, person_id: quaternaryPerson.id },
    ],
  });

  await prisma.expedition_allocated_resources.createMany({
    data: [
      { expedition_id: plannedExpedition.id, resource_type_id: rationsResource.id, amount: '12' },
      { expedition_id: plannedExpedition.id, resource_type_id: waterResource.id, amount: '20' },
      { expedition_id: ongoingExpedition.id, resource_type_id: rationsResource.id, amount: '18' },
      { expedition_id: ongoingExpedition.id, resource_type_id: waterResource.id, amount: '30' },
      { expedition_id: ongoingExpedition.id, resource_type_id: medsResource.id, amount: '5' },
      { expedition_id: returnedExpedition.id, resource_type_id: rationsResource.id, amount: '15' },
      { expedition_id: returnedExpedition.id, resource_type_id: waterResource.id, amount: '25' },
      { expedition_id: returnedExpedition.id, resource_type_id: medsResource.id, amount: '2' },
    ],
  });

  await prisma.expedition_found_resources.createMany({
    data: [
      { expedition_id: returnedExpedition.id, resource_type_id: rationsResource.id, amount: '5' },
      { expedition_id: returnedExpedition.id, resource_type_id: waterResource.id, amount: '10' },
    ],
  });

  // Make ONGOING expedition members consistent with business status.
  await prisma.persons.update({
    where: { id: tertiaryPerson.id },
    data: { status: 'AWAY' },
  });

  await prisma.persons.update({
    where: { id: quinaryPerson.id },
    data: { status: 'AWAY' },
  });

  await prisma.person_status_log.createMany({
    data: [
      {
        person_id: tertiaryPerson.id,
        old_status: 'HEALTHY',
        new_status: 'AWAY',
        reason: `Seed: expedition #${ongoingExpedition.id} is ONGOING`,
        changed_by: adminUser.id,
      },
      {
        person_id: quinaryPerson.id,
        old_status: 'HEALTHY',
        new_status: 'AWAY',
        reason: `Seed: expedition #${ongoingExpedition.id} is ONGOING`,
        changed_by: adminUser.id,
      },
    ],
  });

  // Keep inventory values coherent with expedition outflow/inflow snapshots.
  await prisma.inventory.update({
    where: {
      camp_id_resource_type_id: {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
      },
    },
    data: { quantity: '1160.0' },
  });

  await prisma.inventory.update({
    where: {
      camp_id_resource_type_id: {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
      },
    },
    data: { quantity: '2435.0' },
  });

  await prisma.inventory.update({
    where: {
      camp_id_resource_type_id: {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
      },
    },
    data: { quantity: '193.0' },
  });

  await prisma.inventory_log.createMany({
    data: [
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-12',
        description: `Seed: Expedition #${plannedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-20',
        description: `Seed: Expedition #${plannedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-18',
        description: `Seed: Expedition #${ongoingExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-30',
        description: `Seed: Expedition #${ongoingExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-5',
        description: `Seed: Expedition #${ongoingExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-15',
        description: `Seed: Expedition #${returnedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-25',
        description: `Seed: Expedition #${returnedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        delta: '-2',
        description: `Seed: Expedition #${returnedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_IN',
        delta: '5',
        description: `Seed: Expedition #${returnedExpedition.id} resource return`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_IN',
        delta: '10',
        description: `Seed: Expedition #${returnedExpedition.id} resource return`,
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

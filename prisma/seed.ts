import { prisma } from '../src/lib/prisma';
import { PERMISSIONS } from '../src/shared/constants/permissions';

async function main() {
  console.log('Starting database seed...');

  // For PostgreSQL, we disable triggers and constraints temporarily
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
    'role_permissions',
    'permissions',
    'roles',
    'camps',
    'system_config',
    'Post',
    'User',
  ];

  // Disable constraints for PostgreSQL
  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (err) {
      console.warn(
        `Could not truncate table ${table} (maybe it doesn't exist): ${(err as any).message}`,
      );
    }
  }

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
      name: 'system_admin',
      description: 'Administrator with full access',
    },
  });

  const workerRole = await prisma.roles.create({
    data: {
      name: 'worker',
      description: 'General camp worker access',
    },
  });

  const resourceManagerRole = await prisma.roles.create({
    data: {
      name: 'resource_manager',
      description: 'Inventory and resource operations manager',
    },
  });

  const travelCoordinatorRole = await prisma.roles.create({
    data: {
      name: 'travel_coordinator',
      description: 'Expedition and transfer coordination role',
    },
  });

  const permissionDefinitions = Object.values(PERMISSIONS).map((name) => ({
    name,
    description: name.replace(/\./g, ' ').replace(/_/g, ' '),
  }));

  await prisma.permissions.createMany({ data: permissionDefinitions, skipDuplicates: true });

  const permissions = await prisma.permissions.findMany({
    where: { name: { in: permissionDefinitions.map((entry) => entry.name) } },
    select: { id: true, name: true },
  });

  const permissionIdByName = new Map(
    permissions.map((permission) => [permission.name, permission.id]),
  );
  const roleIdByName = new Map<string, number>([
    [adminRole.name, adminRole.id],
    [workerRole.name, workerRole.id],
    [resourceManagerRole.name, resourceManagerRole.id],
    [travelCoordinatorRole.name, travelCoordinatorRole.id],
  ]);

  const rolePermissionMap: Record<string, string[]> = {
    system_admin: [
      PERMISSIONS.CAMPS_CREATE,
      PERMISSIONS.CAMPS_READ,
      PERMISSIONS.CAMPS_UPDATE,
      PERMISSIONS.CAMPS_DELETE,
      PERMISSIONS.PEOPLE_CREATE,
      PERMISSIONS.PEOPLE_READ,
      PERMISSIONS.PEOPLE_UPDATE,
      PERMISSIONS.PEOPLE_DELETE,
      PERMISSIONS.PEOPLE_STATUS_LOG_CREATE,
      PERMISSIONS.PEOPLE_PROFESSION_REASSIGN,
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.PROFESSIONS_CREATE,
      PERMISSIONS.PROFESSIONS_READ,
      PERMISSIONS.PROFESSIONS_UPDATE,
      PERMISSIONS.PROFESSIONS_DELETE,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_AUDIT_READ,
      PERMISSIONS.ADMISSION_CREATE,
      PERMISSIONS.ADMISSION_READ,
      PERMISSIONS.ADMISSION_REVIEW,
      PERMISSIONS.TRANSFERS_CREATE,
      PERMISSIONS.TRANSFERS_READ,
      PERMISSIONS.TRANSFERS_SCHEDULE,
      PERMISSIONS.TRANSFERS_APPROVE_SOURCE,
      PERMISSIONS.TRANSFERS_APPROVE_TARGET,
      PERMISSIONS.TRANSFERS_COMPLETE,
      PERMISSIONS.TRANSFERS_REJECT,
      PERMISSIONS.METRICS_DASHBOARD,
      PERMISSIONS.METRICS_RESOURCES,
      PERMISSIONS.METRICS_PEOPLE,
      PERMISSIONS.METRICS_EXPEDITIONS,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_UPDATE,
      PERMISSIONS.ROLES_DELETE,
      PERMISSIONS.PERMISSIONS_CREATE,
      PERMISSIONS.PERMISSIONS_READ,
      PERMISSIONS.PERMISSIONS_UPDATE,
      PERMISSIONS.PERMISSIONS_DELETE,
    ],
    worker: [
      PERMISSIONS.CAMPS_READ,
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.PEOPLE_READ,
      PERMISSIONS.PROFESSIONS_READ,
      PERMISSIONS.EXPEDITIONS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.ADMISSION_CREATE,
      PERMISSIONS.ADMISSION_READ,
      PERMISSIONS.TRANSFERS_CREATE,
      PERMISSIONS.TRANSFERS_READ,
      PERMISSIONS.TRANSFERS_SCHEDULE,
      PERMISSIONS.TRANSFERS_APPROVE_SOURCE,
      PERMISSIONS.TRANSFERS_APPROVE_TARGET,
      PERMISSIONS.TRANSFERS_COMPLETE,
      PERMISSIONS.TRANSFERS_REJECT,
    ],
    resource_manager: [
      PERMISSIONS.CAMPS_READ,
      PERMISSIONS.RESOURCES_CREATE,
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.RESOURCES_UPDATE,
      PERMISSIONS.RESOURCES_DELETE,
      PERMISSIONS.PEOPLE_READ,
      PERMISSIONS.PEOPLE_UPDATE,
      PERMISSIONS.PEOPLE_STATUS_LOG_CREATE,
      PERMISSIONS.PEOPLE_PROFESSION_REASSIGN,
      PERMISSIONS.PEOPLE_CONTRIBUTION_OVERRIDE_CREATE,
      PERMISSIONS.PROFESSIONS_READ,
      PERMISSIONS.EXPEDITIONS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_AUDIT_READ,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.ADMISSION_CREATE,
      PERMISSIONS.ADMISSION_READ,
      PERMISSIONS.TRANSFERS_CREATE,
      PERMISSIONS.TRANSFERS_READ,
      PERMISSIONS.TRANSFERS_SCHEDULE,
      PERMISSIONS.TRANSFERS_APPROVE_SOURCE,
      PERMISSIONS.TRANSFERS_APPROVE_TARGET,
      PERMISSIONS.TRANSFERS_COMPLETE,
      PERMISSIONS.TRANSFERS_REJECT,
      PERMISSIONS.METRICS_DASHBOARD,
      PERMISSIONS.METRICS_RESOURCES,
      PERMISSIONS.METRICS_PEOPLE,
      PERMISSIONS.METRICS_EXPEDITIONS,
    ],
    travel_coordinator: [
      PERMISSIONS.CAMPS_READ,
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.PEOPLE_READ,
      PERMISSIONS.PROFESSIONS_READ,
      PERMISSIONS.EXPEDITIONS_CREATE,
      PERMISSIONS.EXPEDITIONS_READ,
      PERMISSIONS.EXPEDITIONS_UPDATE,
      PERMISSIONS.EXPEDITIONS_UPDATE_STATUS,
      PERMISSIONS.EXPEDITIONS_DELETE,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.ADMISSION_CREATE,
      PERMISSIONS.ADMISSION_READ,
      PERMISSIONS.TRANSFERS_CREATE,
      PERMISSIONS.TRANSFERS_READ,
      PERMISSIONS.TRANSFERS_SCHEDULE,
      PERMISSIONS.TRANSFERS_APPROVE_SOURCE,
      PERMISSIONS.TRANSFERS_APPROVE_TARGET,
      PERMISSIONS.TRANSFERS_COMPLETE,
      PERMISSIONS.TRANSFERS_REJECT,
    ],
  };

  const rolePermissionRows: Array<{ role_id: number; permission_id: number }> = [];

  for (const [roleName, permissionNames] of Object.entries(rolePermissionMap)) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) {
      throw new Error(`Role not found when assigning permissions: ${roleName}`);
    }

    for (const permissionName of permissionNames) {
      const permissionId = permissionIdByName.get(permissionName);
      if (!permissionId) {
        throw new Error(`Permission not found when assigning: ${permissionName}`);
      }

      rolePermissionRows.push({ role_id: roleId, permission_id: permissionId });
    }
  }

  if (rolePermissionRows.length > 0) {
    await prisma.role_permissions.createMany({ data: rolePermissionRows });
  }

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
  const adminUser = await prisma.users.upsert({
    where: { username: 'admin_master' },
    create: {
      camp_id: mainCamp.id,
      role_id: adminRole.id,
      username: 'admin_master',
      password_hash: '$2b$10$3TYk7ZvBUpyysVGRsa71Ne9gWf/EPJdF9n3l2g2peLBGTYkjbu0du', // bcrypt hash for 'password'
      is_active: true,
    },
    update: {
      camp_id: mainCamp.id,
      role_id: adminRole.id,
      password_hash: '$2b$10$3TYk7ZvBUpyysVGRsa71Ne9gWf/EPJdF9n3l2g2peLBGTYkjbu0du',
      is_active: true,
      last_activity: null,
      session_version: 1,
    },
  });

  const standardUser = await prisma.users.upsert({
    where: { username: 'camp_manager' },
    create: {
      camp_id: secondaryCamp.id,
      role_id: workerRole.id,
      username: 'camp_manager',
      password_hash: '$2b$10$3TYk7ZvBUpyysVGRsa71Ne9gWf/EPJdF9n3l2g2peLBGTYkjbu0du', // bcrypt hash for 'password'
      is_active: true,
    },
    update: {
      camp_id: secondaryCamp.id,
      role_id: workerRole.id,
      password_hash: '$2b$10$3TYk7ZvBUpyysVGRsa71Ne9gWf/EPJdF9n3l2g2peLBGTYkjbu0du',
      is_active: true,
      last_activity: null,
      session_version: 1,
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
  const mainCampInitialInventory = [
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
  ];

  await prisma.$transaction([
    prisma.inventory.createMany({
      data: mainCampInitialInventory,
    }),
    prisma.inventory_log.createMany({
      data: mainCampInitialInventory.map((item) => ({
        camp_id: item.camp_id,
        resource_type_id: item.resource_type_id,
        logged_by: adminUser.id,
        log_type: 'MANUAL_IN',
        delta: item.quantity,
        description: 'Seed: opening inventory balance',
      })),
    }),
  ]);

  // Seed inventories for secondary camp
  const secondaryCampInitialInventory = [
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
  ];

  await prisma.$transaction([
    prisma.inventory.createMany({
      data: secondaryCampInitialInventory,
    }),
    prisma.inventory_log.createMany({
      data: secondaryCampInitialInventory.map((item) => ({
        camp_id: item.camp_id,
        resource_type_id: item.resource_type_id,
        logged_by: standardUser.id,
        log_type: 'MANUAL_IN',
        delta: item.quantity,
        description: 'Seed: opening inventory balance',
      })),
    }),
  ]);

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

  // Seed transfers module data
  console.log('Seeding transfers data...');

  const pendingResourceTransfer = await prisma.camp_transfers.create({
    data: {
      requesting_camp: mainCamp.id,
      target_camp: secondaryCamp.id,
      status: 'PENDING',
      type: 'RESOURCE',
      notes: 'Emergency support package pending source approval',
      requested_by: adminUser.id,
      scheduled_delivery_date: new Date('2026-05-02T10:00:00Z'),
    },
  });

  await prisma.camp_transfer_item.createMany({
    data: [
      {
        camp_transfer_id: pendingResourceTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: rationsResource.id,
        quantity: '30.00',
      },
      {
        camp_transfer_id: pendingResourceTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: waterResource.id,
        quantity: '60.00',
      },
    ],
  });

  const approvedSourceMixedTransfer = await prisma.camp_transfers.create({
    data: {
      requesting_camp: mainCamp.id,
      target_camp: secondaryCamp.id,
      status: 'APPROVED_SOURCE',
      type: 'MIXED',
      notes: 'Source approved. Awaiting target confirmation.',
      requested_by: adminUser.id,
      leader_person_id: quaternaryPerson.id,
      scheduled_delivery_date: new Date('2026-05-03T14:30:00Z'),
      approved_by_source: adminUser.id,
      approved_source_at: new Date('2026-04-20T08:00:00Z'),
    },
  });

  await prisma.camp_transfer_item.createMany({
    data: [
      {
        camp_transfer_id: approvedSourceMixedTransfer.id,
        item_type: 'PERSON',
        person_id: quaternaryPerson.id,
      },
      {
        camp_transfer_id: approvedSourceMixedTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: medsResource.id,
        quantity: '8.00',
      },
    ],
  });

  const approvedTargetPersonTransfer = await prisma.camp_transfers.create({
    data: {
      requesting_camp: mainCamp.id,
      target_camp: secondaryCamp.id,
      status: 'APPROVED_TARGET',
      type: 'PERSON',
      notes: 'Fully approved transfer. Pending execution by logistics.',
      requested_by: adminUser.id,
      leader_person_id: primaryPerson.id,
      scheduled_delivery_date: new Date('2026-05-04T09:15:00Z'),
      approved_by_source: adminUser.id,
      approved_source_at: new Date('2026-04-21T10:00:00Z'),
      approved_by_target: standardUser.id,
      approved_target_at: new Date('2026-04-22T11:30:00Z'),
    },
  });

  await prisma.camp_transfer_item.createMany({
    data: [
      {
        camp_transfer_id: approvedTargetPersonTransfer.id,
        item_type: 'PERSON',
        person_id: primaryPerson.id,
      },
      {
        camp_transfer_id: approvedTargetPersonTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: rationsResource.id,
        quantity: '6.00',
      },
      {
        camp_transfer_id: approvedTargetPersonTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: waterResource.id,
        quantity: '12.00',
      },
    ],
  });

  const rejectedTransfer = await prisma.camp_transfers.create({
    data: {
      requesting_camp: secondaryCamp.id,
      target_camp: mainCamp.id,
      status: 'REJECTED',
      type: 'RESOURCE',
      notes: 'Rejected by destination due to route risk escalation.',
      requested_by: standardUser.id,
      scheduled_delivery_date: new Date('2026-04-30T16:00:00Z'),
      approved_by_source: standardUser.id,
      approved_source_at: new Date('2026-04-18T09:00:00Z'),
    },
  });

  await prisma.camp_transfer_item.createMany({
    data: [
      {
        camp_transfer_id: rejectedTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: medsResource.id,
        quantity: '4.00',
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

import { prisma } from '../src/lib/prisma';
import { hash } from '@node-rs/bcrypt';
import { PERMISSIONS } from '../src/shared/constants/permissions';
import { logger } from '../src/logger/logger';

async function main() {
  logger.info('Starting database seed...');

  // For PostgreSQL, we disable triggers and constraints temporarily
  logger.info('Cleaning existing data...');

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

  // Disable constraints for PostgreSQL
  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    } catch (err) {
      logger.warn(
        `Could not truncate table ${table} (maybe it doesn't exist): ${(err as any).message}`,
      );
    }
  }

  logger.info('Database cleaned.');

  // Seed base entities
  logger.info('Seeding base entities...');
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

  const tertiaryCamp = await prisma.camps.create({
    data: {
      name: 'Gamma Bastion',
      location: 'Grid Sector 12',
      status: 'ACTIVE',
      ai_context_prompt:
        'Prioritize logistics, supply continuity, and stable staffing for long-duration settlement support.',
    },
  });

  const quaternaryCamp = await prisma.camps.create({
    data: {
      name: 'Delta Haven',
      location: 'Grid Sector 4',
      status: 'ACTIVE',
      ai_context_prompt:
        'Prioritize medical readiness, low-risk integration, and skilled support for recovery operations.',
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
      PERMISSIONS.PEOPLE_CONTRIBUTION_OVERRIDE_CREATE,
      PERMISSIONS.RESOURCES_CREATE,
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.RESOURCES_UPDATE,
      PERMISSIONS.RESOURCES_DELETE,
      PERMISSIONS.PROFESSIONS_CREATE,
      PERMISSIONS.PROFESSIONS_READ,
      PERMISSIONS.PROFESSIONS_UPDATE,
      PERMISSIONS.PROFESSIONS_DELETE,
      PERMISSIONS.EXPEDITIONS_CREATE,
      PERMISSIONS.EXPEDITIONS_READ,
      PERMISSIONS.EXPEDITIONS_UPDATE,
      PERMISSIONS.EXPEDITIONS_UPDATE_STATUS,
      PERMISSIONS.EXPEDITIONS_DELETE,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_AUDIT_READ,
      PERMISSIONS.INVENTORY_ADJUST,
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
      PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING,
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

  const medicProfession = await prisma.professions.create({
    data: {
      name: 'Medic',
      description: 'Medical care and trauma stabilization',
    },
  });

  const rationsResource = await prisma.resource_types.create({
    data: {
      name: 'Standard Rations',
      unit: 'kg',
      daily_ration: '1.5',
      minimum_stock: '500',
      auto_daily: true,
    },
  });

  const waterResource = await prisma.resource_types.create({
    data: {
      name: 'Purified Water',
      unit: 'Liters',
      daily_ration: '2.0',
      minimum_stock: '1000',
      auto_daily: true,
    },
  });

  const medsResource = await prisma.resource_types.create({
    data: {
      name: 'Antibiotics',
      unit: 'Doses',
      daily_ration: '0',
      minimum_stock: '50',
      auto_daily: false,
    },
  });

  const fuelResource = await prisma.resource_types.create({
    data: {
      name: 'Diesel Fuel',
      unit: 'Liters',
      daily_ration: '0.75',
      minimum_stock: '120',
      auto_daily: false,
    },
  });

  const medicalKitResource = await prisma.resource_types.create({
    data: {
      name: 'Medical Kits',
      unit: 'Units',
      daily_ration: '0.10',
      minimum_stock: '40',
      auto_daily: false,
    },
  });

  await prisma.professions_resources_amounts.createMany({
    data: [
      {
        profession_id: engineerProfession.id,
        resource_type_id: rationsResource.id,
        amount: '1.25',
      },
      {
        profession_id: engineerProfession.id,
        resource_type_id: waterResource.id,
        amount: '2.00',
      },
      {
        profession_id: engineerProfession.id,
        resource_type_id: fuelResource.id,
        amount: '0.50',
      },
      {
        profession_id: scoutProfession.id,
        resource_type_id: rationsResource.id,
        amount: '1.00',
      },
      {
        profession_id: scoutProfession.id,
        resource_type_id: waterResource.id,
        amount: '1.75',
      },
      {
        profession_id: scoutProfession.id,
        resource_type_id: fuelResource.id,
        amount: '0.25',
      },
      {
        profession_id: medicProfession.id,
        resource_type_id: rationsResource.id,
        amount: '1.10',
      },
      {
        profession_id: medicProfession.id,
        resource_type_id: waterResource.id,
        amount: '1.80',
      },
      {
        profession_id: medicProfession.id,
        resource_type_id: medsResource.id,
        amount: '0.40',
      },
      {
        profession_id: medicProfession.id,
        resource_type_id: medicalKitResource.id,
        amount: '0.30',
      },
    ],
  });

  // Seed dependent entities
  logger.info('Seeding dependent entities...');
  const passwordHash = await hash('password', 4);

  const usersToSeed = [
    { username: 'admin_master', campId: mainCamp.id, roleId: adminRole.id },
    { username: 'admin_user_2', campId: secondaryCamp.id, roleId: adminRole.id },
    { username: 'admin_user_3', campId: tertiaryCamp.id, roleId: adminRole.id },
    { username: 'admin_user_4', campId: quaternaryCamp.id, roleId: adminRole.id },
    { username: 'camp_manager', campId: secondaryCamp.id, roleId: workerRole.id },
    { username: 'worker_user_1', campId: mainCamp.id, roleId: workerRole.id },
    { username: 'worker_user_2', campId: secondaryCamp.id, roleId: workerRole.id },
    { username: 'worker_user_3', campId: tertiaryCamp.id, roleId: workerRole.id },
    { username: 'worker_user_4', campId: quaternaryCamp.id, roleId: workerRole.id },
    { username: 'resource_mgr_1', campId: mainCamp.id, roleId: resourceManagerRole.id },
    { username: 'resource_mgr_2', campId: secondaryCamp.id, roleId: resourceManagerRole.id },
    { username: 'resource_mgr_3', campId: tertiaryCamp.id, roleId: resourceManagerRole.id },
    { username: 'resource_mgr_4', campId: quaternaryCamp.id, roleId: resourceManagerRole.id },
    { username: 'travel_coord_1', campId: mainCamp.id, roleId: travelCoordinatorRole.id },
    { username: 'travel_coord_2', campId: secondaryCamp.id, roleId: travelCoordinatorRole.id },
    { username: 'travel_coord_3', campId: tertiaryCamp.id, roleId: travelCoordinatorRole.id },
    { username: 'travel_coord_4', campId: quaternaryCamp.id, roleId: travelCoordinatorRole.id },
  ];

  const createdUsers = new Map<
    string,
    { id: number; username: string; camp_id: number; role_id: number }
  >();

  for (const userData of usersToSeed) {
    const user = await prisma.users.upsert({
      where: { username: userData.username },
      create: {
        camp_id: userData.campId,
        role_id: userData.roleId,
        username: userData.username,
        password_hash: passwordHash,
        is_active: true,
      },
      update: {
        camp_id: userData.campId,
        role_id: userData.roleId,
        password_hash: passwordHash,
        is_active: true,
        last_activity: null,
        session_version: 1,
      },
    });

    createdUsers.set(userData.username, user);
  }

  const adminUser = createdUsers.get('admin_master');
  const standardUser = createdUsers.get('camp_manager');

  if (!adminUser) {
    throw new Error('Seed failed to create admin_master');
  }

  if (!standardUser) {
    throw new Error('Seed failed to create camp_manager');
  }

  const tertiaryAdminUser = createdUsers.get('admin_user_3');
  const quaternaryAdminUser = createdUsers.get('admin_user_4');
  const tertiaryWorkerUser = createdUsers.get('worker_user_3');
  const quaternaryWorkerUser = createdUsers.get('worker_user_4');

  if (!tertiaryAdminUser || !quaternaryAdminUser || !tertiaryWorkerUser || !quaternaryWorkerUser) {
    throw new Error('Seed failed to create the extended camp user set');
  }

  const primaryPerson = await prisma.people.create({
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

  const secondaryPerson = await prisma.people.create({
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

  const gammaPersonLead = await prisma.people.create({
    data: {
      camp_id: tertiaryCamp.id,
      profession_id: engineerProfession.id,
      identification_code: 'ENG-101',
      full_name: 'Daria Cross',
      age: 38,
      blood_type: 'A+',
      skills_summary: 'Warehouse systems, repair coordination, supply routing',
      photo_url: 'https://example.com/people/daria-cross.jpg',
      status: 'HEALTHY',
    },
  });

  const gammaPersonSupport = await prisma.people.create({
    data: {
      camp_id: tertiaryCamp.id,
      profession_id: medicProfession.id,
      identification_code: 'MED-101',
      full_name: 'Omar Finch',
      age: 34,
      blood_type: 'O+',
      skills_summary: 'Field triage, injury stabilization, recovery management',
      photo_url: 'https://example.com/people/omar-finch.jpg',
      status: 'HEALTHY',
    },
  });

  const deltaPersonLead = await prisma.people.create({
    data: {
      camp_id: quaternaryCamp.id,
      profession_id: scoutProfession.id,
      identification_code: 'SCT-101',
      full_name: 'Selene Ward',
      age: 30,
      blood_type: 'B+',
      skills_summary: 'Route scouting, perimeter checks, evac guidance',
      photo_url: 'https://example.com/people/selene-ward.jpg',
      status: 'HEALTHY',
    },
  });

  const deltaPersonSupport = await prisma.people.create({
    data: {
      camp_id: quaternaryCamp.id,
      profession_id: medicProfession.id,
      identification_code: 'MED-102',
      full_name: 'Noah Vale',
      age: 27,
      blood_type: 'AB-',
      skills_summary: 'Medical care, stabilization, intake triage',
      photo_url: 'https://example.com/people/noah-vale.jpg',
      status: 'HEALTHY',
    },
  });

  const gammaPendingAdmission = await prisma.admission_requests.create({
    data: {
      camp_id: tertiaryCamp.id,
      applicant_name: 'Hana Rook',
      applicant_age: 41,
      applicant_skills: 'Logistics, procurement, inventory rotation',
      health_notes: 'Fatigued but medically stable',
      background_notes: 'Previously coordinated supply chains for mobile shelters',
      photo_url: 'https://example.com/admissions/hana-rook.jpg',
      id_card_url: 'https://example.com/admissions/hana-rook-id.pdf',
      ai_decision: 'PENDING',
      ai_reasoning: null,
      ai_confidence: null,
      ai_suggested_profession: null,
      ai_profession_id: null,
      final_decision: 'PENDING',
    },
  });

  const deltaAcceptedAdmission = await prisma.admission_requests.create({
    data: {
      camp_id: quaternaryCamp.id,
      applicant_name: 'Milo Arden',
      applicant_age: 24,
      applicant_skills: 'Patient care, wound cleaning, vital monitoring',
      health_notes: 'Light concussion fully resolved',
      background_notes: 'Volunteered as a mobile medic after convoy collapse',
      photo_url: 'https://example.com/admissions/milo-arden.jpg',
      id_card_url: 'https://example.com/admissions/milo-arden-id.pdf',
      ai_decision: 'ACCEPTED',
      ai_reasoning:
        'Useful medical support profile, stable behavior, and low operational risk.',
      ai_confidence: 0.92,
      ai_suggested_profession: 'Medic',
      ai_profession_id: medicProfession.id,
      final_decision: 'ACCEPTED',
      reviewed_by: quaternaryAdminUser.id,
      reviewed_at: new Date('2026-04-12T08:15:00Z'),
    },
  });

  const deltaAcceptedPerson = await prisma.people.create({
    data: {
      camp_id: quaternaryCamp.id,
      profession_id: medicProfession.id,
      identification_code: 'MED-103',
      full_name: 'Milo Arden',
      age: 24,
      blood_type: 'O-',
      skills_summary: 'Patient care, wound cleaning, vital monitoring',
      photo_url: 'https://example.com/people/milo-arden.jpg',
      status: 'HEALTHY',
    },
  });

  await prisma.admission_requests.update({
    where: { id: deltaAcceptedAdmission.id },
    data: { person_id: deltaAcceptedPerson.id },
  });

  const gammaRejectedAdmission = await prisma.admission_requests.create({
    data: {
      camp_id: tertiaryCamp.id,
      applicant_name: 'Jace Hollow',
      applicant_age: 36,
      applicant_skills: 'Unverified repair and patrol support',
      health_notes: 'Recurring respiratory symptoms',
      background_notes: 'Multiple route disputes in previous settlement',
      photo_url: 'https://example.com/admissions/jace-hollow.jpg',
      id_card_url: 'https://example.com/admissions/jace-hollow-id.pdf',
      ai_decision: 'REJECTED',
      ai_reasoning:
        'Health concerns and trust risk make the applicant unsuitable for intake.',
      ai_confidence: 0.89,
      ai_suggested_profession: 'Worker',
      ai_profession_id: engineerProfession.id,
      final_decision: 'REJECTED',
      reviewed_by: tertiaryAdminUser.id,
      reviewed_at: new Date('2026-04-13T14:20:00Z'),
      correction_reason: 'Rejected due to unresolved health risk and repeated disputes.',
    },
  });

  await prisma.people.update({
    where: { id: gammaPersonLead.id },
    data: { status: 'INJURED' },
  });

  await prisma.people.update({
    where: { id: gammaPersonSupport.id },
    data: { status: 'HEALTHY' },
  });

  await prisma.person_status_logs.createMany({
    data: [
      {
        person_id: gammaPersonLead.id,
        old_status: 'HEALTHY',
        new_status: 'INJURED',
        reason: 'Seed: manual readiness check before logistics assignment',
        changed_by: tertiaryAdminUser.id,
      },
      {
        person_id: deltaAcceptedPerson.id,
        old_status: 'HEALTHY',
        new_status: 'HEALTHY',
        reason: 'Seed: accepted intake completed with no health issues',
        changed_by: quaternaryAdminUser.id,
      },
    ],
  });

  await prisma.people.update({
    where: { id: secondaryPerson.id },
    data: { profession_id: medicProfession.id },
  });

  await prisma.profession_reassignment_logs.create({
    data: {
      person_id: secondaryPerson.id,
      from_profession_id: scoutProfession.id,
      to_profession_id: medicProfession.id,
      reason: 'Reassigned to cover post-admission medical support needs in Beta Sanctuary.',
      start_date: new Date('2026-04-13'),
      end_date: new Date('2026-04-30'),
    },
  });

  const tertiaryPerson = await prisma.people.create({
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

  const quaternaryPerson = await prisma.people.create({
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

  const quinaryPerson = await prisma.people.create({
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

  const acceptedMainAdmission = await prisma.admission_requests.create({
    data: {
      camp_id: mainCamp.id,
      applicant_name: 'Lena Moss',
      applicant_age: 29,
      applicant_skills: 'Emergency care, diagnostics, trauma stabilization',
      health_notes: 'Stable and fit for field work',
      background_notes: 'Former field medic with hospital triage experience',
      photo_url: 'https://example.com/admissions/lena-moss.jpg',
      id_card_url: 'https://example.com/admissions/lena-moss-id.pdf',
      ai_decision: 'ACCEPTED',
      ai_reasoning:
        'Strong medical support value, reliable temperament, and high camp resilience score.',
      ai_confidence: 0.94,
      ai_suggested_profession: 'Medic',
      ai_profession_id: medicProfession.id,
      final_decision: 'ACCEPTED',
      reviewed_by: adminUser.id,
      reviewed_at: new Date('2026-04-10T12:00:00Z'),
    },
  });

  const lenaPerson = await prisma.people.create({
    data: {
      camp_id: mainCamp.id,
      profession_id: medicProfession.id,
      identification_code: 'MED-001',
      full_name: 'Lena Moss',
      age: 29,
      blood_type: 'A-',
      skills_summary: 'Emergency care, diagnostics, trauma stabilization',
      status: 'HEALTHY',
    },
  });

  await prisma.admission_requests.update({
    where: { id: acceptedMainAdmission.id },
    data: { person_id: lenaPerson.id },
  });

  const acceptedSecondaryAdmission = await prisma.admission_requests.create({
    data: {
      camp_id: secondaryCamp.id,
      applicant_name: 'Marin Vale',
      applicant_age: 33,
      applicant_skills: 'Reconnaissance, navigation, observation',
      health_notes: 'Mild dehydration but no chronic issues',
      background_notes: 'Freelance tracker and route analyst',
      photo_url: 'https://example.com/admissions/marin-vale.jpg',
      id_card_url: 'https://example.com/admissions/marin-vale-id.pdf',
      ai_decision: 'ACCEPTED',
      ai_reasoning:
        'Excellent field mobility, strong scouting instincts, and adaptable survivability.',
      ai_confidence: 0.9,
      ai_suggested_profession: 'Scout',
      ai_profession_id: scoutProfession.id,
      final_decision: 'ACCEPTED',
      reviewed_by: standardUser.id,
      reviewed_at: new Date('2026-04-11T09:30:00Z'),
    },
  });

  const marinPerson = await prisma.people.create({
    data: {
      camp_id: secondaryCamp.id,
      profession_id: scoutProfession.id,
      identification_code: 'SCT-004',
      full_name: 'Marin Vale',
      age: 33,
      blood_type: 'O+',
      skills_summary: 'Reconnaissance, navigation, observation',
      status: 'HEALTHY',
    },
  });

  await prisma.admission_requests.update({
    where: { id: acceptedSecondaryAdmission.id },
    data: { person_id: marinPerson.id },
  });

  await prisma.admission_requests.create({
    data: {
      camp_id: secondaryCamp.id,
      applicant_name: 'Owen Hale',
      applicant_age: 44,
      applicant_skills: 'Mechanical repair and salvage negotiation',
      health_notes: 'Persistent cough and limited endurance',
      background_notes: 'Known for conflict-prone behavior in prior camps',
      photo_url: 'https://example.com/admissions/owen-hale.jpg',
      id_card_url: 'https://example.com/admissions/owen-hale-id.pdf',
      ai_decision: 'REJECTED',
      ai_reasoning:
        'Health profile and behavioral risk outweigh the short-term utility of the applicant.',
      ai_confidence: 0.88,
      ai_suggested_profession: 'Engineer',
      ai_profession_id: engineerProfession.id,
      final_decision: 'REJECTED',
      reviewed_by: standardUser.id,
      reviewed_at: new Date('2026-04-11T10:45:00Z'),
      correction_reason: 'Rejected due to low trust score and resource strain.',
    },
  });

  await prisma.admission_requests.create({
    data: {
      camp_id: mainCamp.id,
      applicant_name: 'Ivy Stone',
      applicant_age: 22,
      applicant_skills: 'Logistics support, inventory sorting, record keeping',
      health_notes: 'Under observation after long travel',
      background_notes: 'Recently arrived from a fragmented caravan',
      ai_decision: 'PENDING',
      ai_reasoning: null,
      ai_confidence: null,
      ai_suggested_profession: null,
      ai_profession_id: null,
      final_decision: 'PENDING',
    },
  });

  const achievements = [
    {
      name: 'First Acceptance',
      description: 'Successfully reviewed and admitted a new survivor.',
      icon_url: 'https://example.com/achievements/first-acceptance.png',
      trigger_rule: 'Review an admission request and accept it.',
    },
    {
      name: 'Expedition Veteran',
      description: 'Served on multiple expedition teams.',
      icon_url: 'https://example.com/achievements/expedition-veteran.png',
      trigger_rule: 'Participate in at least two expeditions.',
    },
    {
      name: 'Supply Stabilizer',
      description: 'Helped keep the camp resource stock above minimum thresholds.',
      icon_url: 'https://example.com/achievements/supply-stabilizer.png',
      trigger_rule: 'Maintain a camp resource above its minimum stock.',
    },
    {
      name: 'Transfer Coordinator',
      description: 'Processed a transfer from request to completion.',
      icon_url: 'https://example.com/achievements/transfer-coordinator.png',
      trigger_rule: 'Create and complete a camp transfer.',
    },
  ];

  await prisma.achievements.createMany({ data: achievements, skipDuplicates: true });

  const seededAchievements = await prisma.achievements.findMany({
    where: { name: { in: achievements.map((achievement) => achievement.name) } },
    select: { id: true, name: true },
  });

  const achievementIdByName = new Map(
    seededAchievements.map((achievement) => [achievement.name, achievement.id]),
  );

  await prisma.user_achievements.createMany({
    data: [
      {
        user_id: adminUser.id,
        achievement_id: achievementIdByName.get('First Acceptance') as number,
      },
      {
        user_id: adminUser.id,
        achievement_id: achievementIdByName.get('Expedition Veteran') as number,
      },
      {
        user_id: standardUser.id,
        achievement_id: achievementIdByName.get('Supply Stabilizer') as number,
      },
      {
        user_id: standardUser.id,
        achievement_id: achievementIdByName.get('Transfer Coordinator') as number,
      },
    ],
  });

  await prisma.contribution_overrides.createMany({
    data: [
      {
        person_id: lenaPerson.id,
        resource_type_id: medsResource.id,
        reason: 'Temporary recovery support after long travel.',
        start_date: new Date('2026-04-12'),
        end_date: new Date('2026-04-19'),
        created_by: adminUser.id,
        amount: '0.50',
      },
      {
        person_id: quinaryPerson.id,
        resource_type_id: rationsResource.id,
        reason: 'Extended scouting patrol and map verification.',
        start_date: new Date('2026-04-14'),
        end_date: new Date('2026-04-16'),
        created_by: adminUser.id,
        amount: '0.25',
      },
      {
        person_id: marinPerson.id,
        resource_type_id: waterResource.id,
        reason: 'High humidity exposure during route analysis.',
        start_date: new Date('2026-04-15'),
        created_by: standardUser.id,
        amount: '0.30',
      },
    ],
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
    {
      camp_id: mainCamp.id,
      resource_type_id: fuelResource.id,
      quantity: '180.0',
    },
    {
      camp_id: mainCamp.id,
      resource_type_id: medicalKitResource.id,
      quantity: '75.0',
    },
  ];

  await prisma.$transaction([
    prisma.inventories.createMany({
      data: mainCampInitialInventory,
    }),
    prisma.inventory_logs.createMany({
      data: mainCampInitialInventory.map((item) => ({
        camp_id: item.camp_id,
        resource_type_id: item.resource_type_id,
        logged_by: adminUser.id,
        log_type: 'MANUAL_IN',
        quantity_change: item.quantity,
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
    {
      camp_id: secondaryCamp.id,
      resource_type_id: fuelResource.id,
      quantity: '95.0',
    },
    {
      camp_id: secondaryCamp.id,
      resource_type_id: medicalKitResource.id,
      quantity: '24.0',
    },
  ];

  await prisma.$transaction([
    prisma.inventories.createMany({
      data: secondaryCampInitialInventory,
    }),
    prisma.inventory_logs.createMany({
      data: secondaryCampInitialInventory.map((item) => ({
        camp_id: item.camp_id,
        resource_type_id: item.resource_type_id,
        logged_by: standardUser.id,
        log_type: 'MANUAL_IN',
        quantity_change: item.quantity,
        description: 'Seed: opening inventory balance',
      })),
    }),
  ]);

  const tertiaryCampInitialInventory = [
    {
      camp_id: tertiaryCamp.id,
      resource_type_id: rationsResource.id,
      quantity: '860.0',
    },
    {
      camp_id: tertiaryCamp.id,
      resource_type_id: waterResource.id,
      quantity: '1750.0',
    },
    {
      camp_id: tertiaryCamp.id,
      resource_type_id: fuelResource.id,
      quantity: '140.0',
    },
    {
      camp_id: tertiaryCamp.id,
      resource_type_id: medicalKitResource.id,
      quantity: '46.0',
    },
  ];

  await prisma.$transaction([
    prisma.inventories.createMany({
      data: tertiaryCampInitialInventory,
    }),
    prisma.inventory_logs.createMany({
      data: tertiaryCampInitialInventory.map((item) => ({
        camp_id: item.camp_id,
        resource_type_id: item.resource_type_id,
        logged_by: tertiaryAdminUser.id,
        log_type: 'MANUAL_IN',
        quantity_change: item.quantity,
        description: 'Seed: opening inventory balance',
      })),
    }),
  ]);

  const quaternaryCampInitialInventory = [
    {
      camp_id: quaternaryCamp.id,
      resource_type_id: rationsResource.id,
      quantity: '520.0',
    },
    {
      camp_id: quaternaryCamp.id,
      resource_type_id: waterResource.id,
      quantity: '980.0',
    },
    {
      camp_id: quaternaryCamp.id,
      resource_type_id: fuelResource.id,
      quantity: '88.0',
    },
    {
      camp_id: quaternaryCamp.id,
      resource_type_id: medicalKitResource.id,
      quantity: '62.0',
    },
  ];

  await prisma.$transaction([
    prisma.inventories.createMany({
      data: quaternaryCampInitialInventory,
    }),
    prisma.inventory_logs.createMany({
      data: quaternaryCampInitialInventory.map((item) => ({
        camp_id: item.camp_id,
        resource_type_id: item.resource_type_id,
        logged_by: quaternaryAdminUser.id,
        log_type: 'MANUAL_IN',
        quantity_change: item.quantity,
        description: 'Seed: opening inventory balance',
      })),
    }),
  ]);

  // Seed expeditions module data
  logger.info('Seeding expeditions data...');

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
      { expedition_id: plannedExpedition.id, person_id: lenaPerson.id },
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

  const gammaExpedition = await prisma.expeditions.create({
    data: {
      camp_id: tertiaryCamp.id,
      destination: 'South Freight Yard',
      status: 'PLANNED',
      created_by: tertiaryAdminUser.id,
      departure_date: new Date('2026-05-06'),
      expected_return_date: new Date('2026-05-08'),
      max_return_date: new Date('2026-05-09'),
      notes: 'Cargo retrieval and logistics mapping for Gamma Bastion',
    },
  });

  await prisma.expedition_members.createMany({
    data: [
      { expedition_id: gammaExpedition.id, person_id: gammaPersonLead.id },
      { expedition_id: gammaExpedition.id, person_id: gammaPersonSupport.id },
    ],
  });

  await prisma.expedition_allocated_resources.createMany({
    data: [
      { expedition_id: gammaExpedition.id, resource_type_id: rationsResource.id, amount: '10' },
      { expedition_id: gammaExpedition.id, resource_type_id: waterResource.id, amount: '16' },
      { expedition_id: gammaExpedition.id, resource_type_id: fuelResource.id, amount: '8' },
      {
        expedition_id: gammaExpedition.id,
        resource_type_id: medicalKitResource.id,
        amount: '2',
      },
    ],
  });

  const quaternarySupportTransfer = await prisma.camp_transfers.create({
    data: {
      requesting_camp: quaternaryCamp.id,
      target_camp: tertiaryCamp.id,
      status: 'PENDING',
      type: 'MIXED',
      notes: 'Support transfer to balance medical and logistics capacity.',
      requested_by: quaternaryAdminUser.id,
      leader_person_id: deltaPersonLead.id,
      scheduled_delivery_date: new Date('2026-05-07T13:00:00Z'),
    },
  });

  await prisma.camp_transfer_items.createMany({
    data: [
      {
        camp_transfer_id: quaternarySupportTransfer.id,
        item_type: 'PERSON',
        person_id: deltaPersonLead.id,
      },
      {
        camp_transfer_id: quaternarySupportTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: medicalKitResource.id,
        quantity: '5.00',
      },
      {
        camp_transfer_id: quaternarySupportTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: waterResource.id,
        quantity: '22.00',
      },
    ],
  });

  await prisma.audit_logs.createMany({
    data: [
      {
        user_id: tertiaryAdminUser.id,
        camp_id: tertiaryCamp.id,
        action: 'CREATE_CAMP',
        target_type: 'camps',
        target_id: tertiaryCamp.id,
        metadata: { name: tertiaryCamp.name, location: tertiaryCamp.location },
      },
      {
        user_id: quaternaryAdminUser.id,
        camp_id: quaternaryCamp.id,
        action: 'CREATE_CAMP',
        target_type: 'camps',
        target_id: quaternaryCamp.id,
        metadata: { name: quaternaryCamp.name, location: quaternaryCamp.location },
      },
      {
        user_id: tertiaryAdminUser.id,
        camp_id: tertiaryCamp.id,
        action: 'CREATE_TRANSFER',
        target_type: 'camp_transfers',
        target_id: quaternarySupportTransfer.id,
        metadata: { status: 'PENDING', type: 'MIXED' },
      },
      {
        user_id: quaternaryAdminUser.id,
        camp_id: quaternaryCamp.id,
        action: 'CREATE_EXPEDITION',
        target_type: 'expeditions',
        target_id: gammaExpedition.id,
        metadata: { destination: gammaExpedition.destination, status: gammaExpedition.status },
      },
    ],
  });

  // Make ONGOING expedition members consistent with business status.
  await prisma.people.update({
    where: { id: tertiaryPerson.id },
    data: { status: 'AWAY' },
  });

  await prisma.people.update({
    where: { id: quinaryPerson.id },
    data: { status: 'AWAY' },
  });

  await prisma.person_status_logs.createMany({
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
  await prisma.inventories.update({
    where: {
      camp_id_resource_type_id: {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
      },
    },
    data: { quantity: '1160.0' },
  });

  await prisma.inventories.update({
    where: {
      camp_id_resource_type_id: {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
      },
    },
    data: { quantity: '2435.0' },
  });

  await prisma.inventories.update({
    where: {
      camp_id_resource_type_id: {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
      },
    },
    data: { quantity: '193.0' },
  });

  await prisma.inventory_logs.createMany({
    data: [
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-12',
        description: `Seed: Expedition #${plannedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-20',
        description: `Seed: Expedition #${plannedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-18',
        description: `Seed: Expedition #${ongoingExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-30',
        description: `Seed: Expedition #${ongoingExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-5',
        description: `Seed: Expedition #${ongoingExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-15',
        description: `Seed: Expedition #${returnedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-25',
        description: `Seed: Expedition #${returnedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: medsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_OUT',
        quantity_change: '-2',
        description: `Seed: Expedition #${returnedExpedition.id} resource outflow`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: rationsResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_IN',
        quantity_change: '5',
        description: `Seed: Expedition #${returnedExpedition.id} resource return`,
      },
      {
        camp_id: mainCamp.id,
        resource_type_id: waterResource.id,
        logged_by: adminUser.id,
        log_type: 'EXPEDITION_IN',
        quantity_change: '10',
        description: `Seed: Expedition #${returnedExpedition.id} resource return`,
      },
    ],
  });

  // Seed transfers module data
  logger.info('Seeding transfers data...');

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

  await prisma.camp_transfer_items.createMany({
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
      {
        camp_transfer_id: pendingResourceTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: fuelResource.id,
        quantity: '15.00',
      },
      {
        camp_transfer_id: pendingResourceTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: medicalKitResource.id,
        quantity: '6.00',
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

  await prisma.camp_transfer_items.createMany({
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
      {
        camp_transfer_id: approvedSourceMixedTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: fuelResource.id,
        quantity: '10.00',
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

  await prisma.camp_transfer_items.createMany({
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
      {
        camp_transfer_id: approvedTargetPersonTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: medicalKitResource.id,
        quantity: '3.00',
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

  await prisma.camp_transfer_items.createMany({
    data: [
      {
        camp_transfer_id: rejectedTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: medsResource.id,
        quantity: '4.00',
      },
      {
        camp_transfer_id: rejectedTransfer.id,
        item_type: 'RESOURCE',
        resource_type_id: fuelResource.id,
        quantity: '5.00',
      },
    ],
  });

  const completedPersonTransfer = await prisma.camp_transfers.create({
    data: {
      requesting_camp: secondaryCamp.id,
      target_camp: mainCamp.id,
      status: 'COMPLETED',
      type: 'PERSON',
      notes: 'Completed transfer for a newly accepted scout.',
      requested_by: standardUser.id,
      scheduled_delivery_date: new Date('2026-05-05T08:00:00Z'),
      approved_by_source: standardUser.id,
      approved_source_at: new Date('2026-04-23T08:30:00Z'),
      approved_by_target: adminUser.id,
      approved_target_at: new Date('2026-04-24T12:15:00Z'),
      leader_person_id: marinPerson.id,
    },
  });

  await prisma.camp_transfer_items.createMany({
    data: [
      {
        camp_transfer_id: completedPersonTransfer.id,
        item_type: 'PERSON',
        person_id: marinPerson.id,
      },
    ],
  });

  await prisma.people.update({
    where: { id: marinPerson.id },
    data: { camp_id: mainCamp.id },
  });

  await prisma.audit_logs.createMany({
    data: [
      {
        user_id: adminUser.id,
        camp_id: mainCamp.id,
        action: 'CREATE_CAMP',
        target_type: 'camps',
        target_id: mainCamp.id,
        metadata: {
          name: mainCamp.name,
          location: mainCamp.location,
        },
      },
      {
        user_id: adminUser.id,
        camp_id: secondaryCamp.id,
        action: 'CREATE_CAMP',
        target_type: 'camps',
        target_id: secondaryCamp.id,
        metadata: {
          name: secondaryCamp.name,
          location: secondaryCamp.location,
        },
      },
      {
        user_id: adminUser.id,
        camp_id: mainCamp.id,
        action: 'CREATE_USER',
        target_type: 'users',
        target_id: adminUser.id,
        metadata: {
          username: adminUser.username,
          role: adminRole.name,
        },
      },
      {
        user_id: adminUser.id,
        camp_id: secondaryCamp.id,
        action: 'CREATE_USER',
        target_type: 'users',
        target_id: standardUser.id,
        metadata: {
          username: standardUser.username,
          role: workerRole.name,
        },
      },
      {
        user_id: adminUser.id,
        camp_id: mainCamp.id,
        action: 'LOGIN',
        target_type: 'users',
        target_id: adminUser.id,
        metadata: {
          username: adminUser.username,
          context: 'seed',
        },
      },
      {
        user_id: adminUser.id,
        camp_id: mainCamp.id,
        action: 'CREATE_TRANSFER',
        target_type: 'camp_transfers',
        target_id: pendingResourceTransfer.id,
        metadata: {
          status: 'PENDING',
          type: 'RESOURCE',
        },
      },
      {
        user_id: adminUser.id,
        camp_id: mainCamp.id,
        action: 'APPROVE_TRANSFER_SOURCE',
        target_type: 'camp_transfers',
        target_id: approvedSourceMixedTransfer.id,
        metadata: {
          status: 'APPROVED_SOURCE',
          type: 'MIXED',
        },
      },
      {
        user_id: standardUser.id,
        camp_id: secondaryCamp.id,
        action: 'APPROVE_TRANSFER_TARGET',
        target_type: 'camp_transfers',
        target_id: approvedTargetPersonTransfer.id,
        metadata: {
          status: 'APPROVED_TARGET',
          type: 'PERSON',
        },
      },
      {
        user_id: adminUser.id,
        camp_id: mainCamp.id,
        action: 'COMPLETE_TRANSFER',
        target_type: 'camp_transfers',
        target_id: completedPersonTransfer.id,
        metadata: {
          status: 'COMPLETED',
          type: 'PERSON',
        },
      },
      {
        user_id: standardUser.id,
        camp_id: secondaryCamp.id,
        action: 'REJECT_TRANSFER',
        target_type: 'camp_transfers',
        target_id: rejectedTransfer.id,
        metadata: {
          status: 'REJECTED',
          type: 'RESOURCE',
        },
      },
    ],
  });

  await prisma.system_configs.create({
    data: {
      id: 1,
      version: '1.0.0',
    },
  });

  logger.info('Seed completed successfully.');
}

main()
  .catch((e) => {
    logger.error('Error during seeding:');
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Graceful disconnect leveraging the initialized adapter in "src/lib/prisma.ts"
    await prisma.$disconnect();
  });

import { prisma } from '../src/lib/prisma.js';
import { hash } from '@node-rs/bcrypt';
import { faker } from '@faker-js/faker';
import { logger } from '../src/logger/logger.js';
const BATCH_SIZE = 500;
const DAYS_OF_OPERATION = 180;

faker.seed(42);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom<T>(items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const SYSTEM_START = new Date(Date.now() - DAYS_OF_OPERATION * 24 * 60 * 60 * 1000);
const NOW = new Date();

const CAMP_DEFINITIONS = [
  {
    name: 'Alpha Outpost',
    location: 'Grid Sector 7',
    status: 'ACTIVE' as const,
    populationWeight: 28,
    aiPrompt:
      'Prioritize technical survival value, practical skills, and reliable health stability for long-term infrastructure resilience.',
  },
  {
    name: 'Beta Sanctuary',
    location: 'Grid Sector 9',
    status: 'ACTIVE' as const,
    populationWeight: 23,
    aiPrompt:
      'Prioritize adaptability, team compatibility, and field mobility for scouting and rapid-response missions.',
  },
  {
    name: 'Gamma Bastion',
    location: 'Grid Sector 12',
    status: 'ACTIVE' as const,
    populationWeight: 26,
    aiPrompt:
      'Prioritize logistics, supply continuity, and stable staffing for long-duration settlement support.',
  },
  {
    name: 'Delta Haven',
    location: 'Grid Sector 4',
    status: 'ACTIVE' as const,
    populationWeight: 14,
    aiPrompt:
      'Prioritize medical readiness, low-risk integration, and skilled support for recovery operations.',
  },
  {
    name: 'Echo Forward',
    location: 'Grid Sector 2',
    status: 'ACTIVE' as const,
    populationWeight: 9,
    aiPrompt: 'Prioritize mechanical aptitude, structural repair, and resource efficiency.',
  },
  {
    name: 'Foxtrot Fallback',
    location: 'Grid Sector 15',
    status: 'ABANDONED' as const,
    populationWeight: 0,
    aiPrompt: null,
  },
];

const PROFESSIONS_DATA = [
  { name: 'Engineer', description: 'Technical systems and repair specialist' },
  { name: 'Scout', description: 'Exploration and route reconnaissance' },
  { name: 'Medic', description: 'Medical care and trauma stabilization' },
  { name: 'Guard', description: 'Perimeter security and defense' },
  { name: 'Farmer', description: 'Food cultivation and livestock' },
  { name: 'Cook', description: 'Food preparation and ration management' },
  { name: 'Mechanic', description: 'Vehicle and equipment maintenance' },
  { name: 'Hunter', description: 'Hunting and wilderness gathering' },
  { name: 'Laborer', description: 'General construction and heavy work' },
  { name: 'Leader', description: 'Camp coordination and decision-making' },
];

const RESOURCE_TYPES_DATA = [
  { name: 'FOOD_RATION', unit: 'kg', daily_ration: 1.5, minimum_stock: 500, auto_daily: true },
  {
    name: 'Purified Water',
    unit: 'Liters',
    daily_ration: 2.0,
    minimum_stock: 1000,
    auto_daily: true,
  },
  { name: 'Antibiotics', unit: 'Doses', daily_ration: 0, minimum_stock: 50, auto_daily: false },
  {
    name: 'Diesel Fuel',
    unit: 'Liters',
    daily_ration: 0.75,
    minimum_stock: 120,
    auto_daily: false,
  },
  { name: 'Medical Kits', unit: 'Units', daily_ration: 0.1, minimum_stock: 40, auto_daily: false },
  { name: 'Ammunition', unit: 'Rounds', daily_ration: 0, minimum_stock: 200, auto_daily: false },
  {
    name: 'Building Materials',
    unit: 'Units',
    daily_ration: 0,
    minimum_stock: 20,
    auto_daily: false,
  },
  { name: 'Seed Packets', unit: 'kg', daily_ration: 0, minimum_stock: 10, auto_daily: false },
  { name: 'Tools', unit: 'Units', daily_ration: 0, minimum_stock: 10, auto_daily: false },
  { name: 'Clothing', unit: 'Sets', daily_ration: 0, minimum_stock: 15, auto_daily: false },
];

const PROFESSION_RESOURCE_MAP: Record<string, Array<{ resource: string; amount: number }>> = {
  Engineer: [
    { resource: 'FOOD_RATION', amount: 1.25 },
    { resource: 'Purified Water', amount: 2.0 },
    { resource: 'Diesel Fuel', amount: 0.5 },
    { resource: 'Tools', amount: 0.1 },
  ],
  Scout: [
    { resource: 'FOOD_RATION', amount: 1.0 },
    { resource: 'Purified Water', amount: 1.75 },
    { resource: 'Diesel Fuel', amount: 0.25 },
  ],
  Medic: [
    { resource: 'FOOD_RATION', amount: 1.1 },
    { resource: 'Purified Water', amount: 1.8 },
    { resource: 'Antibiotics', amount: 0.4 },
    { resource: 'Medical Kits', amount: 0.3 },
  ],
  Guard: [
    { resource: 'FOOD_RATION', amount: 1.5 },
    { resource: 'Purified Water', amount: 2.0 },
    { resource: 'Ammunition', amount: 0.5 },
  ],
  Farmer: [
    { resource: 'FOOD_RATION', amount: 1.2 },
    { resource: 'Purified Water', amount: 2.5 },
    { resource: 'Seed Packets', amount: 0.3 },
  ],
  Cook: [
    { resource: 'FOOD_RATION', amount: 0.8 },
    { resource: 'Purified Water', amount: 3.0 },
  ],
  Mechanic: [
    { resource: 'FOOD_RATION', amount: 1.3 },
    { resource: 'Purified Water', amount: 1.5 },
    { resource: 'Diesel Fuel', amount: 0.3 },
    { resource: 'Tools', amount: 0.2 },
  ],
  Hunter: [
    { resource: 'FOOD_RATION', amount: 1.0 },
    { resource: 'Purified Water', amount: 1.5 },
    { resource: 'Ammunition', amount: 0.3 },
  ],
  Laborer: [
    { resource: 'FOOD_RATION', amount: 1.5 },
    { resource: 'Purified Water', amount: 2.0 },
  ],
  Leader: [
    { resource: 'FOOD_RATION', amount: 1.0 },
    { resource: 'Purified Water', amount: 1.5 },
  ],
};

const PROFESSION_WEIGHTS = [10, 10, 10, 19, 14, 7, 5, 7, 14, 4];

const PEOPLE_STATUSES = [
  'HEALTHY',
  'HEALTHY',
  'HEALTHY',
  'HEALTHY',
  'SICK',
  'INJURED',
  'AWAY',
  'DEAD',
] as const;

const EXPEDITION_STATUSES = [
  'PLANNED',
  'ONGOING',
  'RETURNED',
  'RETURNED',
  'RETURNED',
  'CANCELLED',
] as const;

const TRANSFER_STATUSES = [
  'PENDING',
  'APPROVED_SOURCE',
  'APPROVED_TARGET',
  'COMPLETED',
  'COMPLETED',
  'REJECTED',
] as const;

const TRANSFER_TYPES = ['RESOURCE', 'PERSON', 'MIXED'] as const;

const ADMISSION_AI_DECISIONS = ['ACCEPTED', 'ACCEPTED', 'PENDING', 'REJECTED', 'REJECTED'] as const;

const ADMISSION_FINAL_DECISIONS: Record<string, 'ACCEPTED' | 'REJECTED' | 'PENDING'> = {
  ACCEPTED: 'ACCEPTED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
};

const AUDIT_ACTIONS = [
  'CREATE_CAMP',
  'UPDATE_CAMP',
  'DELETE_CAMP',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'LOGIN',
  'LOGOUT',
  'CREATE_TRANSFER',
  'APPROVE_TRANSFER_SOURCE',
  'APPROVE_TRANSFER_TARGET',
  'COMPLETE_TRANSFER',
  'REJECT_TRANSFER',
  'CREATE_ADMISSION',
  'REVIEW_ADMISSION',
  'OVERRIDE_ADMISSION',
  'CREATE_EXPEDITION',
  'UPDATE_EXPEDITION_STATUS',
  'CANCEL_EXPEDITION',
  'CREATE_PERSON',
  'UPDATE_PERSON',
  'DELETE_PERSON',
  'CHANGE_PERSON_STATUS',
  'REASSIGN_PROFESSION',
  'CREATE_OVERRIDE',
  'MANUAL_INVENTORY_ADJUST',
  'CREATE_INVENTORY_ADJUSTMENT_REQUEST',
  'REVIEW_INVENTORY_ADJUSTMENT_REQUEST',
  'ACHIEVEMENT_UNLOCKED',
] as const;

const DESTINATIONS = [
  'North Relay Ruins',
  'Old Hospital Block',
  'East Service Tunnel',
  'South Freight Yard',
  'West Residential Zone',
  'Abandoned Factory',
  'River Crossing Point',
  'Dam Control Station',
  'Military Checkpoint',
  'Grocery Warehouse',
  'Pharmacy District',
  'Fuel Depot',
  'School Shelter',
  'Police Armory',
  'Construction Site',
  'Radio Tower Hill',
  'Subway Tunnel B',
  'Port Authority',
  'Forest Ranger Station',
  'Water Treatment Plant',
];

function generateFullName(): string {
  const firstNames = [
    'Elena',
    'Marcus',
    'Sofia',
    'Hiro',
    'Amara',
    'Darius',
    'Leila',
    'Omar',
    'Nadia',
    'Kael',
    'Rhea',
    'Tomas',
    'Ingrid',
    'Ravi',
    'Mei',
    'Bjorn',
    'Zara',
    'Caleb',
    'Yuki',
    'Diego',
    'Fiona',
    'Ivan',
    'Priya',
    'Lars',
    'Anya',
    'Mateo',
    'Hana',
    'Sage',
    'Kira',
    'Theo',
    'Naomi',
    'Axel',
    'Jada',
    'Kenji',
    'Lena',
    'Orion',
    'Vera',
    'Silas',
    'Mila',
    'Riku',
    'Aria',
    'Dorian',
    'Nova',
    'Finn',
    'Elara',
    'Zion',
    'Lyra',
    'Ash',
    'Cleo',
    'Soren',
    'Ivy',
    'Atlas',
    'Rosa',
    'Arlo',
    'Esme',
    'Kai',
    'Willow',
    'Otis',
    'Gemma',
    'Rudy',
    'Phoebe',
    'Miles',
    'Iris',
    'Hugo',
    'Cora',
    'Felix',
    'Tess',
    'Dean',
    'Lila',
    'Cole',
    'Romy',
    'Jude',
    'Maeve',
    'Grant',
    'Wren',
    'Beck',
    'Sage',
    'True',
    'Blair',
    'Reese',
  ];
  const lastNames = [
    'Stone',
    'Rivera',
    'Chen',
    'Patel',
    'Okafor',
    'Mueller',
    'Sato',
    'Johansson',
    'Park',
    'Cruz',
    'Nakamura',
    'Petrov',
    'Kim',
    'Santos',
    'Dubois',
    'Ibrahim',
    'Fischer',
    'Lopez',
    'Andersen',
    'Singh',
    'Garcia',
    'Martinez',
    'Robinson',
    'Clark',
    'Wright',
    'Hill',
    'Scott',
    'Adams',
    'Baker',
    'Carter',
    'Evans',
    'Foster',
    'Grant',
    'Hayes',
    'Price',
    'Reed',
    'Ross',
    'Ward',
    'Coleman',
    'Jenkins',
  ];
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

function generateSkills(professionIdx: number): string {
  const skillSets = [
    'Systems repair, structural engineering, power grid maintenance',
    'Reconnaissance, navigation, route mapping, stealth movement',
    'Emergency care, triage, wound treatment, disease prevention',
    'Perimeter security, threat assessment, weapon proficiency',
    'Crop cultivation, soil management, composting, seed preservation',
    'Food preparation, ration optimization, preservation techniques',
    'Vehicle repair, generator maintenance, plumbing, electrical work',
    'Tracking, trapping, wildlife knowledge, field dressing',
    'Construction, demolition, load management, excavation',
    'Team coordination, resource planning, conflict mediation, strategy',
  ];
  return skillSets[professionIdx] || 'General camp duties';
}

function generateHealthNotes(): string {
  const notes = [
    'Stable and fit for field work',
    'Mild dehydration but no chronic issues',
    'Fatigued but medically stable',
    'Light concussion fully resolved',
    'Recurring respiratory symptoms',
    'Under observation after long travel',
    'Minor lacerations, healing well',
    'Chronic joint pain, limited mobility',
    'Malnourished but recovering with proper diet',
    'Good overall condition, minor vitamin deficiency',
    'Stable vitals, clearance for light duties',
    'Exposure treated, now stable',
  ];
  return randomElement(notes);
}

function generateBackgroundNotes(): string {
  const notes = [
    'Previously coordinated supply chains for mobile shelters',
    'Former field medic with hospital triage experience',
    'Freelance tracker and route analyst',
    'Volunteered as support after convoy collapse',
    'Military logistics background, 8 years service',
    'Survived three camp collapses, adaptable to new environments',
    'Engineering background with construction management experience',
    'Former teacher with organizational skills',
    'Agricultural specialist from pre-outbreak farming cooperative',
    'Self-taught mechanic with fleet maintenance experience',
    'Security detail for refugee caravans across multiple sectors',
    'Hunting guide from rural region with extensive wilderness knowledge',
    'Community organizer with conflict resolution training',
    'Former warehouse manager with inventory experience',
  ];
  return randomElement(notes);
}

function generateAiReasoning(decision: string): string {
  if (decision === 'ACCEPTED') {
    return randomElement([
      'Useful medical support profile, stable behavior, and low operational risk.',
      'Excellent field mobility, strong scouting instincts, and adaptable survivability.',
      'Strong technical background with demonstrated reliability and low resource strain.',
      'Proven agricultural expertise with stable temperament suitable for long-term settlement.',
      'Security experience combined with disciplined approach and team compatibility.',
      'Versatile skill set with high adaptability and positive camp integration potential.',
    ]);
  }
  if (decision === 'REJECTED') {
    return randomElement([
      'Health profile and behavioral risk outweigh the short-term utility of the applicant.',
      'Health concerns and trust risk make the applicant unsuitable for intake.',
      'Unverifiable background combined with resource requirements exceeds camp capacity.',
      'Repeated behavioral flags in prior settlements indicate integration difficulty.',
      'Medical instability and unpredictable skill reliability present unacceptable risk.',
    ]);
  }
  return '';
}

async function main() {
  logger.info('=== GESTIÓN DEL FIN — LOAD TEST SEED ===');
  logger.info(`Target: ~11,500 records across all tables`);
  logger.info(`Time range: ${SYSTEM_START.toISOString()} to ${NOW.toISOString()}`);

  const startTime = Date.now();

  // ──────────────────────────────────────────────
  // 1. CLEANUP
  // ──────────────────────────────────────────────
  logger.info('Cleaning database...');
  const tables = [
    'audit_log',
    'achievement_notifications',
    'user_achievements',
    'achievement_stats',
    'achievement_roles',
    'achievements',
    'person_transfer_log',
    'profession_reassignment_log',
    'person_status_log',
    'contribution_overrides',
    'inventory_adjustment_request',
    'inventory_log',
    'inventory',
    'camp_transfer_item',
    'camp_transfers',
    'expedition_returned_resources',
    'expedition_found_resources',
    'expedition_allocated_resources',
    'expedition_members',
    'expeditions',
    'admission_requests',
    'professions_resources_amounts',
    'persons',
    'users',
    'role_permissions',
    'permissions',
    'roles',
    'resource_type',
    'professions',
    'camps',
    'system_config',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    } catch {
      // table may not exist, skip
    }
  }
  logger.info('Database cleaned.');

  // ──────────────────────────────────────────────
  // 2. STATIC MASTER DATA (from MockData)
  // ──────────────────────────────────────────────
  logger.info('Seeding static master data...');

  const ROLES_DATA = [
    {
      name: 'system_admin',
      description: 'Administrator with full read access and permission to manage visitor check-ins',
    },
    { name: 'worker', description: 'General camp worker access' },
    { name: 'resource_manager', description: 'Inventory and resource operations manager' },
    { name: 'travel_coordinator', description: 'Expedition and transfer coordination role' },
  ];
  await prisma.roles.createMany({ data: ROLES_DATA });
  const roles = await prisma.roles.findMany({ orderBy: { id: 'asc' } });
  const roleByName = new Map(roles.map((r) => [r.name, r.id]));

  const PERMISSIONS_DATA = [
    { name: 'camps.create', description: 'camps create' },
    { name: 'camps.read', description: 'camps read' },
    { name: 'camps.update', description: 'camps update' },
    { name: 'camps.delete', description: 'camps delete' },
    { name: 'people.create', description: 'people create' },
    { name: 'people.read', description: 'people read' },
    { name: 'people.update', description: 'people update' },
    { name: 'people.delete', description: 'people delete' },
    { name: 'people.status_log.create', description: 'people status log create' },
    { name: 'people.profession_reassign.create', description: 'people profession reassign create' },
    {
      name: 'people.contribution_override.create',
      description: 'people contribution override create',
    },
    { name: 'resources.create', description: 'resources create' },
    { name: 'resources.read', description: 'resources read' },
    { name: 'resources.update', description: 'resources update' },
    { name: 'resources.delete', description: 'resources delete' },
    { name: 'professions.create', description: 'professions create' },
    { name: 'professions.read', description: 'professions read' },
    { name: 'professions.update', description: 'professions update' },
    { name: 'professions.delete', description: 'professions delete' },
    { name: 'users.create', description: 'users create' },
    { name: 'users.read', description: 'users read' },
    { name: 'users.update', description: 'users update' },
    { name: 'users.delete', description: 'users delete' },
    { name: 'inventory.read', description: 'inventory read' },
    { name: 'inventory.audit.read', description: 'inventory audit read' },
    { name: 'inventory.adjust', description: 'inventory adjust' },
    { name: 'admission.create', description: 'admission create' },
    { name: 'admission.read', description: 'admission read' },
    { name: 'admission.review', description: 'admission review' },
    { name: 'transfers.create', description: 'transfers create' },
    { name: 'transfers.read', description: 'transfers read' },
    { name: 'transfers.schedule', description: 'transfers schedule' },
    { name: 'transfers.approve_source', description: 'transfers approve source' },
    { name: 'transfers.approve_target', description: 'transfers approve target' },
    { name: 'transfers.complete', description: 'transfers complete' },
    { name: 'transfers.reject', description: 'transfers reject' },
    { name: 'expeditions.create', description: 'expeditions create' },
    { name: 'expeditions.read', description: 'expeditions read' },
    { name: 'expeditions.update', description: 'expeditions update' },
    { name: 'expeditions.update_status', description: 'expeditions update status' },
    { name: 'expeditions.delete', description: 'expeditions delete' },
    { name: 'metrics.dashboard', description: 'metrics dashboard' },
    { name: 'metrics.resources', description: 'metrics resources' },
    { name: 'metrics.people', description: 'metrics people' },
    { name: 'metrics.expeditions', description: 'metrics expeditions' },
    { name: 'roles.create', description: 'roles create' },
    { name: 'roles.read', description: 'roles read' },
    { name: 'roles.update', description: 'roles update' },
    { name: 'roles.delete', description: 'roles delete' },
    { name: 'permissions.create', description: 'permissions create' },
    { name: 'permissions.read', description: 'permissions read' },
    { name: 'permissions.update', description: 'permissions update' },
    { name: 'permissions.delete', description: 'permissions delete' },
    { name: 'admin.bypass_camp_scoping', description: 'admin bypass camp scoping' },
    {
      name: 'inventory_adjustment_requests.create',
      description: 'inventory adjustment requests create',
    },
    {
      name: 'inventory_adjustment_requests.read_own',
      description: 'inventory adjustment requests read own',
    },
    {
      name: 'inventory_adjustment_requests.read',
      description: 'inventory adjustment requests read',
    },
    {
      name: 'inventory_adjustment_requests.review',
      description: 'inventory adjustment requests review',
    },
  ];
  await prisma.permissions.createMany({ data: PERMISSIONS_DATA });
  const allPermissions = await prisma.permissions.findMany({ orderBy: { id: 'asc' } });
  const permByName = new Map(allPermissions.map((p) => [p.name, p.id]));

  const ROLE_PERMISSION_MAP: Record<string, string[]> = {
    system_admin: [
      'camps.create',
      'camps.read',
      'camps.update',
      'camps.delete',
      'people.create',
      'people.read',
      'people.update',
      'people.delete',
      'people.status_log.create',
      'people.profession_reassign.create',
      'people.contribution_override.create',
      'resources.read',
      'professions.create',
      'professions.read',
      'professions.update',
      'professions.delete',
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'inventory.read',
      'inventory.audit.read',
      'admission.create',
      'admission.read',
      'admission.review',
      'transfers.read',
      'expeditions.read',
      'metrics.dashboard',
      'metrics.resources',
      'metrics.people',
      'metrics.expeditions',
      'roles.create',
      'roles.read',
      'roles.update',
      'roles.delete',
      'permissions.create',
      'permissions.read',
      'permissions.update',
      'permissions.delete',
      'admin.bypass_camp_scoping',
    ],
    worker: [
      'camps.read',
      'resources.read',
      'inventory.read',
      'inventory.adjust',
      'metrics.dashboard',
      'inventory_adjustment_requests.create',
      'inventory_adjustment_requests.read_own',
    ],
    resource_manager: [
      'camps.read',
      'people.read',
      'resources.create',
      'resources.read',
      'resources.update',
      'resources.delete',
      'inventory.read',
      'inventory.audit.read',
      'inventory.adjust',
      'transfers.create',
      'transfers.read',
      'transfers.schedule',
      'transfers.approve_source',
      'transfers.approve_target',
      'transfers.complete',
      'transfers.reject',
      'metrics.dashboard',
      'metrics.resources',
      'metrics.people',
      'inventory_adjustment_requests.read',
      'inventory_adjustment_requests.review',
    ],
    travel_coordinator: [
      'camps.read',
      'people.read',
      'resources.read',
      'professions.read',
      'inventory.read',
      'transfers.create',
      'transfers.read',
      'transfers.schedule',
      'transfers.approve_source',
      'transfers.approve_target',
      'transfers.complete',
      'transfers.reject',
      'expeditions.create',
      'expeditions.read',
      'expeditions.update',
      'expeditions.update_status',
      'expeditions.delete',
      'metrics.dashboard',
      'metrics.expeditions',
    ],
  };

  const rolePermRows: Array<{ role_id: number; permission_id: number }> = [];
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleByName.get(roleName);
    if (!roleId) throw new Error(`Role not found: ${roleName}`);
    for (const permName of permNames) {
      const permId = permByName.get(permName);
      if (!permId) throw new Error(`Permission not found: ${permName}`);
      rolePermRows.push({ role_id: roleId, permission_id: permId });
    }
  }
  await prisma.role_permissions.createMany({ data: rolePermRows });

  // Create achievements from MockData
  const ACHIEVEMENTS_DATA = [
    {
      name: 'Login Novice',
      description: 'Unlock your first session in the system.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=LN',
      trigger_rule: 'LOGIN',
    },
    {
      name: 'Consistent Access',
      description: 'Return often and keep your account active.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CA',
      trigger_rule: 'LOGIN',
    },
    {
      name: 'Night Watch Ready',
      description: 'Stay present when the camp needs steady hands.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=NW',
      trigger_rule: 'LOGIN',
    },
    {
      name: 'Camp Manager Novice',
      description: 'Create your first camp without hesitation.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CM1',
      trigger_rule: 'CAMP_CREATE',
    },
    {
      name: 'Camp Manager Expert',
      description: 'Build multiple camps and keep the network growing.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CM2',
      trigger_rule: 'CAMP_CREATE',
    },
    {
      name: 'Multi Camp Manager',
      description: 'Coordinate several camps at once with confidence.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=MCM',
      trigger_rule: 'CAMP_CREATE',
    },
    {
      name: 'Brave Returner',
      description: 'Bring a scouting team back safely.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=BR',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Brave Pathfinder',
      description: 'Lead a team through danger and return intact.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=BP',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Brave Expedition Captain',
      description: 'Guide repeated returns without losing momentum.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=BEC',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Diplomat Novice',
      description: 'Complete your first successful transfer.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=DN',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Diplomat Keeper',
      description: 'Balance movement between camps with steady judgment.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=DK',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Diplomat Master',
      description: 'Complete several transfers without disrupting operations.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=DM',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Inventory Novice',
      description: 'Perform your first manual inventory adjustment.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=IN',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Inventory Keeper',
      description: 'Keep the ledger stable through repeated adjustments.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=IK',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Ledger Guardian',
      description: 'Protect the stock records from drift and confusion.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=LG',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Resource Scout',
      description: 'Bring back the first useful haul from the field.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=RS',
      trigger_rule: 'EXPEDITION_FOUND_RESOURCES',
    },
    {
      name: 'Resource Finder',
      description: 'Collect enough supplies to matter for the camp.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=RF',
      trigger_rule: 'EXPEDITION_FOUND_RESOURCES',
    },
    {
      name: 'Resource Hauler',
      description: 'Return with a haul that changes the stock outlook.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=RH',
      trigger_rule: 'EXPEDITION_FOUND_RESOURCES',
    },
    {
      name: 'Healthy Routine',
      description: 'Keep the camp running with at least one healthy member.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=HR',
      trigger_rule: 'HEALTH_DAYS',
    },
    {
      name: 'Healthy Shift',
      description: 'Maintain a stable health baseline across the camp.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=HS',
      trigger_rule: 'HEALTH_DAYS',
    },
    {
      name: 'Healthy Watch',
      description: 'Keep conditions stable long enough to matter.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=HW',
      trigger_rule: 'HEALTH_DAYS',
    },
    {
      name: 'Periodic Check Starter',
      description: 'Let the automated checks run successfully.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=PCS',
      trigger_rule: 'PERIODIC_CHECK',
    },
    {
      name: 'Periodic Check Keeper',
      description: 'Keep the scheduled evaluations healthy and consistent.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=PCK',
      trigger_rule: 'PERIODIC_CHECK',
    },
    {
      name: 'Periodic Check Master',
      description: 'Support long-running automated evaluations without failure.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=PCM',
      trigger_rule: 'PERIODIC_CHECK',
    },
    {
      name: 'First Aid Route',
      description: 'Move medical support where it is needed most.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=FAR',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Supply Route',
      description: 'Complete a transfer that keeps camps supplied.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SR',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Courier Command',
      description: 'Orchestrate more than one successful handoff.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CC',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Login Specialist',
      description: 'Be available whenever the system needs attention.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=LS',
      trigger_rule: 'LOGIN',
    },
    {
      name: 'Command Console',
      description: 'Access the system often enough to keep it under control.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CCS',
      trigger_rule: 'LOGIN',
    },
    {
      name: 'Control Room Presence',
      description: 'Stay connected and ready to act.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CRP',
      trigger_rule: 'LOGIN',
    },
    {
      name: 'Crisis Commander',
      description: 'Create a camp when the network needs another anchor.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CRC',
      trigger_rule: 'CAMP_CREATE',
    },
    {
      name: 'Shelter Architect',
      description: 'Expand the camp network with steady leadership.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SA',
      trigger_rule: 'CAMP_CREATE',
    },
    {
      name: 'Network Builder',
      description: 'Turn one camp into a coordinated set of shelters.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=NB',
      trigger_rule: 'CAMP_CREATE',
    },
    {
      name: 'Field Support Brave',
      description: 'Return from the field with confidence and discipline.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=FSB',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Scout Brave',
      description: 'Lead a scouting route and bring everyone back.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SB',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Camp Brave',
      description: 'Repeat successful returns until it becomes routine.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CB',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Manual Tally Novice',
      description: 'Record the first manual inventory movement carefully.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=MTN',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Manual Tally Keeper',
      description: 'Keep manual counts aligned with reality.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=MTK',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Stock Sentinel',
      description: 'Defend the inventory from silent losses.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SS',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Supply Counter',
      description: 'Track enough adjustments to matter for planning.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SC',
      trigger_rule: 'INVENTORY_ADJUST',
    },
    {
      name: 'Field Logistics',
      description: 'Bring back resources that support the frontline.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=FL',
      trigger_rule: 'EXPEDITION_FOUND_RESOURCES',
    },
    {
      name: 'Cache Builder',
      description: 'Turn field recovery into a reliable stock buffer.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=CBU',
      trigger_rule: 'EXPEDITION_FOUND_RESOURCES',
    },
    {
      name: 'Recovery Haul',
      description: 'Collect enough supplies to stabilize the camp.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=RHA',
      trigger_rule: 'EXPEDITION_FOUND_RESOURCES',
    },
    {
      name: 'Medical Watch',
      description: 'Keep the camp healthy enough for long-term planning.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=MW',
      trigger_rule: 'HEALTH_DAYS',
    },
    {
      name: 'Stable Ledger',
      description: 'Keep the system healthy through steady oversight.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SL',
      trigger_rule: 'PERIODIC_CHECK',
    },
    {
      name: 'Operational Pulse',
      description: 'Support recurring checks without losing momentum.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=OP',
      trigger_rule: 'PERIODIC_CHECK',
    },
    {
      name: 'Rapid Route',
      description: 'Complete a transfer quickly and cleanly.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=RR',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Logistics Diplomat',
      description: 'Coordinate movement between camps without friction.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=LD',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Movement Master',
      description: 'Handle repeated transfers with confidence.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=MM',
      trigger_rule: 'TRANSFER_COMPLETE',
    },
    {
      name: 'Transit Guardian',
      description: 'Protect teams while they are away from camp.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=TG',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Scout Channel',
      description: 'Route expeditions and keep them moving safely.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=SCN',
      trigger_rule: 'EXPEDITION_RETURN',
    },
    {
      name: 'Journey Captain',
      description: 'Lead several teams back without losing pace.',
      icon_url: 'https://placehold.co/128x128/0f172a/f8fafc?text=JC',
      trigger_rule: 'EXPEDITION_RETURN',
    },
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
  await prisma.achievements.createMany({ data: ACHIEVEMENTS_DATA });
  const achievements = await prisma.achievements.findMany({ orderBy: { id: 'asc' } });
  const achievementByName = new Map(achievements.map((a) => [a.name, a.id]));

  const ACHIEVEMENT_ROLE_NAMES: Record<string, string[]> = {
    'Login Novice': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
    'Consistent Access': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
    'Night Watch Ready': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
    'Camp Manager Novice': ['system_admin'],
    'Camp Manager Expert': ['system_admin'],
    'Multi Camp Manager': ['system_admin'],
    'Brave Returner': ['worker', 'travel_coordinator'],
    'Brave Pathfinder': ['worker', 'travel_coordinator'],
    'Brave Expedition Captain': ['worker', 'travel_coordinator'],
    'Diplomat Novice': ['system_admin', 'travel_coordinator'],
    'Diplomat Keeper': ['system_admin', 'travel_coordinator'],
    'Diplomat Master': ['system_admin', 'travel_coordinator'],
    'Inventory Novice': ['resource_manager', 'system_admin'],
    'Inventory Keeper': ['resource_manager', 'system_admin'],
    'Ledger Guardian': ['resource_manager', 'system_admin'],
    'Resource Scout': ['worker', 'resource_manager', 'travel_coordinator'],
    'Resource Finder': ['worker', 'resource_manager', 'travel_coordinator'],
    'Resource Hauler': ['worker', 'resource_manager', 'travel_coordinator'],
    'Healthy Routine': ['worker', 'resource_manager', 'travel_coordinator'],
    'Healthy Shift': ['worker', 'resource_manager', 'travel_coordinator'],
    'Healthy Watch': ['worker', 'resource_manager', 'travel_coordinator'],
    'Periodic Check Starter': ['system_admin', 'resource_manager'],
    'Periodic Check Keeper': ['system_admin', 'resource_manager'],
    'Periodic Check Master': ['system_admin', 'resource_manager'],
    'First Aid Route': ['travel_coordinator'],
    'Supply Route': ['travel_coordinator'],
    'Courier Command': ['travel_coordinator'],
    'Login Specialist': ['system_admin'],
    'Command Console': ['system_admin'],
    'Control Room Presence': ['system_admin'],
    'Crisis Commander': ['system_admin'],
    'Shelter Architect': ['system_admin'],
    'Network Builder': ['system_admin'],
    'Field Support Brave': ['worker'],
    'Scout Brave': ['worker'],
    'Camp Brave': ['worker'],
    'Manual Tally Novice': ['resource_manager'],
    'Manual Tally Keeper': ['resource_manager'],
    'Stock Sentinel': ['resource_manager'],
    'Supply Counter': ['resource_manager'],
    'Field Logistics': ['resource_manager'],
    'Cache Builder': ['resource_manager'],
    'Recovery Haul': ['resource_manager'],
    'Medical Watch': ['resource_manager'],
    'Stable Ledger': ['resource_manager'],
    'Operational Pulse': ['resource_manager'],
    'Rapid Route': ['travel_coordinator'],
    'Logistics Diplomat': ['travel_coordinator'],
    'Movement Master': ['travel_coordinator'],
    'Transit Guardian': ['travel_coordinator'],
    'Scout Channel': ['travel_coordinator'],
    'Journey Captain': ['travel_coordinator'],
    'First Acceptance': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
    'Expedition Veteran': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
    'Supply Stabilizer': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
    'Transfer Coordinator': ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'],
  };

  const achievementRoleRows: Array<{ achievement_id: number; role_id: number }> = [];
  for (const [achName, roleNames] of Object.entries(ACHIEVEMENT_ROLE_NAMES)) {
    const achId = achievementByName.get(achName);
    if (!achId) throw new Error(`Achievement not found: ${achName}`);
    for (const roleName of roleNames) {
      const roleId = roleByName.get(roleName);
      if (!roleId) throw new Error(`Role not found for achievement: ${roleName}`);
      achievementRoleRows.push({ achievement_id: achId, role_id: roleId });
    }
  }
  for (const row of achievementRoleRows) {
    await prisma.$executeRaw`
      INSERT INTO achievement_roles (achievement_id, role_id)
      VALUES (${row.achievement_id}, ${row.role_id})
      ON CONFLICT (achievement_id, role_id) DO NOTHING
    `;
  }

  const achievementStatsRows = achievements.map((a) => ({
    achievement_id: a.id,
    total_unlocks: 0,
    unlock_rate: 0,
    average_unlock_days: 0,
  }));
  for (const row of achievementStatsRows) {
    await prisma.$executeRaw`
      INSERT INTO achievement_stats (achievement_id, total_unlocks, unlock_rate, average_unlock_days, updated_at)
      VALUES (${row.achievement_id}, ${row.total_unlocks}, ${row.unlock_rate}, ${row.average_unlock_days}, CURRENT_TIMESTAMP)
      ON CONFLICT (achievement_id) DO NOTHING
    `;
  }

  // ──────────────────────────────────────────────
  // 3. CAMPS
  // ──────────────────────────────────────────────
  logger.info('Seeding camps...');
  await prisma.camps.createMany({
    data: CAMP_DEFINITIONS.filter((c) => c.aiPrompt !== null).map((c) => ({
      name: c.name,
      location: c.location,
      status: c.status,
      ai_context_prompt: c.aiPrompt,
    })),
  });
  await prisma.camps.create({
    data: {
      name: 'Foxtrot Fallback',
      location: 'Grid Sector 15',
      status: 'ABANDONED',
    },
  });
  const camps = await prisma.camps.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { id: 'asc' },
  });
  const allCamps = await prisma.camps.findMany({ orderBy: { id: 'asc' } });
  logger.info(`Created ${camps.length} active camps + 1 abandoned`);

  // ──────────────────────────────────────────────
  // 4. PROFESSIONS & RESOURCE TYPES
  // ──────────────────────────────────────────────
  logger.info('Seeding professions and resource types...');
  await prisma.professions.createMany({ data: PROFESSIONS_DATA });
  const professions = await prisma.professions.findMany({ orderBy: { id: 'asc' } });
  const profByName = new Map(professions.map((p) => [p.name, p.id]));

  await prisma.resource_types.createMany({ data: RESOURCE_TYPES_DATA });
  const resourceTypes = await prisma.resource_types.findMany({ orderBy: { id: 'asc' } });
  const rtByName = new Map(resourceTypes.map((r) => [r.name, r.id]));

  const profResourceRows: Array<{
    profession_id: number;
    resource_type_id: number;
    amount: number;
  }> = [];
  for (const [profName, resources] of Object.entries(PROFESSION_RESOURCE_MAP)) {
    const profId = profByName.get(profName);
    if (!profId) throw new Error(`Profession not found: ${profName}`);
    for (const r of resources) {
      const rtId = rtByName.get(r.resource);
      if (!rtId) throw new Error(`Resource type not found: ${r.resource}`);
      profResourceRows.push({ profession_id: profId, resource_type_id: rtId, amount: r.amount });
    }
  }
  await prisma.professions_resources_amounts.createMany({ data: profResourceRows });

  // ──────────────────────────────────────────────
  // 5. USERS
  // ──────────────────────────────────────────────
  logger.info('Seeding users...');
  const passwordHash = await hash('password', 4);

  const USERS_PER_CAMP = [
    {
      campIdx: 0,
      roleCounts: { system_admin: 2, resource_manager: 2, travel_coordinator: 2, worker: 3 },
    },
    {
      campIdx: 1,
      roleCounts: { system_admin: 1, resource_manager: 2, travel_coordinator: 1, worker: 2 },
    },
    {
      campIdx: 2,
      roleCounts: { system_admin: 1, resource_manager: 2, travel_coordinator: 2, worker: 2 },
    },
    {
      campIdx: 3,
      roleCounts: { system_admin: 1, resource_manager: 1, travel_coordinator: 1, worker: 2 },
    },
    {
      campIdx: 4,
      roleCounts: { system_admin: 1, resource_manager: 1, travel_coordinator: 1, worker: 1 },
    },
    {
      campIdx: 5,
      roleCounts: { system_admin: 1, resource_manager: 1, travel_coordinator: 1, worker: 1 },
    },
  ];

  const userRows: Array<{
    camp_id: number;
    role_id: number;
    username: string;
    password_hash: string;
    is_active: boolean;
  }> = [];

  const roleCounters = new Map<string, number>();

  for (const campConfig of USERS_PER_CAMP) {
    const campId = allCamps[campConfig.campIdx].id;
    for (const [roleName, count] of Object.entries(campConfig.roleCounts)) {
      const roleId = roleByName.get(roleName);
      if (!roleId) throw new Error(`Role not found: ${roleName}`);
      for (let i = 0; i < count; i++) {
        const counter = (roleCounters.get(roleName) ?? 0) + 1;
        roleCounters.set(roleName, counter);
        userRows.push({
          camp_id: campId,
          role_id: roleId,
          username: `${roleName}_${counter}`,
          password_hash: passwordHash,
          is_active: campConfig.campIdx < 5,
        });
      }
    }
  }
  await prisma.users.createMany({ data: userRows });
  const users = await prisma.users.findMany({ orderBy: { id: 'asc' } });
  logger.info(`Created ${users.length} users`);

  // ──────────────────────────────────────────────
  // 6. PEOPLE
  // ──────────────────────────────────────────────
  logger.info('Seeding people...');
  const totalPopulation = 350;
  const activeCamps = camps;
  const campPopulations: number[] = [];
  const totalWeight = CAMP_DEFINITIONS.filter((c, i) => i < 5).reduce(
    (s, c) => s + c.populationWeight,
    0,
  );

  for (let i = 0; i < activeCamps.length; i++) {
    const weight = CAMP_DEFINITIONS[i].populationWeight;
    const count = Math.round((weight / totalWeight) * totalPopulation);
    campPopulations.push(count);
  }
  // Adjust to hit exactly 350
  const currentTotal = campPopulations.reduce((a, b) => a + b, 0);
  campPopulations[0] += totalPopulation - currentTotal;

  const personRows: Array<{
    camp_id: number;
    profession_id: number;
    full_name: string;
    age: number;
    blood_type: string;
    skills_summary: string;
    status: string;
    admitted_at: Date;
  }> = [];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  for (let campIdx = 0; campIdx < activeCamps.length; campIdx++) {
    const campId = activeCamps[campIdx].id;
    const popSize = campPopulations[campIdx];

    for (let p = 0; p < popSize; p++) {
      const profIdx = weightedRandom(
        professions.map((_, i) => i),
        PROFESSION_WEIGHTS,
      );
      const prof = professions[profIdx];
      const admittedAt = randomDate(
        new Date(SYSTEM_START.getTime() + 15 * 24 * 60 * 60 * 1000),
        NOW,
      );
      const status = weightedRandom(
        ['HEALTHY', 'SICK', 'INJURED', 'AWAY', 'DEAD'] as const,
        [65, 12, 10, 8, 5],
      );

      personRows.push({
        camp_id: campId,
        profession_id: prof.id,
        full_name: generateFullName(),
        age: randomInt(16, 65),
        blood_type: randomElement(bloodTypes),
        skills_summary: generateSkills(profIdx),
        status,
        admitted_at: admittedAt,
      });
    }
  }
  await prisma.people.createMany({ data: personRows as any });
  const people = await prisma.people.findMany({ orderBy: { id: 'asc' } });
  logger.info(`Created ${people.length} people`);

  // ──────────────────────────────────────────────
  // 7. ADMISSION REQUESTS
  // ──────────────────────────────────────────────
  logger.info('Seeding admission requests...');
  const admissionRows: Array<{
    camp_id: number;
    applicant_name: string;
    applicant_age: number;
    applicant_skills: string;
    health_notes: string;
    background_notes: string;
    ai_decision: string;
    ai_reasoning: string | null;
    ai_confidence: number | null;
    ai_suggested_profession: string | null;
    ai_profession_id: number | null;
    final_decision: string;
    reviewed_by: number | null;
    reviewed_at: Date | null;
    admitted_by: string | null;
    person_id: number | null;
  }> = [];

  for (let i = 0; i < 150; i++) {
    const camp = randomElement(activeCamps);
    const aiDecision = randomElement([
      'ACCEPTED',
      'ACCEPTED',
      'PENDING',
      'REJECTED',
      'REJECTED',
    ] as const);
    const finalDecision =
      aiDecision === 'PENDING' ? 'PENDING' : (aiDecision as 'ACCEPTED' | 'REJECTED');
    const createdAt = randomDate(SYSTEM_START, NOW);

    const profSuggestion = randomElement(professions);
    const campUsers = users.filter((u) => u.camp_id === camp.id);
    const reviewedByUser = campUsers.length > 0 ? randomElement(campUsers) : null;

    let reviewedBy: number | null = null;
    let reviewedAt: Date | null = null;
    let admittedBy: string | null = null;

    if (finalDecision !== 'PENDING') {
      const useAi = Math.random() > 0.5;
      if (useAi) {
        admittedBy = 'AI';
      } else {
        reviewedBy = reviewedByUser?.id ?? null;
        reviewedAt =
          reviewedBy !== null
            ? randomDate(
                new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000),
                new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
              )
            : null;
      }
    }

    admissionRows.push({
      camp_id: camp.id,
      applicant_name: generateFullName(),
      applicant_age: randomInt(14, 60),
      applicant_skills: generateSkills(randomInt(0, professions.length - 1)),
      health_notes: generateHealthNotes(),
      background_notes: generateBackgroundNotes(),
      ai_decision: aiDecision,
      ai_reasoning: aiDecision !== 'PENDING' ? generateAiReasoning(aiDecision) : null,
      ai_confidence:
        aiDecision !== 'PENDING' ? parseFloat((0.75 + Math.random() * 0.2).toFixed(2)) : null,
      ai_suggested_profession: aiDecision !== 'PENDING' ? profSuggestion.name : null,
      ai_profession_id: aiDecision !== 'PENDING' ? profSuggestion.id : null,
      final_decision: finalDecision,
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
      admitted_by: admittedBy,
      person_id: null,
    });
  }
  await prisma.admission_requests.createMany({ data: admissionRows as any });
  const admissionRequests = await prisma.admission_requests.findMany({ orderBy: { id: 'asc' } });
  logger.info(`Created ${admissionRequests.length} admission requests`);

  // ──────────────────────────────────────────────
  // 8. INVENTORIES + INITIAL LOGS
  // ──────────────────────────────────────────────
  logger.info('Seeding inventories...');

  const INITIAL_INVENTORY_AMOUNTS: Record<string, Record<string, number>> = {
    'Alpha Outpost': {
      FOOD_RATION: 2500,
      'Purified Water': 5000,
      Antibiotics: 200,
      'Diesel Fuel': 300,
      'Medical Kits': 120,
      Ammunition: 1500,
      'Building Materials': 80,
      'Seed Packets': 50,
      Tools: 45,
      Clothing: 70,
    },
    'Beta Sanctuary': {
      FOOD_RATION: 1800,
      'Purified Water': 3500,
      Antibiotics: 80,
      'Diesel Fuel': 180,
      'Medical Kits': 90,
      Ammunition: 1000,
      'Building Materials': 40,
      'Seed Packets': 30,
      Tools: 25,
      Clothing: 45,
    },
    'Gamma Bastion': {
      FOOD_RATION: 2000,
      'Purified Water': 4200,
      Antibiotics: 120,
      'Diesel Fuel': 250,
      'Medical Kits': 60,
      Ammunition: 800,
      'Building Materials': 60,
      'Seed Packets': 25,
      Tools: 35,
      Clothing: 55,
    },
    'Delta Haven': {
      FOOD_RATION: 1200,
      'Purified Water': 2500,
      Antibiotics: 150,
      'Diesel Fuel': 100,
      'Medical Kits': 150,
      Ammunition: 600,
      'Building Materials': 25,
      'Seed Packets': 15,
      Tools: 15,
      Clothing: 30,
    },
    'Echo Forward': {
      FOOD_RATION: 800,
      'Purified Water': 1600,
      Antibiotics: 60,
      'Diesel Fuel': 120,
      'Medical Kits': 40,
      Ammunition: 400,
      'Building Materials': 50,
      'Seed Packets': 10,
      Tools: 40,
      Clothing: 20,
    },
  };

  const inventoryRows: Array<{ camp_id: number; resource_type_id: number; quantity: number }> = [];
  const initialLogRows: Array<{
    camp_id: number;
    resource_type_id: number;
    logged_by: number | null;
    log_type: string;
    quantity_change: number;
    description: string;
    logged_at: Date;
  }> = [];

  for (const campDef of CAMP_DEFINITIONS) {
    const camp = allCamps.find((c) => c.name === campDef.name);
    if (!camp) continue;
    const amounts = INITIAL_INVENTORY_AMOUNTS[campDef.name];
    if (!amounts) continue;

    for (const [rtName, qty] of Object.entries(amounts)) {
      const rtId = rtByName.get(rtName);
      if (!rtId) continue;

      inventoryRows.push({
        camp_id: camp.id,
        resource_type_id: rtId,
        quantity: qty,
      });

      initialLogRows.push({
        camp_id: camp.id,
        resource_type_id: rtId,
        logged_by: null,
        log_type: 'MANUAL_IN',
        quantity_change: qty,
        description: `Opening inventory balance for ${campDef.name}`,
        logged_at: new Date(SYSTEM_START.getTime() + 2 * 24 * 60 * 60 * 1000),
      });
    }
  }

  await prisma.inventories.createMany({ data: inventoryRows });
  await prisma.inventory_logs.createMany({ data: initialLogRows as any });
  logger.info(`Created ${inventoryRows.length} inventory records`);

  // ──────────────────────────────────────────────
  // 9. EXPEDITIONS
  // ──────────────────────────────────────────────
  logger.info('Seeding expeditions...');
  const expeditionRows: Array<{
    camp_id: number;
    destination: string;
    status: string;
    created_by: number;
    departure_date: Date;
    expected_return_date: Date;
    actual_return_date: Date | null;
    max_return_date: Date;
    notes: string;
  }> = [];

  const expeditionMemberRows: Array<{ expedition_id: number; person_id: number }> = [];
  const expeditionAllocRows: Array<{
    expedition_id: number;
    resource_type_id: number;
    amount: number;
  }> = [];
  const expeditionFoundRows: Array<{
    expedition_id: number;
    resource_type_id: number;
    amount: number;
  }> = [];
  const expeditionReturnedRows: Array<{
    expedition_id: number;
    resource_type_id: number;
    amount: number;
  }> = [];

  interface ExpeditionWithId {
    id: number;
    camp_id: number;
    status: string;
    departure_date: Date;
  }
  const createdExpeditions: ExpeditionWithId[] = [];

  for (let i = 0; i < 90; i++) {
    const camp = randomElement(activeCamps);
    const status = randomElement([
      'PLANNED',
      'ONGOING',
      'RETURNED',
      'RETURNED',
      'RETURNED',
      'CANCELLED',
    ] as const);
    const depDate = randomDate(
      new Date(SYSTEM_START.getTime() + 30 * 24 * 60 * 60 * 1000),
      new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000),
    );
    const expReturn = new Date(depDate.getTime() + randomInt(2, 6) * 24 * 60 * 60 * 1000);
    const maxReturn = new Date(expReturn.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000);
    const actualReturn =
      status === 'RETURNED'
        ? new Date(expReturn.getTime() + randomInt(-1, 2) * 24 * 60 * 60 * 1000)
        : null;

    const campUsers = users.filter((u) => u.camp_id === camp.id);
    const creator = campUsers.length > 0 ? randomElement(campUsers) : users[0];

    expeditionRows.push({
      camp_id: camp.id,
      destination: randomElement(DESTINATIONS),
      status,
      created_by: creator.id,
      departure_date: depDate,
      expected_return_date: expReturn,
      actual_return_date: actualReturn,
      max_return_date: maxReturn,
      notes: faker.lorem.sentence({ min: 5, max: 15 }),
    });
  }

  for (let i = 0; i < expeditionRows.length; i += 50) {
    const chunk = expeditionRows.slice(i, i + 50);
    await prisma.expeditions.createMany({ data: chunk as any });
  }

  const insertedExpeditions = await prisma.expeditions.findMany({ orderBy: { id: 'asc' } });

  // Create expedition members
  for (const exp of insertedExpeditions) {
    const campPeople = people.filter((p) => p.camp_id === exp.camp_id && p.status === 'HEALTHY');
    if (campPeople.length === 0) continue;

    const memberCount = Math.min(randomInt(2, 6), campPeople.length);
    const shuffled = [...campPeople].sort(() => Math.random() - 0.5);
    for (let m = 0; m < memberCount; m++) {
      expeditionMemberRows.push({ expedition_id: exp.id, person_id: shuffled[m].id });
    }
  }
  if (expeditionMemberRows.length > 0) {
    for (let i = 0; i < expeditionMemberRows.length; i += BATCH_SIZE) {
      await prisma.expedition_members.createMany({
        data: expeditionMemberRows.slice(i, i + BATCH_SIZE),
      });
    }
  }

  // Create allocated resources for expeditions (capped by available inventory)
  const inventoryByCamp = new Map<number, Map<number, number>>();
  for (const inv of inventoryRows) {
    if (!inventoryByCamp.has(inv.camp_id)) {
      inventoryByCamp.set(inv.camp_id, new Map());
    }
    inventoryByCamp.get(inv.camp_id)!.set(inv.resource_type_id, inv.quantity);
  }

  for (const exp of insertedExpeditions) {
    const resCount = randomInt(2, 4);
    const shuffledRT = [...resourceTypes].sort(() => Math.random() - 0.5);
    const campInv = inventoryByCamp.get(exp.camp_id);
    for (let r = 0; r < resCount && r < shuffledRT.length; r++) {
      const rt = shuffledRT[r];
      const maxQty = campInv ? (campInv.get(rt.id) ?? 500) : 500;
      const cappedMax = Math.min(maxQty, 50);
      if (cappedMax < 1) continue;
      const amount = parseFloat(
        Math.min(randomInt(1, cappedMax) + Math.random(), maxQty * 0.75).toFixed(1),
      );
      expeditionAllocRows.push({ expedition_id: exp.id, resource_type_id: rt.id, amount });
    }
  }
  if (expeditionAllocRows.length > 0) {
    for (let i = 0; i < expeditionAllocRows.length; i += BATCH_SIZE) {
      await prisma.expedition_allocated_resources.createMany({
        data: expeditionAllocRows.slice(i, i + BATCH_SIZE),
      });
    }
  }

  // Found resources (only for RETURNED expeditions)
  const returnedExps = insertedExpeditions.filter((e) => e.status === 'RETURNED');
  for (const exp of returnedExps) {
    if (Math.random() > 0.6) continue; // only ~40% return with finds
    const foundCount = randomInt(1, 3);
    const shuffledRT = [...resourceTypes].sort(() => Math.random() - 0.5);
    for (let r = 0; r < foundCount && r < shuffledRT.length; r++) {
      const rt = shuffledRT[r];
      const amount = parseFloat((randomInt(2, 20) + Math.random()).toFixed(1));
      expeditionFoundRows.push({ expedition_id: exp.id, resource_type_id: rt.id, amount });
    }
  }
  if (expeditionFoundRows.length > 0) {
    for (let i = 0; i < expeditionFoundRows.length; i += BATCH_SIZE) {
      await prisma.expedition_found_resources.createMany({
        data: expeditionFoundRows.slice(i, i + BATCH_SIZE),
      });
    }
  }

  // Returned resources (only for RETURNED expeditions, usually less than allocated)
  for (const exp of returnedExps) {
    const allocs = expeditionAllocRows.filter((a) => a.expedition_id === exp.id);
    for (const alloc of allocs) {
      if (Math.random() > 0.5) continue;
      const returnAmount = parseFloat((alloc.amount * (0.1 + Math.random() * 0.6)).toFixed(1));
      expeditionReturnedRows.push({
        expedition_id: exp.id,
        resource_type_id: alloc.resource_type_id,
        amount: returnAmount,
      });
    }
  }
  if (expeditionReturnedRows.length > 0) {
    for (let i = 0; i < expeditionReturnedRows.length; i += BATCH_SIZE) {
      await prisma.expedition_returned_resources.createMany({
        data: expeditionReturnedRows.slice(i, i + BATCH_SIZE),
      });
    }
  }

  logger.info(`Created ${insertedExpeditions.length} expeditions with members and resources`);

  // ──────────────────────────────────────────────
  // 10. TRANSFERS
  // ──────────────────────────────────────────────
  logger.info('Seeding camp transfers...');
  const transferRows: Array<{
    requesting_camp: number;
    target_camp: number;
    status: string;
    type: string;
    notes: string;
    requested_by: number;
    leader_person_id: number | null;
    scheduled_delivery_date: Date | null;
    approved_by_source: number | null;
    approved_by_target: number | null;
    approved_source_at: Date | null;
    approved_target_at: Date | null;
  }> = [];

  const transferItemRows: Array<{
    camp_transfer_id: number;
    item_type: string;
    resource_type_id: number | null;
    person_id: number | null;
    quantity: number;
  }> = [];

  for (let i = 0; i < 80; i++) {
    const fromCamp = randomElement(activeCamps);
    let toCamp = randomElement(activeCamps.filter((c) => c.id !== fromCamp.id));
    if (!toCamp) toCamp = activeCamps[0];

    const status = randomElement([
      'PENDING',
      'APPROVED_SOURCE',
      'APPROVED_TARGET',
      'COMPLETED',
      'COMPLETED',
      'REJECTED',
    ] as const);
    const type: 'RESOURCE' | 'PERSON' | 'MIXED' =
      status === 'COMPLETED' && Math.random() > 0.5
        ? 'MIXED'
        : Math.random() > 0.5
          ? 'RESOURCE'
          : 'PERSON';

    const fromCampUsers = users.filter((u) => u.camp_id === fromCamp.id);
    const requester = fromCampUsers.length > 0 ? randomElement(fromCampUsers) : users[0];

    const needsFutureDate = status === 'PENDING' || status === 'APPROVED_SOURCE';
    const createdAt = needsFutureDate
      ? new Date(NOW.getTime() - randomInt(1, 5) * 24 * 60 * 60 * 1000)
      : randomDate(new Date(SYSTEM_START.getTime() + 45 * 24 * 60 * 60 * 1000), NOW);

    const scheduledDelivery = needsFutureDate
      ? new Date(NOW.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000)
      : new Date(createdAt.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000);

    const approveSourceAt =
      status !== 'PENDING'
        ? new Date(createdAt.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000)
        : null;
    const approveTargetAt =
      status === 'APPROVED_TARGET' || status === 'COMPLETED'
        ? new Date((approveSourceAt || createdAt).getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000)
        : null;

    const fromCampPeople = people.filter((p) => p.camp_id === fromCamp.id && p.status !== 'DEAD');
    const leader =
      fromCampPeople.length > 0 && type !== 'RESOURCE' ? randomElement(fromCampPeople) : null;

    transferRows.push({
      requesting_camp: fromCamp.id,
      target_camp: toCamp.id,
      status,
      type,
      notes: faker.lorem.sentence({ min: 4, max: 12 }),
      requested_by: requester.id,
      leader_person_id: leader ? leader.id : null,
      scheduled_delivery_date: scheduledDelivery,
      approved_by_source: approveSourceAt ? requester.id : null,
      approved_by_target: approveTargetAt ? requester.id : null,
      approved_source_at: approveSourceAt,
      approved_target_at: approveTargetAt,
    });
  }

  await prisma.camp_transfers.createMany({ data: transferRows as any });
  const transfers = await prisma.camp_transfers.findMany({ orderBy: { id: 'asc' } });

  const transferInventoryByCamp = new Map<number, Map<number, number>>();
  const allInventories = await prisma.inventories.findMany();
  for (const inv of allInventories) {
    if (!transferInventoryByCamp.has(inv.camp_id)) {
      transferInventoryByCamp.set(inv.camp_id, new Map());
    }
    transferInventoryByCamp.get(inv.camp_id)!.set(inv.resource_type_id, Number(inv.quantity));
  }

  const personTransferPersonCount = new Map<number, number>();
  for (const transfer of transfers) {
    const itemCount = randomInt(1, 4);
    let personCount = 0;
    const campInv = transferInventoryByCamp.get(transfer.requesting_camp);
    const usedPerRt = new Map<number, number>();
    for (let item = 0; item < itemCount; item++) {
      const isPerson =
        transfer.type === 'PERSON' ||
        (transfer.type === 'MIXED' && item === 0 && Math.random() > 0.5);

      if (isPerson) {
        const fromPeople = people.filter(
          (p) => p.camp_id === transfer.requesting_camp && p.status !== 'DEAD',
        );
        if (fromPeople.length > 0) {
          const chosen = randomElement(fromPeople);
          transferItemRows.push({
            camp_transfer_id: transfer.id,
            item_type: 'PERSON',
            resource_type_id: null,
            person_id: chosen.id,
            quantity: 1,
          });
          personCount++;
        }
      } else {
        const rt = randomElement(resourceTypes);
        const available = campInv ? (campInv.get(rt.id) ?? 500) : 500;
        const alreadyUsed = usedPerRt.get(rt.id) ?? 0;
        const remaining = Math.max(0, available - alreadyUsed);
        const cappedMax = Math.min(remaining, 50);
        if (cappedMax < 1) continue;
        const qty = parseFloat((randomInt(1, cappedMax) + Math.random()).toFixed(1));
        usedPerRt.set(rt.id, alreadyUsed + qty);
        transferItemRows.push({
          camp_transfer_id: transfer.id,
          item_type: 'RESOURCE',
          resource_type_id: rt.id,
          person_id: null,
          quantity: qty,
        });
      }
    }
    if (personCount > 0) {
      personTransferPersonCount.set(transfer.id, personCount);
    }
  }

  const foodRationId = rtByName.get('FOOD_RATION');
  if (foodRationId) {
    for (const [transferId, personCount] of personTransferPersonCount) {
      const existingRation = transferItemRows.find(
        (ti) =>
          ti.camp_transfer_id === transferId &&
          ti.item_type === 'RESOURCE' &&
          ti.resource_type_id === foodRationId,
      );
      if (existingRation) continue;
      const transfer = transfers.find((t) => t.id === transferId);
      if (!transfer) continue;
      const campInv = transferInventoryByCamp.get(transfer.requesting_camp);
      const availableFood = campInv ? (campInv.get(foodRationId) ?? 0) : 0;
      const minRations = personCount * 2 * 3;
      if (availableFood >= minRations) {
        transferItemRows.push({
          camp_transfer_id: transferId,
          item_type: 'RESOURCE',
          resource_type_id: foodRationId,
          person_id: null,
          quantity: minRations,
        });
      }
    }
  }
  if (transferItemRows.length > 0) {
    for (let i = 0; i < transferItemRows.length; i += BATCH_SIZE) {
      await prisma.camp_transfer_items.createMany({
        data: transferItemRows.slice(i, i + BATCH_SIZE) as any,
      });
    }
  }
  logger.info(`Created ${transfers.length} transfers with items`);

  // ──────────────────────────────────────────────
  // 11. CONTRIBUTION OVERRIDES
  // ──────────────────────────────────────────────
  logger.info('Seeding contribution overrides...');
  const overrideRows: Array<{
    person_id: number;
    resource_type_id: number;
    reason: string;
    start_date: Date;
    end_date: Date | null;
    created_by: number | null;
    amount: number;
  }> = [];

  for (let i = 0; i < 50; i++) {
    const person = randomElement(people);
    const rt = randomElement(resourceTypes);
    const overrideUser = users.find((u) => u.camp_id === person.camp_id) || randomElement(users);
    const startDate = randomDate(new Date(SYSTEM_START.getTime() + 60 * 24 * 60 * 60 * 1000), NOW);
    const endDate =
      Math.random() > 0.3
        ? new Date(startDate.getTime() + randomInt(3, 30) * 24 * 60 * 60 * 1000)
        : null;

    overrideRows.push({
      person_id: person.id,
      resource_type_id: rt.id,
      reason: faker.lorem.sentence({ min: 3, max: 8 }),
      start_date: startDate,
      end_date: endDate,
      created_by: overrideUser.id,
      amount: parseFloat((Math.random() * 2).toFixed(2)),
    });
  }
  await prisma.contribution_overrides.createMany({ data: overrideRows });

  // ──────────────────────────────────────────────
  // 12. INVENTORY ADJUSTMENT REQUESTS
  // ──────────────────────────────────────────────
  logger.info('Seeding inventory adjustment requests...');
  const adjRequestRows: Array<{
    camp_id: number;
    created_by: number;
    status: string;
    adjustment_type: string;
    resource_type_id: number;
    quantity: number;
    reason: string;
    reviewed_by: number | null;
    reviewed_at: Date | null;
  }> = [];

  for (let i = 0; i < 200; i++) {
    const camp = randomElement(activeCamps);
    const campUsers = users.filter((u) => u.camp_id === camp.id);
    const requester = campUsers.length > 0 ? randomElement(campUsers) : randomElement(users);
    const rt = randomElement(resourceTypes);
    const status = randomElement(['PENDING', 'APPROVED', 'REJECTED'] as const);
    const adjType = randomElement(['MANUAL_IN', 'MANUAL_OUT'] as const);

    const createdAt = randomDate(new Date(SYSTEM_START.getTime() + 30 * 24 * 60 * 60 * 1000), NOW);

    adjRequestRows.push({
      camp_id: camp.id,
      created_by: requester.id,
      status,
      adjustment_type: adjType,
      resource_type_id: rt.id,
      quantity: parseFloat((randomInt(5, 200) + Math.random()).toFixed(1)),
      reason: faker.lorem.sentence({ min: 3, max: 8 }),
      reviewed_by: status !== 'PENDING' ? requester.id : null,
      reviewed_at:
        status !== 'PENDING'
          ? new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000)
          : null,
    });
  }
  await prisma.inventory_adjustment_requests.createMany({ data: adjRequestRows as any });
  logger.info(`Created ${adjRequestRows.length} inventory adjustment requests`);

  // ──────────────────────────────────────────────
  // 13. BULK INVENTORY LOGS
  // ──────────────────────────────────────────────
  logger.info('Seeding bulk inventory logs (~5000 entries)...');
  const bulkLogRows: Array<{
    camp_id: number;
    resource_type_id: number;
    logged_by: number | null;
    log_type: string;
    quantity_change: number;
    description: string;
    logged_at: Date;
  }> = [];

  const logTypes = [
    'DAILY_RATION',
    'DAILY_GAIN',
    'MANUAL_IN',
    'MANUAL_OUT',
    'EXPEDITION_OUT',
    'EXPEDITION_IN',
    'TRANSFER_OUT',
    'TRANSFER_IN',
  ];
  const dailyLogWeights = [45, 5, 10, 10, 5, 5, 10, 10];

  // Generate ~5000 log entries spread across 180 days
  const entriesPerDay = Math.round(5000 / DAYS_OF_OPERATION);

  for (let day = 0; day < DAYS_OF_OPERATION; day++) {
    const logDate = new Date(SYSTEM_START.getTime() + day * 24 * 60 * 60 * 1000);

    for (let e = 0; e < entriesPerDay; e++) {
      const camp = randomElement(activeCamps);
      const logType = weightedRandom(logTypes, dailyLogWeights);
      const rt = randomElement(resourceTypes);

      let qty = 0;
      let desc = '';
      switch (logType) {
        case 'DAILY_RATION':
          qty = -parseFloat((randomInt(10, 150) + Math.random()).toFixed(1));
          desc = `Daily ration consumption — ${rt.name}`;
          break;
        case 'DAILY_GAIN':
          qty = parseFloat((randomInt(5, 50) + Math.random()).toFixed(1));
          desc = `Daily resource acquisition — ${rt.name}`;
          break;
        case 'MANUAL_IN':
          qty = parseFloat((randomInt(10, 200) + Math.random()).toFixed(1));
          desc = `Manual inventory adjustment — ${rt.name}`;
          break;
        case 'MANUAL_OUT':
          qty = -parseFloat((randomInt(5, 100) + Math.random()).toFixed(1));
          desc = `Manual inventory removal — ${rt.name}`;
          break;
        case 'EXPEDITION_OUT':
          qty = -parseFloat((randomInt(10, 80) + Math.random()).toFixed(1));
          desc = `Resources allocated to expedition`;
          break;
        case 'EXPEDITION_IN':
          qty = parseFloat((randomInt(5, 60) + Math.random()).toFixed(1));
          desc = `Resources recovered from expedition`;
          break;
        case 'TRANSFER_OUT':
          qty = -parseFloat((randomInt(10, 100) + Math.random()).toFixed(1));
          desc = `Resources transferred to another camp`;
          break;
        case 'TRANSFER_IN':
          qty = parseFloat((randomInt(10, 100) + Math.random()).toFixed(1));
          desc = `Resources received from another camp`;
          break;
      }

      const campUsers = users.filter((u) => u.camp_id === camp.id);
      const loggedBy =
        campUsers.length > 0 && Math.random() > 0.3 ? randomElement(campUsers).id : null;

      bulkLogRows.push({
        camp_id: camp.id,
        resource_type_id: rt.id,
        logged_by: loggedBy,
        log_type: logType,
        quantity_change: qty,
        description: desc,
        logged_at: new Date(logDate.getTime() + randomInt(0, 23) * 60 * 60 * 1000),
      });
    }
  }

  for (let i = 0; i < bulkLogRows.length; i += BATCH_SIZE) {
    const chunk = bulkLogRows.slice(i, i + BATCH_SIZE);
    await prisma.inventory_logs.createMany({ data: chunk as any });
  }
  logger.info(`Created ${bulkLogRows.length} inventory logs`);

  // ──────────────────────────────────────────────
  // 14. PERSON STATUS LOGS
  // ──────────────────────────────────────────────
  logger.info('Seeding person status logs...');
  const statusLogRows: Array<{
    person_id: number;
    old_status: string;
    new_status: string;
    reason: string;
    changed_by: number | null;
    changed_at: Date;
  }> = [];

  for (const person of people) {
    if (person.status === 'HEALTHY' && Math.random() > 0.35) continue;

    const oldStatus = 'HEALTHY';
    const newStatus = person.status;
    if (oldStatus === newStatus) continue;

    const campUsers = users.filter((u) => u.camp_id === person.camp_id);
    const changedBy = campUsers.length > 0 ? randomElement(campUsers).id : null;

    const reasons: Record<string, string> = {
      SICK: 'Exposure to contaminated water source',
      INJURED: 'Injured during routine patrol',
      AWAY: 'Deployed on expedition assignment',
      DEAD: 'Succumbed to injuries sustained in accident',
    };

    statusLogRows.push({
      person_id: person.id,
      old_status: oldStatus,
      new_status: newStatus,
      reason: reasons[newStatus] || 'Status change during routine evaluation',
      changed_by: changedBy,
      changed_at: randomDate(new Date(SYSTEM_START.getTime() + 60 * 24 * 60 * 60 * 1000), NOW),
    });
  }
  if (statusLogRows.length > 0) {
    await prisma.person_status_logs.createMany({ data: statusLogRows as any });
  }
  logger.info(`Created ${statusLogRows.length} person status logs`);

  // ──────────────────────────────────────────────
  // 15. PROFESSION REASSIGNMENT LOGS
  // ──────────────────────────────────────────────
  logger.info('Seeding profession reassignment logs...');
  const reassignRows: Array<{
    person_id: number;
    from_profession_id: number;
    to_profession_id: number;
    reason: string;
    start_date: Date;
    end_date: Date | null;
  }> = [];

  const peopleForReassign = people.filter(() => Math.random() > 0.88);
  for (const person of peopleForReassign) {
    let newProf = randomElement(professions);
    while (newProf.id === person.profession_id) {
      newProf = randomElement(professions);
    }

    reassignRows.push({
      person_id: person.id,
      from_profession_id: person.profession_id,
      to_profession_id: newProf.id,
      reason: randomElement([
        'Reassigned to cover critical skill shortage',
        'Temporary reassignment for expedition support',
        'Skill upgrade after completing training program',
        'Cross-training for operational flexibility',
        'Medical restriction requires role change',
      ]),
      start_date: randomDate(new Date(SYSTEM_START.getTime() + 60 * 24 * 60 * 60 * 1000), NOW),
      end_date:
        Math.random() > 0.5
          ? randomDate(NOW, new Date(NOW.getTime() + 90 * 24 * 60 * 60 * 1000))
          : null,
    });
  }
  if (reassignRows.length > 0) {
    await prisma.profession_reassignment_logs.createMany({ data: reassignRows });
  }
  logger.info(`Created ${reassignRows.length} profession reassignment logs`);

  // ──────────────────────────────────────────────
  // 16. PERSON TRANSFER LOGS
  // ──────────────────────────────────────────────
  logger.info('Seeding person transfer logs...');
  const completedPersonTransfers = transfers.filter(
    (t) => t.status === 'COMPLETED' && (t.type === 'PERSON' || t.type === 'MIXED'),
  );

  const personTransferLogRows: Array<{
    person_id: number;
    transfer_id: number;
    origin_camp_id: number;
    destination_camp_id: number;
    changed_by: number;
    transferred_at: Date;
  }> = [];

  for (const transfer of completedPersonTransfers.slice(0, 35)) {
    const transferItems = transferItemRows.filter(
      (ti) => ti.camp_transfer_id === transfer.id && ti.item_type === 'PERSON',
    );
    if (transferItems.length === 0) continue;

    for (const item of transferItems) {
      if (!item.person_id) continue;
      const campUsers = users.filter((u) => u.camp_id === transfer.requesting_camp);
      const changedBy = campUsers.length > 0 ? randomElement(campUsers).id : users[0].id;

      personTransferLogRows.push({
        person_id: item.person_id,
        transfer_id: transfer.id,
        origin_camp_id: transfer.requesting_camp,
        destination_camp_id: transfer.target_camp,
        changed_by: changedBy,
        transferred_at: randomDate(
          new Date(SYSTEM_START.getTime() + 90 * 24 * 60 * 60 * 1000),
          NOW,
        ),
      });
    }
  }

  if (personTransferLogRows.length > 0) {
    await prisma.person_transfer_logs.createMany({ data: personTransferLogRows });
  }
  logger.info(`Created ${personTransferLogRows.length} person transfer logs`);

  // ──────────────────────────────────────────────
  // 17. USER ACHIEVEMENTS + NOTIFICATIONS
  // ──────────────────────────────────────────────
  logger.info('Seeding user achievements and notifications...');
  const uaRows: Array<{ user_id: number; achievement_id: number; earned_at: Date }> = [];
  const anRows: Array<{
    user_id: number;
    achievement_id: number;
    notification_sent: boolean;
    sent_at: Date | null;
  }> = [];

  for (const user of users) {
    if (!user.is_active || Math.random() > 0.4) continue;
    const numAch = randomInt(1, 8);
    const shuffledAch = [...achievements].sort(() => Math.random() - 0.5);

    for (let a = 0; a < Math.min(numAch, shuffledAch.length); a++) {
      const ach = shuffledAch[a];
      uaRows.push({
        user_id: user.id,
        achievement_id: ach.id,
        earned_at: randomDate(new Date(SYSTEM_START.getTime() + 30 * 24 * 60 * 60 * 1000), NOW),
      });
      anRows.push({
        user_id: user.id,
        achievement_id: ach.id,
        notification_sent: Math.random() > 0.2,
        sent_at:
          Math.random() > 0.2
            ? randomDate(new Date(SYSTEM_START.getTime() + 30 * 24 * 60 * 60 * 1000), NOW)
            : null,
      });
    }
  }

  if (uaRows.length > 0) {
    await prisma.user_achievements.createMany({ data: uaRows });
  }
  if (anRows.length > 0) {
    await prisma.achievement_notifications.createMany({ data: anRows });
  }
  logger.info(`Created ${uaRows.length} user achievements and ${anRows.length} notifications`);

  // ──────────────────────────────────────────────
  // 18. AUDIT LOGS
  // ──────────────────────────────────────────────
  logger.info('Seeding audit logs (~3500 entries)...');
  const auditLogRows: Array<{
    user_id: number | null;
    camp_id: number | null;
    action: string;
    target_type: string;
    target_id: number | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }> = [];

  const targetTypes = [
    'users',
    'camps',
    'camp_transfers',
    'admission_requests',
    'expeditions',
    'people',
    'inventory_logs',
    'inventory_adjustment_requests',
    'achievements',
  ];

  // ~3500 audit logs across 180 days
  const auditPerDay = Math.round(3500 / DAYS_OF_OPERATION);

  for (let day = 0; day < DAYS_OF_OPERATION; day++) {
    const logDate = new Date(SYSTEM_START.getTime() + day * 24 * 60 * 60 * 1000);

    for (let e = 0; e < auditPerDay; e++) {
      const camp = randomElement(allCamps);
      const activeUser = users.filter((u) => u.is_active);
      const user = activeUser.length > 0 ? randomElement(activeUser) : users[0];

      const actionWeights = [
        1, 2, 1, 3, 2, 1, 40, 5, 5, 3, 3, 2, 2, 4, 3, 1, 4, 3, 1, 5, 2, 1, 2, 2, 1, 3, 2,
      ];
      const action = weightedRandom([...AUDIT_ACTIONS], actionWeights);

      const targetType = randomElement(targetTypes);

      auditLogRows.push({
        user_id: user.id,
        camp_id: camp.id,
        action,
        target_type: targetType,
        target_id: randomInt(1, 500),
        metadata:
          Math.random() > 0.4
            ? { reason: faker.lorem.sentence({ min: 2, max: 6 }), context: 'load-test-seed' }
            : null,
        created_at: new Date(
          logDate.getTime() + randomInt(0, 23) * 60 * 60 * 1000 + randomInt(0, 59) * 60 * 1000,
        ),
      });
    }
  }

  for (let i = 0; i < auditLogRows.length; i += BATCH_SIZE) {
    await prisma.audit_logs.createMany({ data: auditLogRows.slice(i, i + BATCH_SIZE) as any });
  }
  logger.info(`Created ${auditLogRows.length} audit logs`);

  // ──────────────────────────────────────────────
  // 19. SYSTEM CONFIG
  // ──────────────────────────────────────────────
  await prisma.system_configs.create({
    data: { id: 1, version: '2.0.0' },
  });

  // ──────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const counts: Record<string, number> = {
    camps: allCamps.length,
    roles: roles.length,
    permissions: allPermissions.length,
    role_permissions: rolePermRows.length,
    professions: professions.length,
    professions_resources_amounts: profResourceRows.length,
    resource_types: resourceTypes.length,
    achievements: achievements.length,
    achievement_roles: achievementRoleRows.length,
    achievement_stats: achievementStatsRows.length,
    users: users.length,
    people: people.length,
    inventories: inventoryRows.length,
    admission_requests: admissionRequests.length,
    expeditions: insertedExpeditions.length,
    expedition_members: expeditionMemberRows.length,
    expedition_allocated_resources: expeditionAllocRows.length,
    expedition_found_resources: expeditionFoundRows.length,
    expedition_returned_resources: expeditionReturnedRows.length,
    camp_transfers: transfers.length,
    camp_transfer_items: transferItemRows.length,
    contribution_overrides: overrideRows.length,
    inventory_adjustment_requests: adjRequestRows.length,
    inventory_logs: initialLogRows.length + bulkLogRows.length,
    person_status_logs: statusLogRows.length,
    profession_reassignment_logs: reassignRows.length,
    person_transfer_logs: personTransferLogRows.length,
    user_achievements: uaRows.length,
    achievement_notifications: anRows.length,
    audit_logs: auditLogRows.length,
  };

  const grandTotal = Object.values(counts).reduce((a, b) => a + b, 0);

  logger.info('');
  logger.info('=== SEED COMPLETE ===');
  logger.info(`Time: ${elapsed}s`);
  logger.info(`Grand total: ${grandTotal.toLocaleString()} records`);
  logger.info('');

  // Print table
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const maxNameLen = Math.max(...entries.map(([k]) => k.length));
  logger.info(`  ${'Table'.padEnd(maxNameLen + 2)} Count`);
  logger.info(`  ${''.padEnd(maxNameLen + 2, '─')} ───────`);
  for (const [table, count] of entries) {
    logger.info(`  ${table.padEnd(maxNameLen + 2)} ${count.toString().padStart(7)}`);
  }
  logger.info(`  ${''.padEnd(maxNameLen + 2, '─')} ───────`);
  logger.info(`  ${'TOTAL'.padEnd(maxNameLen + 2)} ${grandTotal.toString().padStart(7)}`);
  logger.info('');
  logger.info(`Minimum required: 5,000 — Achieved: ${grandTotal >= 5000 ? 'YES' : 'NO'}`);
  logger.info(
    `4 required roles present: ${['system_admin', 'worker', 'resource_manager', 'travel_coordinator'].every((r) => roleByName.has(r)) ? 'YES' : 'NO'}`,
  );
}

main()
  .catch((e) => {
    logger.error('Error during seeding:');
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

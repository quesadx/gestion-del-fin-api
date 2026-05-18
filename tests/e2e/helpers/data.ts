// tests/e2e/helpers/data.ts
export const TEST = {
  camps: {
    alphaOutpost: { id: 1, name: 'Alpha Outpost', location: 'Grid Sector 7' },
    betaSanctuary: { id: 2, name: 'Beta Sanctuary', location: 'Grid Sector 9' },
  },
  password: 'test-password-123',
  roles: {
    system_admin: 'system_admin',
    worker: 'worker',
    resource_manager: 'resource_manager',
    travel_coordinator: 'travel_coordinator',
  },
  users: {
    admin_master: 'admin_master',
    worker_user_1: 'worker_user_1',
    worker_user_2: 'worker_user_2',
    resource_mgr_1: 'resource_mgr_1',
    travel_coord_1: 'travel_coord_1',
  },
  resources: {
    rations: { name: 'Standard Rations', unit: 'kg' },
    water: { name: 'Purified Water', unit: 'Liters' },
    antibiotics: { name: 'Antibiotics', unit: 'Doses' },
  },
  professions: {
    engineer: 'Engineer',
    scout: 'Scout',
  },
} as const;

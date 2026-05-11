export const ROLES = ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'] as const;

export type RoleName = (typeof ROLES)[number];

export const isRoleName = (value: string): value is RoleName => ROLES.includes(value as RoleName);

export const ROLES = ['system_admin', 'worker', 'resource_manager', 'travel_coordinator'] as const;

export const SYSTEM_ADMIN = 'system_admin';

export type RoleName = (typeof ROLES)[number];

export const isRoleName = (value: string): value is RoleName => ROLES.includes(value as RoleName);

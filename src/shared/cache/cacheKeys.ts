export const cacheTtl = {
  roles: 60 * 60,
  permissions: 60 * 60,
  professions: 6 * 60 * 60,
  professionResources: 6 * 60 * 60,
  resourceTypes: 24 * 60 * 60,
  camps: 60 * 60,
};

export const cacheKeys = {
  role: (id: number) => `role:${id}:data`,
  rolePrefix: 'role:',
  rolesList: (page: number, pageSize: number) => `roles:list:${page}:${pageSize}`,
  rolesListPrefix: 'roles:list:',

  permission: (id: number) => `permission:${id}:data`,
  permissionPrefix: 'permission:',
  permissionsList: (page: number, pageSize: number) => `permissions:list:${page}:${pageSize}`,
  permissionsListPrefix: 'permissions:list:',

  profession: (id: number) => `profession:${id}:data`,
  professionPrefix: 'profession:',
  professionsList: (page: number, pageSize: number) => `professions:list:${page}:${pageSize}`,
  professionsListPrefix: 'professions:list:',
  professionResources: 'catalog:profession:resources',

  resourceType: (id: number) => `resource_type:${id}:data`,
  resourceTypePrefix: 'resource_type:',
  resourceTypesList: (page: number, pageSize: number) => `resource_types:list:${page}:${pageSize}`,
  resourceTypesListPrefix: 'resource_types:list:',

  camp: (id: number) => `camp:${id}:data`,
  campPrefix: 'camp:',
  campsList: (page: number, pageSize: number) => `camps:list:${page}:${pageSize}`,
  campsListPrefix: 'camps:list:',
  campsCatalog: 'catalog:camps',
};

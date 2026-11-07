/**
 * Katalog permission.
 *
 * Sumber tunggal nama permission yang dipakai backend, seeder, dan frontend.
 * Format `resource.action` huruf kecil, sesuai docs/rbac/ROLE-PERMISSION-MENU-PRD.md
 * bagian 5. Permission ditambah hanya ketika ada aksi nyata yang memakainya.
 */

export interface PermissionDefinition {
  code: string;
  name: string;
  module: string;
}

function define(module: string, resource: string, actions: string[]): PermissionDefinition[] {
  return actions.map((action) => ({
    code: `${resource}.${action}`,
    name: `${resource} ${action}`,
    module,
  }));
}

export const PERMISSIONS: PermissionDefinition[] = [
  ...define('dashboard', 'dashboard', ['view']),

  ...define('organization', 'organization', ['view', 'create', 'update', 'delete']),
  ...define('organization', 'tenant', ['view', 'create', 'update', 'delete', 'activate']),
  ...define('organization', 'domain', ['view', 'create', 'update', 'delete']),

  ...define('website', 'website', ['view', 'update']),
  ...define('website', 'navigation', ['view', 'create', 'update', 'delete']),
  ...define('website', 'theme', ['view', 'update']),
  ...define('website', 'seo', ['view', 'update']),

  ...define('builder', 'pages', ['view', 'create', 'update', 'delete', 'publish']),
  ...define('builder', 'builder', ['view', 'create', 'update', 'delete', 'publish', 'rollback']),
  ...define('builder', 'widgets', ['view', 'manage']),

  ...define('content', 'profile', ['view', 'update']),
  ...define('content', 'vision_mission', ['view', 'update']),
  ...define('content', 'curriculum', ['view', 'create', 'update', 'delete', 'publish']),
  ...define('content', 'documents', ['view', 'create', 'update', 'delete']),
  ...define('content', 'lecturers', ['view', 'create', 'update', 'delete']),
  ...define('content', 'facilities', ['view', 'create', 'update', 'delete']),
  ...define('content', 'posts', ['view', 'create', 'update', 'delete', 'publish']),
  ...define('content', 'galleries', ['view', 'create', 'update', 'delete', 'publish']),
  ...define('content', 'contacts', ['view', 'update']),
  ...define('content', 'contact_messages', ['view', 'manage']),

  ...define('media', 'media', ['view', 'upload', 'update', 'delete']),

  ...define('users', 'users', ['view', 'create', 'update', 'disable', 'assign_role']),
  ...define('users', 'roles', ['view', 'manage']),
  ...define('users', 'permissions', ['view', 'manage']),
  ...define('users', 'permission_groups', ['view', 'manage']),

  ...define('system', 'audit_logs', ['view']),
  ...define('system', 'notifications', ['view']),
  ...define('system', 'system_settings', ['manage']),
  ...define('system', 'templates', ['view', 'manage']),
];

export const PERMISSION_CODES = PERMISSIONS.map((permission) => permission.code);

export type PermissionCode = string;

/** Role sistem. Kode dipakai sebagai `roles.code` di database. */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_FAKULTAS: 'ADMIN_FAKULTAS',
  ADMIN_PRODI: 'ADMIN_PRODI',
  EDITOR: 'EDITOR',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

/** Tipe scope assignment peran (docs/rbac bagian 4). */
export const SCOPE_TYPES = {
  GLOBAL: 'global',
  FACULTY: 'faculty',
  PRODI: 'prodi',
} as const;

export type ScopeType = (typeof SCOPE_TYPES)[keyof typeof SCOPE_TYPES];

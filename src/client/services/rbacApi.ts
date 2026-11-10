import { api } from './api';

export interface RolePermission {
  id: number;
  code: string;
  name: string;
  module: string;
}

export interface RoleItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionCount: number;
  permissions?: RolePermission[];
  createdAt?: string;
}

export interface PermissionModuleGroup {
  module: string;
  count: number;
  permissions: RolePermission[];
}

export const rbacApi = {
  getRoles: () => api.get<{ roles: RoleItem[] }>('/admin/roles'),
  getRole: (id: number) => api.get<{ role: RoleItem }>(`/admin/roles/${id}`),
  createRole: (data: { code: string; name: string; description?: string; permissionCodes: string[] }) =>
    api.post<{ role: RoleItem }>('/admin/roles', data),
  updateRole: (id: number, data: { name?: string; description?: string; permissionCodes?: string[] }) =>
    api.put<{ role: RoleItem }>(`/admin/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/admin/roles/${id}`),

  getPermissions: () =>
    api.get<{ total: number; modules: PermissionModuleGroup[]; permissions: RolePermission[] }>(
      '/admin/permissions'
    ),
};

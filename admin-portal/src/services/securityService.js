import api, { ACCESS_SECURITY } from './api';

/** Audit trail of the admin's hospital (ADMIN only). */
export const auditApi = {
  /** params: { action, entityType, from, to (YYYY-MM-DD), query, page, size } -> Page */
  getLogs: (params) => api.get(`${ACCESS_SECURITY}/api/audit-logs`, { params }).then((r) => r.data),
  /** { actions: [...], entityTypes: [...] } for the filter dropdowns */
  getFilters: () => api.get(`${ACCESS_SECURITY}/api/audit-logs/filters`).then((r) => r.data),
  /** CSV file (same filters) */
  export: (params) => api.get(`${ACCESS_SECURITY}/api/audit-logs/export`, { params, responseType: 'blob' }),
};

/** Roles of the hospital and their saved permission grid (ADMIN only). */
export const permissionsApi = {
  getRoles: () => api.get(`${ACCESS_SECURITY}/api/roles`).then((r) => r.data),
  createRole: (data) => api.post(`${ACCESS_SECURITY}/api/roles`, data).then((r) => r.data),
  deleteRole: (name) => api.delete(`${ACCESS_SECURITY}/api/roles/${encodeURIComponent(name)}`),
  /** grid: { "EHR": ["view","edit"], ... } */
  savePermissions: (name, grid) =>
    api.put(`${ACCESS_SECURITY}/api/roles/${encodeURIComponent(name)}/permissions`, grid).then((r) => r.data),
};

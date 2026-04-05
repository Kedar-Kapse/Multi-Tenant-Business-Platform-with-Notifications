import api, { ACCESS_SECURITY } from './api';

export const auditApi = {
  getLogs:   (params) => api.get(`${ACCESS_SECURITY}/api/audit-logs`, { params }).then(r => r.data),
  getById:   (id)     => api.get(`${ACCESS_SECURITY}/api/audit-logs/${id}`).then(r => r.data),
  export:    (params) => api.get(`${ACCESS_SECURITY}/api/audit-logs/export`, { params, responseType: 'blob' }),
};

export const permissionsApi = {
  getRoles:       ()        => api.get(`${ACCESS_SECURITY}/api/roles`).then(r => r.data),
  getRoleById:    (id)      => api.get(`${ACCESS_SECURITY}/api/roles/${id}`).then(r => r.data),
  createRole:     (data)    => api.post(`${ACCESS_SECURITY}/api/roles`, data).then(r => r.data),
  updateRole:     (id,data) => api.put(`${ACCESS_SECURITY}/api/roles/${id}`, data).then(r => r.data),
  deleteRole:     (id)      => api.delete(`${ACCESS_SECURITY}/api/roles/${id}`).then(r => r.data),
  getPermissions: ()        => api.get(`${ACCESS_SECURITY}/api/permissions`).then(r => r.data),
};

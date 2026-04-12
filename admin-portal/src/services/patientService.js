import api, { ACCESS_SECURITY } from './api';

const PATIENT_BASE = `${ACCESS_SECURITY}/api/v1/patients`;

export const patientApi = {
  list: (page = 0, size = 20, query, status) =>
    api.get(PATIENT_BASE, { params: { page, size, query, status, sortBy: 'createdAt', sortDir: 'desc' } }).then(r => r.data),
  getById: (id) => api.get(`${PATIENT_BASE}/${id}`).then(r => r.data),
  create: (data) => api.post(PATIENT_BASE, data).then(r => r.data),
  createForProvider: (providerId, data) =>
    api.post(`${PATIENT_BASE}/by-provider/${providerId}`, data).then(r => r.data),
  remove: (id) => api.delete(`${PATIENT_BASE}/${id}`).then(r => r.data),
};

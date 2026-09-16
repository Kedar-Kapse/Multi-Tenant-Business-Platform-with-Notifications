import api, { ACCESS_SECURITY, BUSINESS } from './api';

// Staff (provider's own info + colleagues)
export const staffApi = {
  getAll:    (page = 0, size = 20) => api.get(`${ACCESS_SECURITY}/api/admin/v1/staff`, { params: { page, size, sortBy: 'createdAt', sortDir: 'desc' } }).then(r => r.data),
  getById:   (id) => api.get(`${ACCESS_SECURITY}/api/admin/v1/staff/${id}`).then(r => r.data),
  search:    (query, role, status, page = 0, size = 20) => api.get(`${ACCESS_SECURITY}/api/admin/v1/staff/search`, { params: { query, role, status, page, size } }).then(r => r.data),
};

// Patients
const PATIENT_BASE = `${BUSINESS}/api/patients`;
export const patientApi = {
  list: (page = 0, size = 20, query, status) =>
    api.get(PATIENT_BASE, { params: { page, size, query, status, sortBy: 'createdAt', sortDir: 'desc' } }).then(r => r.data),
  create: (data) => api.post(PATIENT_BASE, data).then(r => r.data),
  createForProvider: (providerId, data) =>
    api.post(`${PATIENT_BASE}/by-provider/${providerId}`, data).then(r => r.data),
  syncToPcc: (id) => api.post(`${PATIENT_BASE}/${id}/pcc-sync`).then(r => r.data),
};

// Messages
export const messageApi = {
  getAll:      (userId) => api.get(`${BUSINESS}/api/messages`, { params: { userId } }).then(r => r.data),
  getThread:   (threadId) => api.get(`${BUSINESS}/api/messages/thread/${threadId}`).then(r => r.data),
  unreadCount: (userId) => api.get(`${BUSINESS}/api/messages/unread-count`, { params: { userId } }).then(r => r.data),
  send:        (data) => api.post(`${BUSINESS}/api/messages`, data).then(r => r.data),
  markRead:    (id) => api.patch(`${BUSINESS}/api/messages/${id}/read`).then(r => r.data),
};

// EHR / Notes
export const ehrApi = {
  getTemplates: () => api.get(`${BUSINESS}/api/ehr/templates`).then(r => r.data),
  searchIcd:    (q) => api.get(`${BUSINESS}/api/ehr/icd-codes`, { params: { q } }).then(r => r.data),
  searchCpt:    (q) => api.get(`${BUSINESS}/api/ehr/cpt-codes`, { params: { q } }).then(r => r.data),
};

// Facilities & Beds
export const facilityApi = {
  getAll: () => api.get(`${BUSINESS}/api/inventory/facilities`).then(r => r.data),
  getBeds: (facilityId) => api.get(`${BUSINESS}/api/inventory/beds`, { params: facilityId ? { facilityId } : {} }).then(r => r.data),
};

// Claims
export const claimsApi = {
  getAll:   () => api.get(`${BUSINESS}/api/claims`).then(r => r.data),
  getById:  (id) => api.get(`${BUSINESS}/api/claims/${id}`).then(r => r.data),
  submit:   (data) => api.post(`${BUSINESS}/api/claims`, data).then(r => r.data),
  update:   (id, data) => api.put(`${BUSINESS}/api/claims/${id}`, data).then(r => r.data),
  summary:  () => api.get(`${BUSINESS}/api/claims/summary`).then(r => r.data),
};

// Fee Schedules
export const feeApi = {
  getAll: () => api.get(`${BUSINESS}/api/fee-schedules`).then(r => r.data),
};

// Dashboard stats (from admin dashboard endpoints — public)
export const dashboardApi = {
  tenantCount:  () => api.get(`${ACCESS_SECURITY}/api/admin/v1/dashboard/tenant-count`).then(r => r.data),
  staffCount:   () => api.get(`${ACCESS_SECURITY}/api/admin/v1/dashboard/staff-count`).then(r => r.data),
  patientCount: () => api.get(`${ACCESS_SECURITY}/api/admin/v1/dashboard/patient-count`).then(r => r.data),
};

// Appointments (real backend)
export const appointmentApi = {
  getAll:       (providerId) => api.get(`${BUSINESS}/api/appointments`, { params: providerId ? { providerId } : {} }).then(r => r.data),
  getByProvider: (providerId) => api.get(`${BUSINESS}/api/appointments`, { params: { providerId } }).then(r => r.data),
  book:         (data) => api.post(`${BUSINESS}/api/appointments`, data).then(r => r.data),
  update:       (id, data) => api.put(`${BUSINESS}/api/appointments/${id}`, data).then(r => r.data),
  cancel:       (id) => api.patch(`${BUSINESS}/api/appointments/${id}/cancel`).then(r => r.data),
};

// Pharmacy
export const pharmacyApi = {
  getAll: (facilityId) => api.get(`${BUSINESS}/api/inventory/pharmacy`, { params: facilityId ? { facilityId } : {} }).then(r => r.data),
};

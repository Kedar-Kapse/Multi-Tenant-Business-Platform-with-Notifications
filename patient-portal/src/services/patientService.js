import api, { BUSINESS, ACCESS_SECURITY } from './api';

export const appointmentApi = {
  getAll:      (patientId) => api.get(`${BUSINESS}/api/appointments`, { params: { patientId } }).then(r => r.data),
  getUpcoming: (patientId) => api.get(`${BUSINESS}/api/appointments/upcoming`, { params: { patientId } }).then(r => r.data),
  getSlots:    (providerId, date) => api.get(`${BUSINESS}/api/appointments/slots`, { params: { providerId, date } }).then(r => r.data),
  book:        (data) => api.post(`${BUSINESS}/api/appointments`, data).then(r => r.data),
  update:      (id, data) => api.put(`${BUSINESS}/api/appointments/${id}`, data).then(r => r.data),
  cancel:      (id) => api.patch(`${BUSINESS}/api/appointments/${id}/cancel`).then(r => r.data),
  summary:     (patientId) => api.get(`${BUSINESS}/api/appointments/summary`, { params: { patientId } }).then(r => r.data),
};

export const invoiceApi = {
  getAll:    (patientId) => api.get(`${BUSINESS}/api/invoices`, { params: { patientId } }).then(r => r.data),
  pay:       (id, method) => api.patch(`${BUSINESS}/api/invoices/${id}/pay`, { paymentMethod: method }).then(r => r.data),
  summary:   (patientId) => api.get(`${BUSINESS}/api/invoices/summary`, { params: { patientId } }).then(r => r.data),
};

export const documentApi = {
  getAll:    (patientId, category) => api.get(`${BUSINESS}/api/patient-documents`, { params: { patientId, ...(category ? { category } : {}) } }).then(r => r.data),
  upload:    (data) => api.post(`${BUSINESS}/api/patient-documents`, data).then(r => r.data),
  delete:    (id) => api.delete(`${BUSINESS}/api/patient-documents/${id}`).then(r => r.data),
};

export const messageApi = {
  getAll:       (userId) => api.get(`${BUSINESS}/api/messages`, { params: { userId } }).then(r => r.data),
  getUnread:    (userId) => api.get(`${BUSINESS}/api/messages/unread`, { params: { userId } }).then(r => r.data),
  getThread:    (threadId) => api.get(`${BUSINESS}/api/messages/thread/${threadId}`).then(r => r.data),
  unreadCount:  (userId) => api.get(`${BUSINESS}/api/messages/unread-count`, { params: { userId } }).then(r => r.data),
  send:         (data) => api.post(`${BUSINESS}/api/messages`, data).then(r => r.data),
  markRead:     (id) => api.patch(`${BUSINESS}/api/messages/${id}/read`).then(r => r.data),
};

export const providerApi = {
  getAll: (page = 0, size = 20) => api.get(`${ACCESS_SECURITY}/api/admin/v1/staff`, { params: { page, size, sortBy: 'createdAt', sortDir: 'desc' } }).then(r => r.data),
  search: (query, role) => api.get(`${ACCESS_SECURITY}/api/admin/v1/staff/search`, { params: { query, role, page: 0, size: 20 } }).then(r => r.data),
};

export const ehrApi = {
  getTemplates: () => api.get(`${BUSINESS}/api/ehr/templates`).then(r => r.data),
};

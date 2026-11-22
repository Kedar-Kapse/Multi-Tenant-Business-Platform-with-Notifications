import api, { BUSINESS, ACCESS_SECURITY, NOTIFICATIONS } from './api';

// Every call here is a patient "me" endpoint: the backend takes the patient's
// identity from the login token. Never send patientId / sender fields.

const data = (r) => r.data;

export const appointmentApi = {
  mine:     () => api.get(`${BUSINESS}/api/appointments/me`).then(data),
  upcoming: () => api.get(`${BUSINESS}/api/appointments/me`, { params: { upcoming: true } }).then(data),
  summary:  () => api.get(`${BUSINESS}/api/appointments/me/summary`).then(data),
  get:      (id) => api.get(`${BUSINESS}/api/appointments/${id}`).then(data),
  slots:    (providerId, date) => api.get(`${BUSINESS}/api/appointments/slots`, { params: { providerId, date } }).then(data),
  /** { providerId, providerName, providerSpecialty?, appointmentDate, startTime, type, mode?, reason? } */
  book:     (body) => api.post(`${BUSINESS}/api/appointments`, body).then(data),
  cancel:   (id) => api.patch(`${BUSINESS}/api/appointments/${id}/cancel`).then(data),
};

export const invoiceApi = {
  mine:    () => api.get(`${BUSINESS}/api/invoices/me`).then(data),
  summary: () => api.get(`${BUSINESS}/api/invoices/me/summary`).then(data),
};

export const documentApi = {
  mine: (category) => api.get(`${BUSINESS}/api/patient-documents/me`, { params: category ? { category } : {} }).then(data),
};

export const clinicalNoteApi = {
  mine: () => api.get(`${BUSINESS}/api/clinical-notes/me`).then(data),
};

export const messageApi = {
  mine:        () => api.get(`${BUSINESS}/api/messages`).then(data),
  unreadCount: () => api.get(`${BUSINESS}/api/messages/unread-count`).then(data),
  thread:      (threadId) => api.get(`${BUSINESS}/api/messages/thread/${encodeURIComponent(threadId)}`).then(data),
  markThreadRead: (threadId) => api.patch(`${BUSINESS}/api/messages/thread/${encodeURIComponent(threadId)}/read`).then(data),
  /** { recipientId, recipientName, recipientRole, subject, body, threadId? } */
  send:        (body) => api.post(`${BUSINESS}/api/messages`, body).then(data),
};

export const providerApi = {
  /** Care-team directory: Page { content:[{id, firstName, lastName, role, specialization, experienceYears, profilePhotoUrl}], ... } */
  directory: ({ query, role, page = 0, size = 24 } = {}, config) =>
    api.get(`${ACCESS_SECURITY}/api/providers`, {
      params: { ...(query ? { query } : {}), ...(role ? { role } : {}), page, size },
      ...config,
    }).then(data),
};

export const notificationApi = {
  list:        ({ unreadOnly, type, page = 0, size = 20 } = {}) =>
    api.get(`${NOTIFICATIONS}/api/notifications`, {
      params: { ...(unreadOnly ? { unreadOnly: true } : {}), ...(type ? { type } : {}), page, size },
    }).then(data),
  unreadCount: () => api.get(`${NOTIFICATIONS}/api/notifications/unread-count`).then(data),
  markRead:    (id) => api.patch(`${NOTIFICATIONS}/api/notifications/${id}/read`).then(data),
  markAllRead: () => api.patch(`${NOTIFICATIONS}/api/notifications/read-all`).then(data),
  remove:      (id) => api.delete(`${NOTIFICATIONS}/api/notifications/${id}`).then(data),
};

export const profileApi = {
  get:    () => api.get(`${BUSINESS}/api/patients/me`).then(data),
  update: (body) => api.patch(`${BUSINESS}/api/patients/me`, body).then(data),
};

/** Display name for a directory entry. */
export const providerName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Care team member';

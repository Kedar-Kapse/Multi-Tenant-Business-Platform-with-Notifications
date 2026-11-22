import api, { ACCESS_SECURITY, BUSINESS, NOTIFICATIONS } from './api';

// Identity always comes from the token on the backend: never send userId/sender
// fields, they are ignored. "providerId" is the logged-in user's Keycloak id (sub).

const data = (r) => r.data;
const clean = (params) => {
  const out = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
};

// ── Patients ──
const PATIENTS = `${BUSINESS}/api/patients`;
export const patientApi = {
  /** Page {content,totalElements,totalPages,number}. mine=true: only patients linked to me. */
  list: ({ page = 0, size = 20, query, status, mine } = {}, config) =>
    api.get(PATIENTS, { params: clean({ page, size, query, status, mine: mine ? true : undefined }), ...config }).then(data),
  getById: (id) => api.get(`${PATIENTS}/${id}`).then(data),
  /** Creates the patient and links them to this provider (appears in My Patients). */
  createForProvider: (providerId, body) => api.post(`${PATIENTS}/by-provider/${providerId}`, body).then(data),
  syncToPcc: (id) => api.post(`${PATIENTS}/${id}/pcc-sync`).then(data),
};

// ── Appointments ──
const APPTS = `${BUSINESS}/api/appointments`;
export const appointmentApi = {
  list: ({ providerId, from, to } = {}) => api.get(APPTS, { params: clean({ providerId, from, to }) }).then(data),
  getById: (id) => api.get(`${APPTS}/${id}`).then(data),
  slots: (providerId, date) => api.get(`${APPTS}/slots`, { params: { providerId, date } }).then(data),
  book: (body) => api.post(APPTS, body).then(data),
  update: (id, body) => api.put(`${APPTS}/${id}`, body).then(data),
  cancel: (id) => api.patch(`${APPTS}/${id}/cancel`).then(data),
};

// ── Clinical notes ──
const NOTES = `${BUSINESS}/api/clinical-notes`;
export const notesApi = {
  list: ({ page = 0, size = 10, status, query, patientId, mine = true } = {}) =>
    api.get(NOTES, { params: clean({ page, size, status, query, patientId, mine: mine ? true : undefined }) }).then(data),
  getById: (id) => api.get(`${NOTES}/${id}`).then(data),
  create: (body) => api.post(NOTES, body).then(data),
  update: (id, body) => api.put(`${NOTES}/${id}`, body).then(data),
  sign: (id) => api.patch(`${NOTES}/${id}/sign`).then(data),
  remove: (id) => api.delete(`${NOTES}/${id}`).then(data),
  summary: () => api.get(`${NOTES}/summary`).then(data),
};

// ── EHR reference data ──
export const ehrApi = {
  getTemplates: (category) => api.get(`${BUSINESS}/api/ehr/templates`, { params: clean({ category }) }).then(data),
  searchIcd: (q, config) => api.get(`${BUSINESS}/api/ehr/icd-codes`, { params: { q }, ...config }).then(data),
  searchCpt: (q, config) => api.get(`${BUSINESS}/api/ehr/cpt-codes`, { params: { q }, ...config }).then(data),
};

// ── Claims (whole hospital) ──
const CLAIMS = `${BUSINESS}/api/claims`;
export const claimsApi = {
  getAll: () => api.get(CLAIMS).then(data),
  getById: (id) => api.get(`${CLAIMS}/${id}`).then(data),
  submit: (body) => api.post(CLAIMS, body).then(data),
  update: (id, body) => api.put(`${CLAIMS}/${id}`, body).then(data),
  summary: () => api.get(`${CLAIMS}/summary`).then(data),
};

// ── Messages (my inbox + outbox) ──
const MSG = `${BUSINESS}/api/messages`;
export const messageApi = {
  getAll: () => api.get(MSG).then(data),
  unreadCount: () => api.get(`${MSG}/unread-count`).then(data),
  getThread: (threadId) => api.get(`${MSG}/thread/${encodeURIComponent(threadId)}`).then(data),
  markThreadRead: (threadId) => api.patch(`${MSG}/thread/${encodeURIComponent(threadId)}/read`).then(data),
  /** { recipientId (Keycloak id), recipientName, recipientRole, subject, body, threadId? } */
  send: (body) => api.post(MSG, body).then(data),
};

// ── My profile (staff record of the logged-in user) ──
const STAFF = `${ACCESS_SECURITY}/api/admin/v1/staff`;
export const profileApi = {
  getMe: () => api.get(`${STAFF}/me`).then(data),
  updateMe: (body) => api.patch(`${STAFF}/me`, body).then(data),
};

export const mfaApi = {
  status: () => api.get(`${ACCESS_SECURITY}/api/mfa/status`).then(data),
};

// ── In-app notifications ──
const NOTIF = `${NOTIFICATIONS}/api/notifications`;
export const notificationApi = {
  list: ({ unreadOnly, type, page = 0, size = 20 } = {}) =>
    api.get(NOTIF, { params: clean({ unreadOnly: unreadOnly ? true : undefined, type, page, size }) }).then(data),
  unreadCount: () => api.get(`${NOTIF}/unread-count`).then(data),
  markRead: (id) => api.patch(`${NOTIF}/${id}/read`).then(data),
  markAllRead: () => api.patch(`${NOTIF}/read-all`).then(data),
  remove: (id) => api.delete(`${NOTIF}/${id}`).then(data),
};

import api, { ACCESS_SECURITY } from './api';

const settingsService = {
  /** MFA Configuration */
  mfa: {
    getStatus: () => api.get(`${ACCESS_SECURITY}/api/mfa/status`).then((r) => r.data),
    enable: (type) => api.post(`${ACCESS_SECURITY}/api/mfa/enable`, { type }).then((r) => r.data),
    disable: () => api.post(`${ACCESS_SECURITY}/api/mfa/disable`).then((r) => r.data),
    verifySetup: (code) => api.post(`${ACCESS_SECURITY}/api/mfa/verify`, { code }).then((r) => r.data),
    getQRCode: () => api.get(`${ACCESS_SECURITY}/api/mfa/qr-code`).then((r) => r.data),
    getRecoveryCodes: () => api.get(`${ACCESS_SECURITY}/api/mfa/recovery-codes`).then((r) => r.data),
  },

  /** Session Management */
  sessions: {
    getActive: () => api.get(`${ACCESS_SECURITY}/api/sessions`).then((r) => r.data),
    revoke: (id) => api.delete(`${ACCESS_SECURITY}/api/sessions/${id}`).then((r) => r.data),
    revokeAll: () => api.delete(`${ACCESS_SECURITY}/api/sessions/all`).then((r) => r.data),
  },

  /** Password Policies */
  passwordPolicy: {
    get: () => api.get(`${ACCESS_SECURITY}/api/password-policy`).then((r) => r.data),
    update: (data) => api.put(`${ACCESS_SECURITY}/api/password-policy`, data).then((r) => r.data),
  },

  /** Change password */
  changePassword: (data) => api.post(`${ACCESS_SECURITY}/api/auth/change-password`, data).then((r) => r.data),

  /** System settings */
  system: {
    get: () => api.get(`${ACCESS_SECURITY}/api/settings`).then((r) => r.data),
    update: (data) => api.put(`${ACCESS_SECURITY}/api/settings`, data).then((r) => r.data),
  },
};

export default settingsService;

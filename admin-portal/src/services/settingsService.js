import api, { ACCESS_SECURITY } from './api';
import keycloak from '../keycloak';

/**
 * Account and hospital security settings. All values live in Keycloak.
 * Password change and authenticator set-up happen on Keycloak's own secure screens.
 */
const settingsService = {
  /** Two-factor login for the current user */
  mfa: {
    getStatus: () => api.get(`${ACCESS_SECURITY}/api/mfa/status`).then((r) => r.data),
    /** Opens Keycloak's authenticator set-up screen (QR code + first code), then returns here. */
    startSetup: () => keycloak.login({ action: 'CONFIGURE_TOTP', redirectUri: window.location.href }),
    disable: () => api.post(`${ACCESS_SECURITY}/api/mfa/disable`).then((r) => r.data),
  },

  /** The current user's signed-in devices */
  sessions: {
    getActive: () => api.get(`${ACCESS_SECURITY}/api/sessions`).then((r) => r.data),
    revoke: (id) => api.delete(`${ACCESS_SECURITY}/api/sessions/${id}`),
    revokeOthers: () => api.delete(`${ACCESS_SECURITY}/api/sessions`).then((r) => r.data),
  },

  /** Hospital password rules (ADMIN) */
  passwordPolicy: {
    get: () => api.get(`${ACCESS_SECURITY}/api/password-policy`).then((r) => r.data),
    update: (data) => api.put(`${ACCESS_SECURITY}/api/password-policy`, data).then((r) => r.data),
  },

  /** Session timeout and brute-force protection (ADMIN) */
  securitySettings: {
    get: () => api.get(`${ACCESS_SECURITY}/api/security-settings`).then((r) => r.data),
    update: (data) => api.put(`${ACCESS_SECURITY}/api/security-settings`, data).then((r) => r.data),
  },

  /** Opens Keycloak's change-password screen, then returns here. */
  changePassword: () => keycloak.login({ action: 'UPDATE_PASSWORD', redirectUri: window.location.href }),
};

export default settingsService;

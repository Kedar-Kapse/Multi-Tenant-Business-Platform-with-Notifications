import axios from 'axios';
import keycloak from '../keycloak';

const GATEWAY = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8085';

const DEFAULT_TENANT = process.env.REACT_APP_TENANT_ID || 'test';

const api = axios.create({
  baseURL: GATEWAY,
  headers: {
    'Content-Type': 'application/json',
    'X-TENANT-ID': DEFAULT_TENANT,
  },
});

api.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    try {
      // Refreshes the token via Keycloak's own refresh token if it's expiring within 30s.
      await keycloak.updateToken(30);
    } catch {
      keycloak.login();
      return config;
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && keycloak.authenticated) {
      keycloak.login();
    }
    return Promise.reject(err);
  }
);

export default api;

// Service-specific base paths (maps to gateway routes)
export const ACCESS_SECURITY = '/access-security';
export const BUSINESS        = '/business';
export const NOTIFICATIONS   = '/notifications';

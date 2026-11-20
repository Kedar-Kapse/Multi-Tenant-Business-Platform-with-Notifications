import axios from 'axios';
import keycloak from '../keycloak';
import { TENANT_ID, API_BASE_URL } from '../runtimeConfig';

const GATEWAY = API_BASE_URL;
const DEFAULT_TENANT = TENANT_ID;

const api = axios.create({
  baseURL: GATEWAY,
  headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT },
});

api.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    try {
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
export const ACCESS_SECURITY = '/access-security';
export const BUSINESS = '/business';

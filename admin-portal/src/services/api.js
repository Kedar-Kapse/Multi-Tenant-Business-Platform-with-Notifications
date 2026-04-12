import axios from 'axios';

const GATEWAY = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8085';

const DEFAULT_TENANT = process.env.REACT_APP_TENANT_ID || 'test';

const api = axios.create({
  baseURL: GATEWAY,
  headers: {
    'Content-Type': 'application/json',
    'X-TENANT-ID': DEFAULT_TENANT,
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  // Only omit the token for truly public auth endpoints (login/logout/refresh/exchange).
  // Portal-switch endpoints like /portals and /generate require ADMIN authentication.
  const publicAuthPaths = ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/auth/portal-switch/exchange'];
  const isPublicAuth = publicAuthPaths.some((p) => config.url?.includes(p));
  if (!isPublicAuth) {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const url = originalRequest?.url || '';
    // Public auth endpoints (login/logout/refresh/exchange) should not be retried with token refresh.
    // Portal-switch /portals and /generate are authenticated and SHOULD be retried on 401.
    const publicAuthPaths = ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/auth/portal-switch/exchange'];
    const isPublicAuth = publicAuthPaths.some((p) => url.includes(p));

    // Retry 401s for access-security endpoints, excluding truly public auth endpoints
    const isRetryable = url.includes('/access-security/') && !isPublicAuth;

    if (err.response?.status === 401 && isRetryable && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${GATEWAY}/access-security/api/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT } }
        );
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          processQueue(null, data.access_token);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;

// Service-specific base paths (maps to gateway routes)
export const ACCESS_SECURITY = '/access-security';
export const BUSINESS        = '/business';
export const NOTIFICATIONS   = '/notifications';

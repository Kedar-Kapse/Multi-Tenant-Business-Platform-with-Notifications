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
  const isAuthRequest = config.url?.includes('/api/auth/');
  if (!isAuthRequest) {
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
    const isAuthEndpoint = url.includes('/api/auth/');

    // Only retry 401s for access-security endpoints (not business/notifications — those have separate auth)
    const isRetryable = url.includes('/access-security/') && !isAuthEndpoint;

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

import axios from 'axios';

const GATEWAY = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8085';
const DEFAULT_TENANT = process.env.REACT_APP_TENANT_ID || 'test';

const api = axios.create({
  baseURL: GATEWAY,
  headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.request.use(config => {
  if (!config.url?.includes('/api/auth/')) {
    const token = localStorage.getItem('provider_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const url = original?.url || '';
    const isRetryable = url.includes('/access-security/') && !url.includes('/api/auth/');

    if (err.response?.status === 401 && isRetryable && !original._retry) {
      const rt = localStorage.getItem('provider_refresh_token');
      if (!rt) {
        localStorage.removeItem('provider_access_token');
        localStorage.removeItem('provider_refresh_token');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(err);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${GATEWAY}/access-security/api/auth/refresh`,
          { refresh_token: rt },
          { headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT } });
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        if (data.access_token) {
          localStorage.setItem('provider_access_token', data.access_token);
          localStorage.setItem('provider_refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          processQueue(null, data.access_token);
          return api(original);
        }
      } catch (e) {
        processQueue(e, null);
        localStorage.removeItem('provider_access_token');
        localStorage.removeItem('provider_refresh_token');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(e);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(err);
  }
);

export default api;
export const ACCESS_SECURITY = '/access-security';
export const BUSINESS = '/business';

import axios from 'axios';
const GATEWAY = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8085';
const DEFAULT_TENANT = process.env.REACT_APP_TENANT_ID || 'test';

const api = axios.create({ baseURL: GATEWAY, headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT } });

let isRefreshing = false, failedQueue = [];
const processQueue = (err, token) => { failedQueue.forEach(p => err ? p.reject(err) : p.resolve(token)); failedQueue = []; };

api.interceptors.request.use(config => {
  if (!config.url?.includes('/api/auth/')) {
    const t = localStorage.getItem('patient_access_token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(res => res, async err => {
  const orig = err.config;
  const url = orig?.url || '';
  if (err.response?.status === 401 && url.includes('/access-security/') && !url.includes('/api/auth/') && !orig._retry) {
    const rt = localStorage.getItem('patient_refresh_token');
    if (!rt) { localStorage.removeItem('patient_access_token'); localStorage.removeItem('patient_refresh_token'); if (window.location.pathname !== '/login') window.location.href = '/login'; return Promise.reject(err); }
    if (isRefreshing) return new Promise((res, rej) => failedQueue.push({ resolve: res, reject: rej })).then(t => { orig.headers.Authorization = `Bearer ${t}`; return api(orig); });
    orig._retry = true; isRefreshing = true;
    try {
      const r = await axios.post(`${GATEWAY}/access-security/api/auth/refresh`, { refresh_token: rt }, { headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT } });
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      if (d.access_token) { localStorage.setItem('patient_access_token', d.access_token); localStorage.setItem('patient_refresh_token', d.refresh_token); orig.headers.Authorization = `Bearer ${d.access_token}`; processQueue(null, d.access_token); return api(orig); }
    } catch (e) { processQueue(e); localStorage.removeItem('patient_access_token'); localStorage.removeItem('patient_refresh_token'); if (window.location.pathname !== '/login') window.location.href = '/login'; return Promise.reject(e); }
    finally { isRefreshing = false; }
  }
  return Promise.reject(err);
});

export default api;
export const ACCESS_SECURITY = '/access-security';
export const BUSINESS = '/business';

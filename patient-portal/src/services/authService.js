import api, { ACCESS_SECURITY } from './api';
const AUTH = `${ACCESS_SECURITY}/api/auth`;
const TK = 'patient_access_token', RK = 'patient_refresh_token';

const authService = {
  login: async (username, password) => {
    const res = await api.post(`${AUTH}/login`, { username, password });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data.access_token) {
      localStorage.setItem(TK, data.access_token);
      localStorage.setItem(RK, data.refresh_token);
    }
    return data;
  },
  logout: async () => {
    const rt = localStorage.getItem(RK);
    try { if (rt) await api.post(`${AUTH}/logout`, { refresh_token: rt }); } catch {}
    localStorage.removeItem(TK); localStorage.removeItem(RK);
  },
  getToken: () => localStorage.getItem(TK),
  isAuthenticated: () => {
    const t = localStorage.getItem(TK);
    if (!t) return false;
    try { return JSON.parse(atob(t.split('.')[1])).exp * 1000 > Date.now() + 30000; } catch { return false; }
  },
  getUser: () => {
    const t = localStorage.getItem(TK);
    if (!t) return null;
    try {
      const p = JSON.parse(atob(t.split('.')[1]));
      return { sub: p.sub, username: p.preferred_username, email: p.email, firstName: p.given_name, lastName: p.family_name,
        fullName: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
        roles: p.realm_access?.roles?.filter(r => !['offline_access','uma_authorization'].includes(r) && !r.startsWith('default-roles-')) || [] };
    } catch { return null; }
  },
};
export default authService;

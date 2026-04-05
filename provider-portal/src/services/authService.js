import api, { ACCESS_SECURITY } from './api';

const AUTH = `${ACCESS_SECURITY}/api/auth`;
const TOKEN_KEY = 'provider_access_token';
const REFRESH_KEY = 'provider_refresh_token';
const BLOCKED_ROLES = ['PATIENT'];

const authService = {
  login: async (username, password) => {
    const res = await api.post(`${AUTH}/login`, { username, password });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data.access_token) {
      const user = authService.decodeToken(data.access_token);
      const roles = user?.roles || [];
      if (roles.length === 1 && BLOCKED_ROLES.includes(roles[0])) {
        throw new Error('Patients cannot access the Provider Portal');
      }
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    }
    return data;
  },

  logout: async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    try { if (rt) await api.post(`${AUTH}/logout`, { refresh_token: rt }); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),

  isAuthenticated: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now() + 30000;
    } catch { return false; }
  },

  getUser: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    return authService.decodeToken(token);
  },

  decodeToken: (token) => {
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      return {
        sub: p.sub,
        username: p.preferred_username,
        email: p.email,
        firstName: p.given_name,
        lastName: p.family_name,
        fullName: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
        roles: p.realm_access?.roles?.filter(r => !['offline_access', 'uma_authorization'].includes(r) && !r.startsWith('default-roles-')) || [],
        clientRoles: p.resource_access?.['platform-backend']?.roles || [],
      };
    } catch { return null; }
  },
};

export default authService;

import api, { ACCESS_SECURITY } from './api';

const AUTH = `${ACCESS_SECURITY}/api/auth`;

const authService = {
  login: async (username, password) => {
    const res = await api.post(`${AUTH}/login`, { username, password });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  },

  logout: async () => {
    const rt = localStorage.getItem('refresh_token');
    try { if (rt) await api.post(`${AUTH}/logout`, { refresh_token: rt }); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  refresh: async () => {
    const rt = localStorage.getItem('refresh_token');
    if (!rt) throw new Error('No refresh token');
    const res = await api.post(`${AUTH}/refresh`, { refresh_token: rt });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  },

  getToken: () => localStorage.getItem('access_token'),

  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now() + 30000;
    } catch { return false; }
  },

  getUser: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      return {
        username: p.preferred_username,
        email: p.email,
        roles: p.realm_access?.roles || [],
        sub: p.sub,
      };
    } catch { return null; }
  },
};

export default authService;

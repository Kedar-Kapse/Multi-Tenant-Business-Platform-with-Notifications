import { create } from 'zustand';
import authService from '../services/authService';

const useAuthStore = create((set) => ({
  user: authService.getUser(),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      await authService.login(username, password);
      set({ user: authService.getUser(), loading: false });
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Authentication failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null });
  },

  isAuthenticated: () => authService.isAuthenticated(),
}));

export default useAuthStore;

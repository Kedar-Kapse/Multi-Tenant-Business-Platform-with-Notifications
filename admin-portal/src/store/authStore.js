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
      const msg = err.response?.data?.message || err.response?.data?.error || 'Authentication failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null });
  },

  isAuthenticated: () => authService.isAuthenticated(),
  clearError: () => set({ error: null }),
}));

export default useAuthStore;

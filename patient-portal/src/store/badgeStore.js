import { create } from 'zustand';
import { messageApi, notificationApi } from '../services/patientService';

/** Unread counts for the navbar bell and the Messages menu item. */
const useBadgeStore = create((set) => ({
  notifications: 0,
  messages: 0,

  refreshNotifications: async () => {
    try {
      const r = await notificationApi.unreadCount();
      set({ notifications: Number(r?.count) || 0 });
    } catch { /* keep the last known value */ }
  },

  refreshMessages: async () => {
    try {
      const r = await messageApi.unreadCount();
      set({ messages: Number(r?.count) || 0 });
    } catch { /* keep the last known value */ }
  },

  setNotifications: (n) => set({ notifications: Math.max(0, n) }),
}));

export const refreshAllBadges = () => {
  const s = useBadgeStore.getState();
  return Promise.all([s.refreshNotifications(), s.refreshMessages()]);
};

export default useBadgeStore;

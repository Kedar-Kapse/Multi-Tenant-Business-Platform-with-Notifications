import { create } from 'zustand';
import { messageApi, notificationApi } from '../services/providerService';

/**
 * Unread counters shown in the navbar bell and the sidebar. The layout polls
 * refresh() every minute; pages call it right after they change something.
 */
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
  refresh: async () => {
    await Promise.all([useBadgeStore.getState().refreshNotifications(), useBadgeStore.getState().refreshMessages()]);
  },
}));

export default useBadgeStore;

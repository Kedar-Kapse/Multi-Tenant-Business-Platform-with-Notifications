import { create } from 'zustand';
import notificationService from '../services/notificationService';

/**
 * Bell badge + latest notifications for the navbar, loaded from notification-service.
 * refresh() is called on login, every minute (AdminLayout) and after any change.
 */
const useNotificationStore = create((set, get) => ({
  recent: [],
  unreadCount: 0,
  loaded: false,

  refresh: async () => {
    try {
      const [count, page] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getAll({ page: 0, size: 5 }),
      ]);
      set({ unreadCount: count, recent: page.content || [], loaded: true });
    } catch {
      // keep the last known values; the bell must never break the page
      set({ loaded: true });
    }
  },

  markAsRead: async (id) => {
    await notificationService.markRead(id);
    await get().refresh();
  },

  markAllRead: async () => {
    await notificationService.markAllRead();
    await get().refresh();
  },
}));

export default useNotificationStore;

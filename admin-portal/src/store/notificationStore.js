import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 3,

  addNotification: (notification) => set((s) => ({
    notifications: [{ id: Date.now(), timestamp: new Date(), read: false, ...notification }, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),

  markAsRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

export default useNotificationStore;

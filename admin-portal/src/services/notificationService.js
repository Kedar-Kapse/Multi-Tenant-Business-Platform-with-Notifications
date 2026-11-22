import api, { NOTIFICATIONS } from './api';

/**
 * The logged-in user's in-app notifications (notification-service).
 * Every call is about "me" — the server takes the user from the login token.
 */
const BASE = `${NOTIFICATIONS}/api/notifications`;

const notificationService = {
  /** Page of notifications: { content, totalElements, totalPages, number } */
  getAll: ({ unreadOnly = false, type, page = 0, size = 20 } = {}) =>
    api.get(BASE, { params: { unreadOnly: unreadOnly || undefined, type: type || undefined, page, size } }).then((r) => r.data),
  getUnreadCount: () => api.get(`${BASE}/unread-count`).then((r) => r.data.count),
  markRead: (id) => api.patch(`${BASE}/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch(`${BASE}/read-all`).then((r) => r.data),
  delete: (id) => api.delete(`${BASE}/${id}`),
};

export default notificationService;

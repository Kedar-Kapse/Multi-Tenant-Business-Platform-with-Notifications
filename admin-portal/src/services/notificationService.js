import api, { NOTIFICATIONS } from './api';

const notificationService = {
  /** Get paginated notifications */
  getAll: (params) => api.get(`${NOTIFICATIONS}/api/notifications`, { params }).then((r) => r.data),

  /** Get single notification */
  getById: (id) => api.get(`${NOTIFICATIONS}/api/notifications/${id}`).then((r) => r.data),

  /** Mark notification as read */
  markRead: (id) => api.put(`${NOTIFICATIONS}/api/notifications/${id}/read`).then((r) => r.data),

  /** Mark all notifications as read */
  markAllRead: () => api.put(`${NOTIFICATIONS}/api/notifications/read-all`).then((r) => r.data),

  /** Delete notification */
  delete: (id) => api.delete(`${NOTIFICATIONS}/api/notifications/${id}`).then((r) => r.data),

  /** Get unread count */
  getUnreadCount: () => api.get(`${NOTIFICATIONS}/api/notifications/unread-count`).then((r) => r.data),

  /** Get notification preferences */
  getPreferences: () => api.get(`${NOTIFICATIONS}/api/notifications/preferences`).then((r) => r.data),

  /** Update notification preferences */
  updatePreferences: (data) => api.put(`${NOTIFICATIONS}/api/notifications/preferences`, data).then((r) => r.data),

  /** Send test notification */
  sendTest: (data) => api.post(`${NOTIFICATIONS}/api/notifications/test`, data).then((r) => r.data),

  /** SMS/Email campaign endpoints */
  campaigns: {
    getAll: () => api.get(`${NOTIFICATIONS}/api/campaigns`).then((r) => r.data),
    create: (data) => api.post(`${NOTIFICATIONS}/api/campaigns`, data).then((r) => r.data),
    getById: (id) => api.get(`${NOTIFICATIONS}/api/campaigns/${id}`).then((r) => r.data),
    cancel: (id) => api.put(`${NOTIFICATIONS}/api/campaigns/${id}/cancel`).then((r) => r.data),
  },

  /** SSE stream URL for real-time notifications */
  getStreamUrl: () => {
    const gateway = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8085';
    return `${gateway}${NOTIFICATIONS}/api/notifications/stream`;
  },
};

export default notificationService;

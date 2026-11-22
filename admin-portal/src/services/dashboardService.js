import api, { BUSINESS, ACCESS_SECURITY } from './api';

/** Admin dashboard data — all computed by the backend from real records. */
const dashboardService = {
  getKpis: () => api.get(`${BUSINESS}/api/dashboard/kpis`).then((r) => r.data),
  getRevenueTrend: () => api.get(`${BUSINESS}/api/dashboard/revenue-trend`).then((r) => r.data),
  getClaimsDistribution: () => api.get(`${BUSINESS}/api/dashboard/claims-distribution`).then((r) => r.data),
  getBedOccupancy: () => api.get(`${BUSINESS}/api/dashboard/bed-occupancy`).then((r) => r.data),
  getRecentAlerts: () => api.get(`${BUSINESS}/api/dashboard/alerts`).then((r) => r.data),
  /** Security score from real Keycloak settings (replaces the old hardcoded compliance numbers) */
  getSecurityPosture: () => api.get(`${ACCESS_SECURITY}/api/security-posture`).then((r) => r.data),
};

export default dashboardService;

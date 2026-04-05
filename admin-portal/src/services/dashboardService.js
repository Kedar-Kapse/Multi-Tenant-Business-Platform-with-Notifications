import api, { BUSINESS, ACCESS_SECURITY } from './api';

const dashboardService = {
  /** Dashboard KPIs — aggregated stats */
  getKpis: () => api.get(`${BUSINESS}/api/dashboard/kpis`).then((r) => r.data),

  /** Revenue trend data (monthly) */
  getRevenueTrend: (params) => api.get(`${BUSINESS}/api/dashboard/revenue-trend`, { params }).then((r) => r.data),

  /** Claims distribution (paid/pending/denied) */
  getClaimsDistribution: () => api.get(`${BUSINESS}/api/dashboard/claims-distribution`).then((r) => r.data),

  /** Bed occupancy by unit */
  getBedOccupancy: () => api.get(`${BUSINESS}/api/dashboard/bed-occupancy`).then((r) => r.data),

  /** HIPAA compliance scores */
  getComplianceScores: () => api.get(`${ACCESS_SECURITY}/api/dashboard/compliance-scores`).then((r) => r.data),

  /** Recent system alerts */
  getRecentAlerts: (limit = 10) => api.get(`${BUSINESS}/api/dashboard/alerts`, { params: { limit } }).then((r) => r.data),

  /** Patient volume trends */
  getPatientTrend: (params) => api.get(`${BUSINESS}/api/dashboard/patient-trend`, { params }).then((r) => r.data),

  /** No-show rates */
  getNoShowRate: (params) => api.get(`${BUSINESS}/api/dashboard/no-show-rate`, { params }).then((r) => r.data),
};

export default dashboardService;

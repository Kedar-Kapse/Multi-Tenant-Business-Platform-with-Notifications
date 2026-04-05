import api, { BUSINESS } from './api';

export const claimsApi = {
  getAll:     (params) => api.get(`${BUSINESS}/api/claims`, { params }).then(r => r.data),
  getById:    (id)     => api.get(`${BUSINESS}/api/claims/${id}`).then(r => r.data),
  submit:     (data)   => api.post(`${BUSINESS}/api/claims`, data).then(r => r.data),
  update:     (id,data) => api.put(`${BUSINESS}/api/claims/${id}`, data).then(r => r.data),
  delete:     (id)     => api.delete(`${BUSINESS}/api/claims/${id}`).then(r => r.data),
  getSummary: ()       => api.get(`${BUSINESS}/api/claims/summary`).then(r => r.data),
};

export const feeScheduleApi = {
  getAll:    ()        => api.get(`${BUSINESS}/api/fee-schedules`).then(r => r.data),
  create:    (data)    => api.post(`${BUSINESS}/api/fee-schedules`, data).then(r => r.data),
  update:    (id,data) => api.put(`${BUSINESS}/api/fee-schedules/${id}`, data).then(r => r.data),
  delete:    (id)      => api.delete(`${BUSINESS}/api/fee-schedules/${id}`).then(r => r.data),
};

export const payrollApi = {
  getSummary: (period) => api.get(`${BUSINESS}/api/payroll/summary`, { params: { period } }).then(r => r.data),
};

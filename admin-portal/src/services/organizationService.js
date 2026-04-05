import api, { ACCESS_SECURITY, BUSINESS } from './api';

// ── Staff (via Access Security Service) ──
const STAFF_BASE = `${ACCESS_SECURITY}/api/admin/v1/staff`;

export const staffApi = {
  getAll:    (page = 0, size = 20, sortBy = 'createdAt', sortDir = 'desc') =>
    api.get(STAFF_BASE, { params: { page, size, sortBy, sortDir } }).then(r => r.data),
  getById:   (id)      => api.get(`${STAFF_BASE}/${id}`).then(r => r.data),
  create:    (data)    => api.post(STAFF_BASE, data).then(r => r.data),
  update:    (id, data) => api.put(`${STAFF_BASE}/${id}`, data).then(r => r.data),
  delete:    (id)      => api.delete(`${STAFF_BASE}/${id}`).then(r => r.data),
  activate:  (id)      => api.patch(`${STAFF_BASE}/${id}/activate`).then(r => r.data),
  search:    (query, role, status, page = 0, size = 20) =>
    api.get(`${STAFF_BASE}/search`, { params: { query, role, status, page, size } }).then(r => r.data),
};

// ── Tenants (via Access Security Service) ──
export const tenantApi = {
  getAll:    ()        => api.get(`${ACCESS_SECURITY}/api/admin/v1/tenants`).then(r => r.data),
  getById:   (id)      => api.get(`${ACCESS_SECURITY}/api/admin/v1/tenants/${id}`).then(r => r.data),
  create:    (data)    => api.post(`${ACCESS_SECURITY}/api/admin/v1/tenants`, data).then(r => r.data),
  update:    (id,data) => api.put(`${ACCESS_SECURITY}/api/admin/v1/tenants/${id}`, data).then(r => r.data),
  delete:    (id)      => api.delete(`${ACCESS_SECURITY}/api/admin/v1/tenants/${id}`).then(r => r.data),
  activate:  (id)      => api.patch(`${ACCESS_SECURITY}/api/admin/v1/tenants/${id}/activate`).then(r => r.data),
};

// ── Facilities (via Business Service) ──
const FAC_BASE = `${BUSINESS}/api/inventory/facilities`;
const BED_BASE = `${BUSINESS}/api/inventory/beds`;
const PHARM_BASE = `${BUSINESS}/api/inventory/pharmacy`;

export const facilityApi = {
  getAll:      () => api.get(FAC_BASE).then(r => r.data),
  getById:     (id) => api.get(`${FAC_BASE}/${id}`).then(r => r.data),
  create:      (data) => api.post(FAC_BASE, data).then(r => r.data),
  update:      (id, data) => api.put(`${FAC_BASE}/${id}`, data).then(r => r.data),
  delete:      (id) => api.delete(`${FAC_BASE}/${id}`).then(r => r.data),
  activate:    (id) => api.patch(`${FAC_BASE}/${id}/activate`).then(r => r.data),
};

export const bedApi = {
  getAll:      (facilityId) => api.get(BED_BASE, { params: facilityId ? { facilityId } : {} }).then(r => r.data),
  getById:     (id) => api.get(`${BED_BASE}/${id}`).then(r => r.data),
  create:      (facilityId, data) => api.post(`${BED_BASE}?facilityId=${facilityId}`, data).then(r => r.data),
  update:      (id, data) => api.put(`${BED_BASE}/${id}`, data).then(r => r.data),
  delete:      (id) => api.delete(`${BED_BASE}/${id}`).then(r => r.data),
};

export const pharmacyApi = {
  getAll:      (facilityId) => api.get(PHARM_BASE, { params: facilityId ? { facilityId } : {} }).then(r => r.data),
  getById:     (id) => api.get(`${PHARM_BASE}/${id}`).then(r => r.data),
  create:      (data) => api.post(PHARM_BASE, data).then(r => r.data),
  update:      (id, data) => api.put(`${PHARM_BASE}/${id}`, data).then(r => r.data),
  delete:      (id) => api.delete(`${PHARM_BASE}/${id}`).then(r => r.data),
};

// Backward compatibility
export const inventoryApi = {
  getBeds:       (facilityId) => bedApi.getAll(facilityId),
  getPharmacy:   (facilityId) => pharmacyApi.getAll(facilityId),
  updateBed:     (id, data) => bedApi.update(id, data),
};

// ── EHR Rules (via Business Service) ──
const EHR_BASE = `${BUSINESS}/api/ehr`;

export const ehrApi = {
  getTemplates:    (category) => api.get(`${EHR_BASE}/templates`, { params: category ? { category } : {} }).then(r => r.data),
  createTemplate:  (data) => api.post(`${EHR_BASE}/templates`, data).then(r => r.data),
  updateTemplate:  (id, data) => api.put(`${EHR_BASE}/templates/${id}`, data).then(r => r.data),
  toggleTemplate:  (id) => api.patch(`${EHR_BASE}/templates/${id}/toggle`).then(r => r.data),
  deleteTemplate:  (id) => api.delete(`${EHR_BASE}/templates/${id}`).then(r => r.data),
  getIcdCodes:     (q) => api.get(`${EHR_BASE}/icd-codes`, { params: { q } }).then(r => r.data),
  createIcdCode:   (data) => api.post(`${EHR_BASE}/icd-codes`, data).then(r => r.data),
  deleteIcdCode:   (id) => api.delete(`${EHR_BASE}/icd-codes/${id}`).then(r => r.data),
  getCptCodes:     (q) => api.get(`${EHR_BASE}/cpt-codes`, { params: { q } }).then(r => r.data),
  createCptCode:   (data) => api.post(`${EHR_BASE}/cpt-codes`, data).then(r => r.data),
  deleteCptCode:   (id) => api.delete(`${EHR_BASE}/cpt-codes/${id}`).then(r => r.data),
};

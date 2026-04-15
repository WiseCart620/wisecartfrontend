

import { api } from './api';

export const transmittalApi = {

  getAll: () => api.get('/transmittals'),

  getById: (id) => api.get(`/transmittals/${id}`),

  getNextControlNumber: () => api.get('/transmittals/next-control-number'),

  /**
   * Create a new transmittal.
   * @param {Object} payload  — matches TransmittalRequest Java DTO
   */
  create: (payload) => api.post('/transmittals', payload),

  /**
   * Update an existing transmittal.
   * @param {number} id
   * @param {Object} payload  — matches TransmittalRequest Java DTO
   */
  update: (id, payload) => api.put(`/transmittals/${id}`, payload),

  /** Delete a transmittal */
  delete: (id) => api.delete(`/transmittals/${id}`),
};

export const toTransmittalRequest = (formData) => ({
  controlNumber: formData.controlNumber || null,
  date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
  preparedBy: formData.preparedBy,
  branchId: formData.branchId ? Number(formData.branchId) : null,
  remarks: formData.remarks || null,
  items: (formData.items || []).map(item => ({
    productId:    item.parentProductId,
    variationId:  item.variationId || null,
    unitsPerCase: item.unitsPerCase ? parseInt(item.unitsPerCase, 10) : null,
    caseQty:      item.caseQty      ? parseInt(item.caseQty,      10) : null,
    uom:          item.uom  || null,
    upc:          item.upc  || null,
  })),
});
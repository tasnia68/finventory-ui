import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getShipments = (params = {}) => {
    const query = new URLSearchParams();
    if (params.salesOrderId) query.set('salesOrderId', params.salesOrderId);
    if (params.status) query.set('status', params.status);
    if (params.shipmentNumber) query.set('shipmentNumber', params.shipmentNumber);
    if (params.trackingNumber) query.set('trackingNumber', params.trackingNumber);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 100));
    query.set('sortBy', params.sortBy || 'shippedDate');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/shipments?${query.toString()}`));
};

export const getShipment = (shipmentId) => unwrap(request(`/shipments/${shipmentId}`));

export const getShipmentQueueSummary = () => unwrap(request('/shipments/queue-summary'));

export const getShipmentsByQueue = (queue, params = {}) => {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 50));
    query.set('sortBy', params.sortBy || 'updatedAt');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/shipments/queue/${queue}?${query.toString()}`));
};

export const createShipment = (payload) => unwrap(request('/shipments', { method: 'POST', body: payload }));
export const updateShipmentTracking = (shipmentId, payload) => unwrap(request(`/shipments/${shipmentId}/tracking`, { method: 'PATCH', body: payload }));
export const generateShippingLabel = (shipmentId, payload = {}) => unwrap(request(`/shipments/${shipmentId}/label`, { method: 'POST', body: payload }));
export const confirmDelivery = (shipmentId, payload = {}) => unwrap(request(`/shipments/${shipmentId}/confirm-delivery`, { method: 'POST', body: payload }));
export const approveDelivery = (shipmentId, payload = {}) => unwrap(request(`/shipments/${shipmentId}/approve-delivery`, { method: 'POST', body: payload }));
export const disputeDelivery = (shipmentId, payload = {}) => unwrap(request(`/shipments/${shipmentId}/dispute-delivery`, { method: 'POST', body: payload }));
export const getDeliveryNote = (shipmentId) => unwrap(request(`/shipments/${shipmentId}/delivery-note`));

export const getRmas = (params = {}) => {
    const query = new URLSearchParams();
    if (params.salesOrderId) query.set('salesOrderId', params.salesOrderId);
    if (params.rmaNumber) query.set('rmaNumber', params.rmaNumber);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 100));
    query.set('sortBy', params.sortBy || 'requestedAt');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/rmas?${query.toString()}`));
};

export const createRma = (payload) => unwrap(request('/rmas', { method: 'POST', body: payload }));
export const updateRmaStatus = (id, payload) => unwrap(request(`/rmas/${id}/status`, { method: 'PATCH', body: payload }));

// Steadfast Courier
export const bookSteadfast = (shipmentId) => unwrap(request(`/courier/steadfast/shipments/${shipmentId}/book`, { method: 'POST' }));
export const syncSteadfastStatus = (shipmentId) => unwrap(request(`/courier/steadfast/shipments/${shipmentId}/sync-status`, { method: 'POST' }));
export const refreshSteadfastQueue = (queue) => unwrap(request(`/courier/steadfast/queue/${queue}/refresh`, { method: 'POST' }));
export const getSteadfastBalance = () => unwrap(request('/courier/steadfast/balance'));
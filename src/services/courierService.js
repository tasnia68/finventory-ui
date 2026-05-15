import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

// Courier profiles
export const getCourierProfiles = () => unwrap(request('/courier-profiles'));
export const getCourierProfile = (id) => unwrap(request(`/courier-profiles/${id}`));
export const createCourierProfile = (payload) => unwrap(request('/courier-profiles', { method: 'POST', body: payload }));
export const updateCourierProfile = (id, payload) => unwrap(request(`/courier-profiles/${id}`, { method: 'PUT', body: payload }));
export const deleteCourierProfile = (id) => unwrap(request(`/courier-profiles/${id}`, { method: 'DELETE' }));
export const getCourierBalance = (id) => unwrap(request(`/courier-profiles/${id}/balance`));
export const getCourierProviders = () => unwrap(request('/courier-profiles/providers'));

// Rate cards
export const getRateCards = (profileId) => unwrap(request(`/courier-profiles/${profileId}/rate-cards`));
export const createRateCard = (profileId, payload) => unwrap(request(`/courier-profiles/${profileId}/rate-cards`, { method: 'POST', body: payload }));
export const updateRateCard = (id, payload) => unwrap(request(`/rate-cards/${id}`, { method: 'PUT', body: payload }));
export const deleteRateCard = (id) => unwrap(request(`/rate-cards/${id}`, { method: 'DELETE' }));

// Delivery zones
export const getDeliveryZones = () => unwrap(request('/delivery-zones'));

// Steadfast-specific
export const bookSteadfastShipment = (shipmentId) =>
    unwrap(request(`/courier/steadfast/shipments/${shipmentId}/book`, { method: 'POST' }));
export const syncSteadfastStatus = (shipmentId) =>
    unwrap(request(`/courier/steadfast/shipments/${shipmentId}/sync-status`, { method: 'POST' }));
export const requestSteadfastReturn = (shipmentId, reason) => {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return unwrap(request(`/courier/steadfast/shipments/${shipmentId}/return-request${params}`, { method: 'POST' }));
};
export const syncSteadfastPayments = () =>
    unwrap(request('/courier/steadfast/sync-payments', { method: 'POST' }));

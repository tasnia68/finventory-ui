import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getWebhookEvents = ({ status, source } = {}) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (source) query.set('source', source);
    const qs = query.toString();
    return unwrap(request(`/webhook-events${qs ? `?${qs}` : ''}`));
};

export const getWebhookEvent = (id) => unwrap(request(`/webhook-events/${id}`));

export const materializeWebhookEvent = (id, payload) =>
    unwrap(request(`/webhook-events/${id}/materialize`, { method: 'POST', body: payload }));

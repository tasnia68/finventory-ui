import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, value);
        }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

// Discounts
export const listDiscounts = () => unwrap(request('/discounts'));
export const getDiscount = (id) => unwrap(request(`/discounts/${id}`));
export const createDiscount = (payload) => unwrap(request('/discounts', { method: 'POST', body: payload }));
export const updateDiscount = (id, payload) => unwrap(request(`/discounts/${id}`, { method: 'PUT', body: payload }));
export const deleteDiscount = (id) => request(`/discounts/${id}`, { method: 'DELETE' });
export const listAvailableDiscounts = (channel) => unwrap(request(`/discounts/available${buildQuery({ channel })}`));

// Codes
export const createDiscountCode = (discountId, payload) => unwrap(request(`/discounts/${discountId}/codes`, { method: 'POST', body: payload }));
export const updateDiscountCode = (codeId, payload) => unwrap(request(`/discounts/codes/${codeId}`, { method: 'PUT', body: payload }));
export const deleteDiscountCode = (codeId) => request(`/discounts/codes/${codeId}`, { method: 'DELETE' });
export const listDiscountCodes = (discountId) => unwrap(request(`/discounts/codes${buildQuery({ discountId })}`));

// Preview & analytics
export const previewPricing = (payload) => unwrap(request('/discounts/preview', { method: 'POST', body: payload }));
export const getDiscountAnalytics = (params = {}) => unwrap(request(`/discounts/analytics${buildQuery({
    from: params.from,
    to: params.to,
})}`));

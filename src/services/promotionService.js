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

export const getPromotions = (params = {}) => unwrap(request(`/promotions${buildQuery({
    status: params.status,
    salesChannel: params.salesChannel,
    couponRequired: params.couponRequired,
    code: params.code,
})}`));

export const getPromotion = (id) => unwrap(request(`/promotions/${id}`));
export const createPromotion = (payload) => unwrap(request('/promotions', { method: 'POST', body: payload }));
export const updatePromotion = (id, payload) => unwrap(request(`/promotions/${id}`, { method: 'PUT', body: payload }));

export const getCoupons = (params = {}) => unwrap(request(`/promotions/coupons${buildQuery({
    promotionId: params.promotionId,
    status: params.status,
    code: params.code,
})}`));

export const createCoupon = (promotionId, payload) => unwrap(request(`/promotions/${promotionId}/coupons`, { method: 'POST', body: payload }));
export const updateCoupon = (couponId, payload) => unwrap(request(`/promotions/coupons/${couponId}`, { method: 'PUT', body: payload }));

export const getPricingRules = (params = {}) => unwrap(request(`/promotions/pricing-rules${buildQuery({
    status: params.status,
    salesChannel: params.salesChannel,
    code: params.code,
})}`));

export const createPricingRule = (payload) => unwrap(request('/promotions/pricing-rules', { method: 'POST', body: payload }));
export const updatePricingRule = (id, payload) => unwrap(request(`/promotions/pricing-rules/${id}`, { method: 'PUT', body: payload }));

export const previewPricing = (payload) => unwrap(request('/promotions/preview', { method: 'POST', body: payload }));
export const validateCoupon = (payload) => unwrap(request('/promotions/coupons/validate', { method: 'POST', body: payload }));

export const getPromotionAnalytics = (params = {}) => unwrap(request(`/promotions/analytics${buildQuery({
    from: params.from,
    to: params.to,
})}`));
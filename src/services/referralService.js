import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

export const getReferralProgram = () => unwrap(request('/referrals/program'));
export const upsertReferralProgram = (payload) => unwrap(request('/referrals/program', { method: 'PUT', body: payload }));
export const getOrCreateReferralCode = (customerId) => unwrap(request(`/referrals/codes/customer/${customerId}`, { method: 'POST' }));
export const listReferralCodes = (customerId) => unwrap(request(`/referrals/codes/customer/${customerId}`));
export const attributeReferral = (payload) => unwrap(request('/referrals/attribute', { method: 'POST', body: payload }));
export const listReferralAttributions = (referralCodeId) => unwrap(request(`/referrals/attributions/code/${referralCodeId}`));

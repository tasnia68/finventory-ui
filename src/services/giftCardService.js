import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

export const listGiftCards = () => unwrap(request('/gift-cards'));
export const getGiftCard = (id) => unwrap(request(`/gift-cards/${id}`));
export const issueGiftCard = (payload) => unwrap(request('/gift-cards', { method: 'POST', body: payload }));
export const getGiftCardBalance = (code) => unwrap(request(`/gift-cards/balance/${encodeURIComponent(code)}`));
export const adjustGiftCard = (id, payload) => unwrap(request(`/gift-cards/${id}/adjust`, { method: 'POST', body: payload }));
export const getGiftCardTransactions = (id) => unwrap(request(`/gift-cards/${id}/transactions`));

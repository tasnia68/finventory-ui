import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value);
        }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

export const getGoodsReceiptNotes = (params = {}) => unwrap(request(`/goods-receipt-notes${buildQuery(params)}`));
export const getGoodsReceiptNote = (id) => unwrap(request(`/goods-receipt-notes/${id}`));
export const createGoodsReceiptNote = (payload) => unwrap(request('/goods-receipt-notes', { method: 'POST', body: payload }));
export const updateGoodsReceiptNoteItems = (id, items) => unwrap(request(`/goods-receipt-notes/${id}/items`, { method: 'PUT', body: items }));
export const verifyGoodsReceiptNote = (id) => unwrap(request(`/goods-receipt-notes/${id}/verify`, { method: 'POST' }));
export const confirmGoodsReceiptNote = (id) => unwrap(request(`/goods-receipt-notes/${id}/confirm`, { method: 'POST' }));

export const getSupplierReturns = (goodsReceiptNoteId) => unwrap(request(`/goods-receipt-notes/${goodsReceiptNoteId}/supplier-returns`));
export const createSupplierReturn = (payload) => unwrap(request('/supplier-returns', { method: 'POST', body: payload }));
export const confirmSupplierReturn = (id) => unwrap(request(`/supplier-returns/${id}/confirm`, { method: 'POST' }));
export const cancelSupplierReturn = (id) => unwrap(request(`/supplier-returns/${id}/cancel`, { method: 'POST' }));
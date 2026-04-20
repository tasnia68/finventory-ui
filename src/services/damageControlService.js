import { request } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
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

const authHeaders = () => {
    const headers = {};
    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

const parseFilename = (contentDisposition, fallbackFilename) => {
    if (!contentDisposition) {
        return fallbackFilename;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const standardMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
    return standardMatch?.[1] || fallbackFilename;
};

export const getDamageRecords = (params = {}) => unwrap(request(`/damage-records${buildQuery(params)}`));
export const getDamageRecord = (id) => unwrap(request(`/damage-records/${id}`));
export const getDamageSummary = (params = {}) => unwrap(request(`/damage-records/reports/summary${buildQuery(params)}`));
export const getDamageReport = (params = {}) => unwrap(request(`/damage-records/reports${buildQuery(params)}`));
export const createDamageRecord = (payload) => unwrap(request('/damage-records', { method: 'POST', body: payload }));
export const submitDamageRecordForApproval = (id) => unwrap(request(`/damage-records/${id}/submit-approval`, { method: 'POST' }));
export const approveDamageRecord = (id) => unwrap(request(`/damage-records/${id}/approve`, { method: 'POST' }));
export const rejectDamageRecord = (id) => unwrap(request(`/damage-records/${id}/reject`, { method: 'POST' }));
export const confirmDamageRecord = (id) => unwrap(request(`/damage-records/${id}/confirm`, { method: 'POST' }));
export const cancelDamageRecord = (id) => unwrap(request(`/damage-records/${id}/cancel`, { method: 'POST' }));

export const createDamageRecordFromGoodsReceipt = (goodsReceiptNoteId, payload) => unwrap(request(`/goods-receipt-notes/${goodsReceiptNoteId}/damage-records`, {
    method: 'POST',
    body: payload,
}));

export const getDamageDocuments = (damageRecordId) => unwrap(request(`/damage-records/${damageRecordId}/documents`));
export const deleteDamageDocument = (documentId) => unwrap(request(`/damage-records/documents/${documentId}`, { method: 'DELETE' }));

export const uploadDamageDocument = async (damageRecordId, file, documentType, notes = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (notes) {
        formData.append('notes', notes);
    }

    const response = await fetch(`${API_BASE_URL}/damage-records/${damageRecordId}/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.message || 'Failed to upload damage document');
    }

    return payload?.data !== undefined ? payload.data : payload;
};

export const getDamageDocumentFile = async (documentId) => {
    const response = await fetch(`${API_BASE_URL}/damage-records/documents/${documentId}/file`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (!response.ok) {
        const fallbackMessage = 'Failed to download damage document';
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(payload?.message || payload || fallbackMessage);
    }

    return {
        blob: await response.blob(),
        filename: parseFilename(response.headers.get('content-disposition'), 'damage-document'),
    };
};

export const getSupplierClaimsForGoodsReceipt = (goodsReceiptNoteId) => unwrap(request(`/goods-receipt-notes/${goodsReceiptNoteId}/supplier-claims`));
export const getSupplierClaim = (claimId) => unwrap(request(`/supplier-claims/${claimId}`));
export const createSupplierClaim = (goodsReceiptNoteId, payload) => unwrap(request(`/goods-receipt-notes/${goodsReceiptNoteId}/supplier-claims`, {
    method: 'POST',
    body: payload,
}));
export const createSupplierReturnFromClaim = (claimId) => unwrap(request(`/supplier-claims/${claimId}/supplier-return`, { method: 'POST' }));

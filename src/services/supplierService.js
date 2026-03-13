import { request } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'default-tenant';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

const authHeaders = () => {
    const headers = {
        'X-Tenant-ID': TENANT_ID,
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

export const getSuppliers = () => unwrap(request('/suppliers'));
export const getSupplier = (id) => unwrap(request(`/suppliers/${id}`));
export const createSupplier = (payload) => unwrap(request('/suppliers', { method: 'POST', body: payload }));
export const updateSupplier = (id, payload) => unwrap(request(`/suppliers/${id}`, { method: 'PUT', body: payload }));
export const approveSupplier = (id) => unwrap(request(`/suppliers/${id}/approve`, { method: 'POST' }));
export const rejectSupplier = (id) => unwrap(request(`/suppliers/${id}/reject`, { method: 'POST' }));
export const deleteSupplier = (id) => unwrap(request(`/suppliers/${id}`, { method: 'DELETE' }));

export const getSupplierProducts = (supplierId) => unwrap(request(`/suppliers/${supplierId}/products`));
export const addSupplierProduct = (supplierId, payload) => unwrap(request(`/suppliers/${supplierId}/products`, { method: 'POST', body: payload }));
export const updateSupplierProduct = (id, payload) => unwrap(request(`/suppliers/products/${id}`, { method: 'PUT', body: payload }));
export const deleteSupplierProduct = (id) => unwrap(request(`/suppliers/products/${id}`, { method: 'DELETE' }));

export const getSupplierDocuments = (supplierId) => unwrap(request(`/suppliers/${supplierId}/documents`));
export const deleteSupplierDocument = (documentId) => unwrap(request(`/supplier-documents/${documentId}`, { method: 'DELETE' }));

export const uploadSupplierDocument = async (supplierId, file, documentType, notes = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (notes) {
        formData.append('notes', notes);
    }

    const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to upload supplier document');
    }

    return data.data !== undefined ? data.data : data;
};

export const getSupplierDocumentFile = async (documentId) => {
    const response = await fetch(`${API_BASE_URL}/supplier-documents/${documentId}/file`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to download supplier document');
    }

    return response.blob();
};
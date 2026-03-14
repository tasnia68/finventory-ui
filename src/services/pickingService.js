import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getPickingLists = (params = {}) => {
    const query = new URLSearchParams();
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.status) query.set('status', params.status);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 100));
    query.set('sortBy', params.sortBy || 'createdAt');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/picking-lists?${query.toString()}`));
};

export const getPickingList = (id) => unwrap(request(`/picking-lists/${id}`));
export const createPickingList = (payload) => unwrap(request('/picking-lists/generate', { method: 'POST', body: payload }));
export const assignPicker = (id, userId) => unwrap(request(`/picking-lists/${id}/assign?userId=${encodeURIComponent(userId)}`, { method: 'PUT' }));
export const updatePickingTask = (taskId, payload) => unwrap(request(`/picking-lists/tasks/${taskId}`, { method: 'PUT', body: payload }));
export const completePickingList = (id) => unwrap(request(`/picking-lists/${id}/complete`, { method: 'POST' }));
export const getPackingList = (id) => unwrap(request(`/picking-lists/${id}/packing-list`));
import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getWarehouseCapacity = (warehouseId) => {
    return unwrap(request(`/warehouses/${warehouseId}/capacity`));
};

export const updateWarehouseCapacity = (warehouseId, payload) => {
    return unwrap(request(`/warehouses/${warehouseId}/capacity`, {
        method: 'PUT',
        body: payload,
    }));
};
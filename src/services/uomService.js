import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getUOMs = () => {
    return unwrap(request('/uoms'));
};

export const getUOM = (id) => {
    return unwrap(request(`/uoms/${id}`));
};

export const createUOM = (uomData) => {
    return unwrap(request('/uoms', {
        method: 'POST',
        body: uomData,
    }));
};

export const updateUOM = (id, uomData) => {
    return unwrap(request(`/uoms/${id}`, {
        method: 'PUT',
        body: uomData,
    }));
};

export const deleteUOM = (id) => {
    return request(`/uoms/${id}`, {
        method: 'DELETE',
    });
};

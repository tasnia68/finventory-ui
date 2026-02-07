import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getCategories = () => {
    return unwrap(request('/categories'));
};

export const getCategory = (id) => {
    return unwrap(request(`/categories/${id}`));
};

export const createCategory = (categoryData) => {
    return unwrap(request('/categories', {
        method: 'POST',
        body: categoryData,
    }));
};

export const updateCategory = (id, categoryData) => {
    return unwrap(request(`/categories/${id}`, {
        method: 'PUT',
        body: categoryData,
    }));
};

export const deleteCategory = (id) => {
    return request(`/categories/${id}`, {
        method: 'DELETE',
    });
};

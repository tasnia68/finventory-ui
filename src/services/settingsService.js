import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

export const getSettings = (category) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return unwrap(request(`/settings${query}`));
};

export const updateSettings = (settings) => {
    return unwrap(request('/settings', {
        method: 'PUT',
        body: settings,
    }));
};
import { request } from './api';

export const login = (email, password) => {
    return request('/auth/login', {
        method: 'POST',
        body: { email, password },
    });
};

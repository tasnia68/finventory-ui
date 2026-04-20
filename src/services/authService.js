import { request } from './api';

export const login = (workspace, email, password) => {
    return request('/auth/login', {
        method: 'POST',
        body: { workspace, email, password },
    });
};

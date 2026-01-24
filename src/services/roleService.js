import { request } from './api';

export const getRoles = async () => {
    const response = await request('/roles');
    return response.data !== undefined ? response.data : response;
};

export const getPermissions = async () => {
    const response = await request('/permissions');
    return response.data !== undefined ? response.data : response;
};

export const createRole = async (roleData) => {
    const response = await request('/roles', {
        method: 'POST',
        body: roleData
    });
    return response.data !== undefined ? response.data : response;
};

export const updateRole = async (id, roleData) => {
    const response = await request(`/roles/${id}`, {
        method: 'PUT',
        body: roleData
    });
    return response.data !== undefined ? response.data : response;
};

import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getUsers = () => {
    return unwrap(request('/users'));
};

export const getUserKey = (id) => {
    return unwrap(request(`/users/${id}`));
};

export const createUser = (userData) => {
    return unwrap(request('/users', {
        method: 'POST',
        body: userData,
    }));
};

export const createStaff = (payload) => unwrap(request('/users', {
    method: 'POST',
    body: payload,
}));

export const changePassword = (currentPassword, newPassword) => unwrap(request('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
}));

export const updateUser = (id, userData) => {
    return unwrap(request(`/users/${id}`, {
        method: 'PUT',
        body: userData,
    }));
};

export const deleteUser = (id) => {
    return request(`/users/${id}`, {
        method: 'DELETE',
    });
};

export const getProfile = () => {
    return unwrap(request('/users/me'));
};

export const updateProfile = (userData) => {
    return unwrap(request('/users/me', {
        method: 'PUT',
        body: userData,
    }));
};

export const inviteUser = (email, roleName) => {
    return unwrap(request('/users/invite', {
        method: 'POST',
        body: { email, roleName },
    }));
};

export const acceptInvitation = (token, password, firstName, lastName) => {
    return unwrap(request('/users/invite/accept', {
        method: 'POST',
        body: { token, password, firstName, lastName },
    }));
};

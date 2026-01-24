const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'default-tenant';

const getHeaders = (isAuthEndpoint = false) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isAuthEndpoint) {
        headers['X-Tenant-ID'] = TENANT_ID;
    }

    return headers;
};

const handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        if (response.status === 401 && !window.location.pathname.includes('/login')) {
            // Auto logout on 401 (except when already on login page)
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }

        // Create error object with message from server or default text
        const error = (data && data.message) || response.statusText;
        throw new Error(error);
    }

    return data;
};

export const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const isAuthEndpoint = endpoint.startsWith('/auth');

    // Set default method to GET
    const config = {
        method: 'GET',
        ...options,
        headers: {
            ...getHeaders(isAuthEndpoint),
            ...options.headers,
        },
    };

    if (options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        return handleResponse(response);
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

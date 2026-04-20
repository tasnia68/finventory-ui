const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeTenantUuid = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    const normalized = value.trim();
    return UUID_PATTERN.test(normalized) ? normalized : '';
};

const readTenantIdFromToken = (token) => {
    if (!token) {
        return '';
    }

    try {
        const payload = token.split('.')[1];
        if (!payload) {
            return '';
        }
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return normalizeTenantUuid(decoded?.tenantId);
    } catch {
        return '';
    }
};

const getHeaders = (isAuthEndpoint = false) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isAuthEndpoint) {
        const tenantId = normalizeTenantUuid(localStorage.getItem('tenantId')) || readTenantIdFromToken(token);
        if (tenantId) {
            headers['X-Tenant-ID'] = tenantId;
        }
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

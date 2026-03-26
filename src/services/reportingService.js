import { request } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'default-tenant';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value);
        }
    });

    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

const getAuthHeaders = (contentType = 'application/json') => {
    const headers = {
        'X-Tenant-ID': TENANT_ID,
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return headers;
};

const parseFilename = (contentDisposition, fallback) => {
    if (!contentDisposition) {
        return fallback;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const standardMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
    return standardMatch?.[1] || fallback;
};

const handleNonJsonResponse = async (response, fallbackMessage) => {
    if (response.ok) {
        return response;
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    throw new Error(payload?.message || payload || fallbackMessage);
};

const fetchBlob = async (endpoint, { method = 'GET', body, fallbackFilename = 'download', contentType = 'application/json' } = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: getAuthHeaders(contentType),
        body: body ? JSON.stringify(body) : undefined,
    });

    await handleNonJsonResponse(response, 'Failed to download file');

    return {
        blob: await response.blob(),
        filename: parseFilename(response.headers.get('content-disposition'), fallbackFilename),
    };
};

const fetchMultipart = async (endpoint, formData, fallbackMessage) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(null),
        body: formData,
    });

    await handleNonJsonResponse(response, fallbackMessage);
    const payload = await response.json();
    return payload?.data !== undefined ? payload.data : payload;
};

export const getAnalyticsDashboardSummary = (params = {}) => unwrap(request(`/analytics/dashboard${buildQuery(params)}`));

export const getAnalyticsWidgets = (params = {}) => unwrap(request(`/analytics/widgets${buildQuery(params)}`));

export const getAnalyticsAlerts = (params = {}) => unwrap(request(`/analytics/alerts${buildQuery(params)}`));

export const getCurrentStockReport = (params = {}) => unwrap(request(`/reporting/standard/current-stock${buildQuery(params)}`));

export const getStockMovementReport = (params = {}) => unwrap(request(`/reporting/standard/stock-movements${buildQuery(params)}`));

export const getAgingAnalysisReport = (params = {}) => unwrap(request(`/reporting/standard/aging-analysis${buildQuery(params)}`));

export const getPurchaseOrderReport = (params = {}) => unwrap(request(`/reporting/standard/purchase-orders${buildQuery(params)}`));

export const getSalesOrderReport = (params = {}) => unwrap(request(`/reporting/standard/sales-orders${buildQuery(params)}`));

export const getSupplierPerformanceReport = (params = {}) => unwrap(request(`/reporting/standard/supplier-performance${buildQuery(params)}`));

export const getReportConfigurations = (params = {}) => unwrap(request(`/reporting/configurations${buildQuery(params)}`));

export const getReportExecutions = () => unwrap(request('/reporting/executions'));

export const exportGeneratedReport = (payload) => fetchBlob('/reporting/builder/export', {
    method: 'POST',
    body: payload,
    fallbackFilename: 'report-export.csv',
});

export const getImportTemplate = (dataset) => unwrap(request(`/reporting/data-exchange/templates/${dataset}`));

export const exportDataset = (dataset) => fetchBlob(`/reporting/data-exchange/export/${dataset}`, {
    fallbackFilename: `${dataset.toLowerCase()}-export.csv`,
    contentType: null,
});

export const validateDataImport = (dataset, file) => {
    const formData = new FormData();
    formData.append('dataset', dataset);
    formData.append('file', file);
    return fetchMultipart('/reporting/data-exchange/imports/validate', formData, 'Failed to validate import');
};

export const startDataImport = (dataset, file) => {
    const formData = new FormData();
    formData.append('dataset', dataset);
    formData.append('file', file);
    return fetchMultipart('/reporting/data-exchange/imports', formData, 'Failed to start import');
};

export const getDataImportHistory = () => unwrap(request('/reporting/data-exchange/imports'));

export const getWebhookEndpoints = () => unwrap(request('/reporting/webhooks'));

export const createWebhookEndpoint = (payload) => unwrap(request('/reporting/webhooks', {
    method: 'POST',
    body: payload,
}));

export const updateWebhookEndpoint = (id, payload) => unwrap(request(`/reporting/webhooks/${id}`, {
    method: 'PUT',
    body: payload,
}));

export const deleteWebhookEndpoint = (id) => request(`/reporting/webhooks/${id}`, {
    method: 'DELETE',
});

export const getWebhookDeliveries = () => unwrap(request('/reporting/webhooks/deliveries'));

export const getFinancialEvents = (params = {}) => unwrap(request(`/financial-events${buildQuery(params)}`));

export const retryFinancialEvent = (id) => unwrap(request(`/financial-events/${id}/retry`, {
    method: 'POST',
}));

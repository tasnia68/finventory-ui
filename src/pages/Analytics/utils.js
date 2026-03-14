export const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

export const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

export const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
};

export const formatCurrency = (value, currency = 'USD') => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatNumber = (value) => new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
}).format(Number(value || 0));

export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
};

export const getImportStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'FAILED':
            return 'danger';
        case 'PROCESSING':
            return 'info';
        case 'VALIDATED':
            return 'primary';
        default:
            return 'warning';
    }
};

export const getExecutionStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
        case 'SUCCESS':
            return 'success';
        case 'FAILED':
            return 'danger';
        case 'RUNNING':
        case 'PROCESSING':
            return 'info';
        default:
            return 'warning';
    }
};

export const getWebhookStatusVariant = (status) => {
    switch (status) {
        case 'SUCCESS':
            return 'success';
        case 'FAILED':
            return 'danger';
        default:
            return 'warning';
    }
};

export const getAlertStatusVariant = (status) => {
    switch (status) {
        case 'BELOW_MIN':
            return 'danger';
        case 'ABOVE_MAX':
            return 'warning';
        default:
            return 'default';
    }
};

export const getReportLabel = (reportType) => {
    switch (reportType) {
        case 'CURRENT_STOCK':
            return 'Current Stock';
        case 'STOCK_MOVEMENT':
            return 'Stock Movements';
        case 'AGING_ANALYSIS':
            return 'Aging Analysis';
        case 'PURCHASE_ORDER':
            return 'Purchase Orders';
        case 'SALES_ORDER':
            return 'Sales Orders';
        case 'SUPPLIER_PERFORMANCE':
            return 'Supplier Performance';
        default:
            return reportType || 'Report';
    }
};

export const getReportDescription = (reportType) => {
    switch (reportType) {
        case 'CURRENT_STOCK':
            return 'Live on-hand and available stock by SKU and warehouse.';
        case 'STOCK_MOVEMENT':
            return 'Movement ledger across receipts, issues, and adjustments.';
        case 'AGING_ANALYSIS':
            return 'Slow-moving inventory exposure and idle stock risk.';
        case 'PURCHASE_ORDER':
            return 'Inbound purchasing throughput and supplier commitments.';
        case 'SALES_ORDER':
            return 'Outbound order execution and fulfillment progress.';
        case 'SUPPLIER_PERFORMANCE':
            return 'Spend, lead time, and reliability benchmarks by supplier.';
        default:
            return 'Operational reporting output.';
    }
};

export const toHeadline = (value) => String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
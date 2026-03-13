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

export const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

export const average = (values = []) => {
    const numbers = values.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
    if (!numbers.length) return 0;
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};

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

export const getSupplierStatusVariant = (status) => {
    switch (status) {
        case 'APPROVED':
            return 'success';
        case 'REJECTED':
            return 'danger';
        case 'INACTIVE':
            return 'default';
        default:
            return 'warning';
    }
};

export const getPurchaseOrderStatusVariant = (status) => {
    switch (status) {
        case 'APPROVED':
        case 'ISSUED':
            return 'info';
        case 'PARTIALLY_RECEIVED':
            return 'warning';
        case 'COMPLETED':
        case 'CLOSED':
            return 'success';
        case 'CANCELLED':
        case 'REJECTED':
            return 'danger';
        default:
            return 'default';
    }
};

export const getGoodsReceiptStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'VERIFIED':
            return 'info';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'warning';
    }
};

export const getSupplierReturnStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'warning';
    }
};
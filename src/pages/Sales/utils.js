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

export const COURIER_PROVIDER_OPTIONS = [
    { value: 'PATHAO', label: 'Pathao' },
    { value: 'STEADFAST', label: 'Steadfast' },
    { value: 'REDX', label: 'RedX' },
    { value: 'PAPERFLY', label: 'Paperfly' },
    { value: 'CUSTOM', label: 'Custom / Manual' },
];

export const COURIER_DISPATCH_OPTIONS = [
    { value: 'UNASSIGNED', label: 'Unassigned' },
    { value: 'BOOKED', label: 'Booked' },
    { value: 'PICKUP_PENDING', label: 'Pickup Pending' },
    { value: 'PICKED_UP', label: 'Picked Up' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'DELIVERY_FAILED', label: 'Delivery Failed' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

export const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'download.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
};

export const getCustomerStatusVariant = (status) => {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'BLOCKED':
            return 'danger';
        default:
            return 'warning';
    }
};

export const getSalesOrderStatusVariant = (status) => {
    switch (status) {
        case 'CONFIRMED':
        case 'APPROVED':
            return 'info';
        case 'BACKORDERED':
        case 'PENDING_APPROVAL':
        case 'PARTIALLY_SHIPPED':
            return 'warning';
        case 'SHIPPED':
        case 'DELIVERED':
        case 'RETURNED':
            return 'success';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'default';
    }
};

export const getPickingStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'IN_PROGRESS':
        case 'ASSIGNED':
            return 'info';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'warning';
    }
};

export const getShipmentStatusVariant = (status) => {
    switch (status) {
        case 'DELIVERED':
            return 'success';
        case 'IN_TRANSIT':
        case 'READY_TO_SHIP':
            return 'info';
        case 'CANCELLED':
        case 'RETURNED':
            return 'danger';
        default:
            return 'warning';
    }
};

export const getCourierDispatchVariant = (status) => {
    switch (status) {
        case 'DELIVERED':
            return 'success';
        case 'BOOKED':
        case 'PICKED_UP':
        case 'IN_TRANSIT':
        case 'OUT_FOR_DELIVERY':
            return 'info';
        case 'DELIVERY_FAILED':
        case 'RETURNED':
        case 'CANCELLED':
            return 'danger';
        case 'PICKUP_PENDING':
            return 'warning';
        default:
            return 'default';
    }
};

export const getRmaStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'APPROVED':
        case 'RECEIVED':
            return 'info';
        case 'REJECTED':
        case 'CANCELLED':
            return 'danger';
        default:
            return 'warning';
    }
};

export const getCreditTransactionVariant = (type) => {
    switch (type) {
        case 'PAYMENT':
            return 'success';
        case 'CHARGE':
            return 'warning';
        default:
            return 'info';
    }
};

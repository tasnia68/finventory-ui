export const COUNT_TYPES = [
    { value: 'FULL', label: 'Full' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'SPOT_CHECK', label: 'Spot check' },
];

export const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'REVIEW', label: 'Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

export const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

export const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
};

export const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

export const formatNumber = (value) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

export const getStatusVariant = (status) => {
    if (status === 'APPROVED' || status === 'COMPLETED') return 'success';
    if (status === 'IN_PROGRESS' || status === 'REVIEW') return 'warning';
    if (status === 'CANCELLED') return 'danger';
    return 'info';
};

export const getUserLabel = (user) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || user.id;
};

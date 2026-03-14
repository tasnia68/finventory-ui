export const formatCurrency = (value, currency = 'USD') => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
}).format(Number(value || 0));

export const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const getSaleSyncVariant = (status) => {
    switch (status) {
        case 'synced':
            return 'success';
        case 'pending_sync':
            return 'warning';
        default:
            return 'default';
    }
};

export const getStockTone = (onHand) => {
    if (onHand === null || onHand === undefined) return 'slate';
    if (Number(onHand) <= 0) return 'rose';
    if (Number(onHand) <= 5) return 'amber';
    return 'emerald';
};
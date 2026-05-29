// Shared constants and helpers for Refunds & Exchanges pages

export const REFUND_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
export const REFUND_TYPES = ['REFUND', 'EXCHANGE', 'STORE_CREDIT'];
export const REFUND_METHODS = ['ORIGINAL_PAYMENT_METHOD', 'STORE_CREDIT', 'CASH', 'CARD', 'TRANSFER', 'OTHER'];
export const RETURN_DISPOSITIONS = ['RETURN_TO_STOCK', 'QUARANTINE', 'SCRAP', 'SUPPLIER_CLAIM'];

export const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

export const createReplacementItem = () => ({
    id: crypto.randomUUID(),
    variant: null,
    quantity: '',
    unitPrice: '',
});

export const createRefundItem = (item) => ({
    salesOrderItemId: item.id,
    productVariantId: item.productVariantId,
    sku: item.sku,
    shippedQuantity: Number(item.shippedQuantity || item.quantity || 0),
    quantity: '',
    unitPrice: String(item.unitPrice || ''),
    returnDisposition: 'RETURN_TO_STOCK',
    reason: '',
    batchId: '',
    storageLocationId: '',
    serialNumbers: '',
});

export const getRefundStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'APPROVED':
            return 'primary';
        case 'PENDING_APPROVAL':
            return 'warning';
        case 'REJECTED':
        case 'CANCELLED':
            return 'danger';
        default:
            return 'default';
    }
};

export const getRefundTypeVariant = (type) => {
    switch (type) {
        case 'EXCHANGE':
            return 'info';
        case 'STORE_CREDIT':
            return 'primary';
        default:
            return 'default';
    }
};

export const createRefundForm = (initial = {}) => ({
    salesOrderId: '',
    rmaId: '',
    warehouseId: '',
    refundType: 'REFUND',
    refundMethod: 'ORIGINAL_PAYMENT_METHOD',
    reason: '',
    notes: '',
    items: [],
    replacementItems: [],
    ...initial,
});

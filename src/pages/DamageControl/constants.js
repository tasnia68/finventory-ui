// Shared constants and helpers for DamageControl pages

export const DAMAGE_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
export const DAMAGE_SOURCE_TYPES = ['WAREHOUSE', 'RECEIVING', 'SALES_RETURN', 'OTHER'];
export const DAMAGE_REASON_CODES = ['DAMAGED', 'EXPIRED', 'SHRINKAGE', 'CONTAMINATED', 'INTERNAL_USE', 'OTHER'];
export const DAMAGE_DISPOSITIONS = ['QUARANTINE', 'WRITE_OFF'];
export const CLAIM_TYPES = ['DAMAGED_RECEIPT', 'REJECTED_RECEIPT'];
export const DOCUMENT_TYPES = ['PHOTO', 'INSPECTION_NOTE', 'VENDOR_EVIDENCE', 'OTHER'];

export const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

export const createIncidentItem = () => ({
    id: crypto.randomUUID(),
    variant: null,
    quantity: '',
    disposition: 'QUARANTINE',
    serialNumbers: '',
});

export const createInitialIncidentForm = () => ({
    warehouseId: '',
    sourceType: 'WAREHOUSE',
    reasonCode: 'DAMAGED',
    reference: '',
    notes: '',
    items: [createIncidentItem()],
});

export const createInitialReceivingForm = (goodsReceipt = null) => ({
    goodsReceiptNoteId: goodsReceipt?.id || '',
    reasonCode: 'DAMAGED',
    notes: '',
    createSupplierClaim: false,
    supplierClaimReason: '',
    supplierClaimNotes: '',
    items: createReceivingItems(goodsReceipt),
});

export const createInitialClaimForm = (goodsReceipt = null) => ({
    goodsReceiptNoteId: goodsReceipt?.id || '',
    damageRecordId: '',
    claimType: 'REJECTED_RECEIPT',
    reason: '',
    notes: '',
    items: createClaimItems(goodsReceipt),
});

export function createReceivingItems(goodsReceipt) {
    return (goodsReceipt?.items || [])
        .filter((item) => Number(item.rejectedQuantity || 0) > 0)
        .map((item) => ({
            goodsReceiptNoteItemId: item.id,
            productVariantSku: item.productVariantSku,
            rejectedQuantity: Number(item.rejectedQuantity || 0),
            quantity: String(item.rejectedQuantity || 0),
            disposition: 'QUARANTINE',
        }));
}

export function createClaimItems(goodsReceipt) {
    return (goodsReceipt?.items || [])
        .filter((item) => Number(item.rejectedQuantity || 0) > 0)
        .map((item) => ({
            goodsReceiptNoteItemId: item.id,
            productVariantSku: item.productVariantSku,
            rejectedQuantity: Number(item.rejectedQuantity || 0),
            quantity: String(item.rejectedQuantity || 0),
            reason: item.rejectionReason || '',
        }));
}

export const formatDecimal = (value, formatNumber) => formatNumber(Number(value || 0), { maximumFractionDigits: 2 });

export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const getDamageStatusVariant = (status) => {
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

export const getDispositionVariant = (value) => (value === 'WRITE_OFF' ? 'danger' : 'warning');

export const getClaimStatusVariant = (status) => {
    switch (status) {
        case 'RETURN_REQUESTED':
            return 'warning';
        case 'RESOLVED':
            return 'success';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'primary';
    }
};

export const sumRejectedQuantity = (goodsReceipt) => goodsReceipt?.items?.reduce((sum, item) => sum + Number(item.rejectedQuantity || 0), 0) || 0;
export const sumClaimQuantity = (claim) => claim?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

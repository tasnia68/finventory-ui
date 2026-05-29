// Shared constants and helpers for the Orders (web/sales) pages.

export const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

export const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'HOLD', label: 'Hold' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PACKAGING', label: 'Packaging' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'PARTIALLY_DELIVERED', label: 'Partial' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'RETURNED', label: 'Returned' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

export const ACTION_META = {
    PENDING: { label: 'Submit for review', hint: 'Move from draft into the approval queue.' },
    HOLD: { label: 'Place on hold', hint: 'Reserve stock but pause fulfillment pending decision.', needsReason: true },
    APPROVED: { label: 'Approve', hint: 'Approve for confirmation and courier assignment.' },
    CONFIRMED: { label: 'Confirm + assign courier', hint: 'Lock the order and attach a courier + zone.', needsCourier: true },
    PACKAGING: { label: 'Move to packaging', hint: 'Print invoice, pack the goods.' },
    SHIPPED: { label: 'Mark shipped', hint: 'Courier has picked up. Fulfills reservations.' },
    DELIVERED: { label: 'Mark delivered', hint: 'Customer received full order. Posts AR invoice and revenue.' },
    PARTIALLY_DELIVERED: { label: 'Record partial delivery…', hint: 'Some items accepted, some returned or cancelled.', needsPartial: true },
    PARTIALLY_CANCELLED: { label: 'Partial cancel', hint: 'Delivery fee kept, product returned.' },
    RETURNED: { label: 'Mark returned', hint: 'Post-delivery return. Restocks inventory.', variant: 'danger' },
    CANCELLED: { label: 'Cancel', hint: 'Releases reservations. Pre-ship only.', variant: 'danger' },
    DELIVERY_FAILED: { label: 'Delivery failed', hint: 'Courier could not deliver.', variant: 'danger' },
    DRAFT: { label: 'Return to draft', hint: 'Send back to draft.' },
    BACKORDERED: { label: 'Move to backorder', hint: 'Stock unavailable.' },
};

export const ageLabel = (iso) => {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'future';
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
};

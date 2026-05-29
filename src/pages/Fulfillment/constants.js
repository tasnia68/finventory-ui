// Shared constants and helpers for Fulfillment pages

export const PICKING_STATUS_OPTIONS = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    .map((value) => ({ value, label: value.replaceAll('_', ' ') }));

export const SHIPMENT_STATUS_OPTIONS = ['DRAFT', 'READY_TO_SHIP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED']
    .map((value) => ({ value, label: value.replaceAll('_', ' ') }));

export const COURIER_STATUS_OPTIONS = ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'CANCELLED']
    .map((value) => ({ value, label: value.replaceAll('_', ' ') }));

export const createEmptyPickingForm = () => ({ salesOrderIds: [], assignedToId: '', notes: '' });

export const createEmptyShipmentForm = () => ({
    salesOrderId: '',
    carrier: '',
    courierProvider: '',
    courierService: '',
    courierReference: '',
    cashOnDeliveryAmount: '',
    deliveryFee: '',
    notes: '',
    items: [],
});

export const createEmptyShipmentQueues = () => ({
    READY_TO_HANDOFF: [],
    IN_TRANSIT: [],
    NEEDS_ACTION: [],
});

export const SHIPMENT_QUEUE_CONFIG = [
    {
        key: 'READY_TO_HANDOFF',
        label: 'Ready for courier',
        tone: 'amber',
        icon: 'inventory_2',
        caption: 'Packed shipments waiting for booking, reference, or rider handoff.',
    },
    {
        key: 'IN_TRANSIT',
        label: 'In transit',
        tone: 'blue',
        icon: 'local_shipping',
        caption: 'Picked up, linehaul, and out-for-delivery movement.',
    },
    {
        key: 'NEEDS_ACTION',
        label: 'Needs action',
        tone: 'rose',
        icon: 'error',
        caption: 'Delivery review, failed attempts, or missing courier handoff data.',
    },
];

export const getShipmentQueueVariant = (queueKey) => {
    switch (queueKey) {
        case 'READY_TO_HANDOFF':
            return 'warning';
        case 'IN_TRANSIT':
            return 'info';
        case 'NEEDS_ACTION':
            return 'danger';
        default:
            return 'default';
    }
};

export const describeShipmentNextStep = (shipment) => {
    const dispatchStatus = shipment.courierDispatchStatus || 'UNASSIGNED';

    if (['PENDING', 'DISPUTED'].includes(shipment.deliveryReviewStatus)) {
        return shipment.deliveryReviewStatus === 'DISPUTED' ? 'Resolve disputed delivery outcome' : 'Review proof and close delivery review';
    }
    if (!shipment.courierProvider) {
        return 'Assign courier provider';
    }
    if (dispatchStatus === 'UNASSIGNED') {
        return 'Book courier handoff';
    }
    if (['BOOKED', 'PICKUP_PENDING'].includes(dispatchStatus) && !shipment.courierReference) {
        return 'Capture courier reference';
    }
    if (['BOOKED', 'PICKUP_PENDING'].includes(dispatchStatus)) {
        return 'Confirm pickup handoff';
    }
    if (['PICKED_UP', 'IN_TRANSIT'].includes(dispatchStatus)) {
        return 'Monitor or sync courier movement';
    }
    if (dispatchStatus === 'OUT_FOR_DELIVERY') {
        return 'Watch final-mile outcome';
    }
    if (dispatchStatus === 'DELIVERY_FAILED') {
        return 'Reschedule or contact customer';
    }
    if (dispatchStatus === 'RETURNED') {
        return 'Inspect return and reopen order path';
    }
    return 'Review shipment timeline';
};

export const showAlertHelper = (setAlert) => (type, message) => {
    setAlert({ type, message });
    window.setTimeout(() => setAlert(null), 5000);
};

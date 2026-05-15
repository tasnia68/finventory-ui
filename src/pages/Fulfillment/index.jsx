import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getPickingList, getPickingLists, createPickingList, assignPicker, updatePickingTask, completePickingList, getPackingList } from '../../services/pickingService';
import { getSalesOrder, getSalesOrders } from '../../services/salesOrderService';
import { approveDelivery, bookSteadfast, confirmDelivery, createRma, createShipment, disputeDelivery, generateShippingLabel, getDeliveryNote, getRmas, getShipment, getShipmentQueueSummary, getShipments, getShipmentsByQueue, refreshSteadfastQueue, updateRmaStatus, updateShipmentTracking, syncSteadfastStatus } from '../../services/shipmentService';
import { getUsers } from '../../services/userService';
import { getWarehouses } from '../../services/warehouseService';
import PickingListDetailModal from './PickingListDetailModal';
import PickingListFormModal from './PickingListFormModal';
import FulfillmentOrderDetailScreen from './FulfillmentOrderDetailScreen';
import RmaDetailModal from './RmaDetailModal';
import ShipmentFormModal from './ShipmentFormModal';
import {
    formatCurrency,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getDeliveryReviewVariant,
    getPickingStatusVariant,
    getRmaStatusVariant,
    getShipmentStatusVariant,
    toList,
} from '../Sales/utils';

const PICKING_STATUS_OPTIONS = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
const SHIPMENT_STATUS_OPTIONS = ['DRAFT', 'READY_TO_SHIP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
const COURIER_STATUS_OPTIONS = ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'CANCELLED'].map((value) => ({ value, label: value.replaceAll('_', ' ') }));

const createEmptyPickingForm = () => ({ salesOrderIds: [], assignedToId: '', notes: '' });
const createEmptyShipmentForm = () => ({
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

const createEmptyShipmentQueues = () => ({
    READY_TO_HANDOFF: [],
    IN_TRANSIT: [],
    NEEDS_ACTION: [],
});

const SHIPMENT_QUEUE_CONFIG = [
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

const getShipmentQueueVariant = (queueKey) => {
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

const describeShipmentNextStep = (shipment) => {
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

const TABS = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'picking', label: 'Ready to pack', icon: 'assignment' },
    { id: 'shipments', label: 'Dispatch', icon: 'local_shipping' },
    { id: 'exceptions', label: 'Needs action', icon: 'error' },
    { id: 'returns', label: 'Returns', icon: 'assignment_return' },
];

const Fulfillment = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [warehouses, setWarehouses] = useState([]);
    const [users, setUsers] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [pickingLists, setPickingLists] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [shipmentQueues, setShipmentQueues] = useState(createEmptyShipmentQueues());
    const [shipmentQueueSummary, setShipmentQueueSummary] = useState({
        readyToHandoffCount: 0,
        inTransitCount: 0,
        needsActionCount: 0,
        deliveryReviewPendingCount: 0,
        deliveryReviewDisputedCount: 0,
    });
    const [detailSalesOrder, setDetailSalesOrder] = useState(null);
    const [detailShipments, setDetailShipments] = useState([]);
    const [detailRmas, setDetailRmas] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [rmas, setRmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ query: '', warehouseId: '', pickingStatus: '', shipmentStatus: '', courierStatus: '', provider: '' });
    const [activeShipmentQueue, setActiveShipmentQueue] = useState('READY_TO_HANDOFF');
    const [showPickingForm, setShowPickingForm] = useState(false);
    const [showShipmentForm, setShowShipmentForm] = useState(false);
    const [pickingForm, setPickingForm] = useState(createEmptyPickingForm());
    const [shipmentForm, setShipmentForm] = useState(createEmptyShipmentForm());
    const [selectedPicking, setSelectedPicking] = useState(null);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [selectedRma, setSelectedRma] = useState(null);
    const [pickingApiUnavailable, setPickingApiUnavailable] = useState(false);
    const detailShipmentId = searchParams.get('shipment');

    useEffect(() => {
        loadPage();
    }, []);

    useEffect(() => {
        const queueFromUrl = searchParams.get('queue');
        if (!queueFromUrl) {
            return;
        }

        if (queueFromUrl === 'NEEDS_ACTION') {
            setActiveTab('exceptions');
        } else if (queueFromUrl === 'READY_TO_HANDOFF' || queueFromUrl === 'IN_TRANSIT' || queueFromUrl === 'ALL') {
            setActiveTab('shipments');
        }

        setActiveShipmentQueue(queueFromUrl);
    }, [searchParams]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadShipmentDetail = async (shipmentId) => {
        setDetailLoading(true);
        try {
            const shipment = await getShipment(shipmentId);
            setSelectedShipment(shipment);

            const [salesOrder, shipmentList, rmaList] = await Promise.all([
                getSalesOrder(shipment.salesOrderId),
                getShipments({ salesOrderId: shipment.salesOrderId, page: 0, size: 50, sortBy: 'updatedAt', sortDirection: 'desc' }),
                getRmas({ salesOrderId: shipment.salesOrderId, page: 0, size: 50 }),
            ]);

            setDetailSalesOrder(salesOrder);
            setDetailShipments(toList(shipmentList));
            setDetailRmas(toList(rmaList));
            return shipment;
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        if (!detailShipmentId) {
            setSelectedShipment(null);
            setDetailSalesOrder(null);
            setDetailShipments([]);
            setDetailRmas([]);
            return undefined;
        }

        const load = async () => {
            try {
                const shipment = await loadShipmentDetail(detailShipmentId);
                if (cancelled) {
                    return;
                }
                setSelectedShipment(shipment);
            } catch (error) {
                if (!cancelled) {
                    showAlert('error', error.message || 'Failed to load fulfillment detail');
                    const next = new URLSearchParams(searchParams);
                    next.delete('shipment');
                    setSearchParams(next);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [detailShipmentId]);

    const updateDetailRoute = (queueKey, shipmentId) => {
        const next = new URLSearchParams(searchParams);
        if (queueKey) {
            next.set('queue', queueKey);
        }
        if (shipmentId) {
            next.set('shipment', shipmentId);
        } else {
            next.delete('shipment');
        }
        setSearchParams(next);
    };

    const openShipmentDetail = (shipment, queueKey = activeShipmentQueue) => {
        setSelectedShipment(shipment);
        updateDetailRoute(queueKey, shipment.id);
    };

    const closeShipmentDetail = () => {
        updateDetailRoute(activeShipmentQueue, null);
    };

    const activateShipmentQueue = (queueKey) => {
        setActiveShipmentQueue(queueKey);
        setActiveTab(queueKey === 'NEEDS_ACTION' ? 'exceptions' : 'shipments');
        updateDetailRoute(queueKey, null);
    };

    const loadPage = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getUsers(),
            getSalesOrders({ page: 0, size: 100 }),
            getPickingLists({ page: 0, size: 100 }),
            getShipments({ page: 0, size: 100 }),
            getShipmentQueueSummary(),
            getShipmentsByQueue('READY_TO_HANDOFF', { page: 0, size: 50 }),
            getShipmentsByQueue('IN_TRANSIT', { page: 0, size: 50 }),
            getShipmentsByQueue('NEEDS_ACTION', { page: 0, size: 50 }),
            getRmas({ page: 0, size: 100 }),
        ]);

        const [warehouseResult, userResult, salesOrderResult, pickingResult, shipmentResult, queueSummaryResult, readyToHandoffResult, inTransitResult, needsActionResult, rmaResult] = results;

        if (warehouseResult.status === 'fulfilled') {
            setWarehouses(Array.isArray(warehouseResult.value) ? warehouseResult.value : []);
        }
        if (userResult.status === 'fulfilled') {
            setUsers(toList(userResult.value));
        }
        if (salesOrderResult.status === 'fulfilled') {
            setSalesOrders(toList(salesOrderResult.value));
        }
        if (pickingResult.status === 'fulfilled') {
            setPickingLists(toList(pickingResult.value));
            setPickingApiUnavailable(false);
        } else {
            setPickingLists([]);
            setPickingApiUnavailable(true);
        }
        if (shipmentResult.status === 'fulfilled') {
            setShipments(toList(shipmentResult.value));
        }
        if (queueSummaryResult.status === 'fulfilled') {
            setShipmentQueueSummary(queueSummaryResult.value || {});
        } else {
            setShipmentQueueSummary({
                readyToHandoffCount: 0,
                inTransitCount: 0,
                needsActionCount: 0,
                deliveryReviewPendingCount: 0,
                deliveryReviewDisputedCount: 0,
            });
        }
        setShipmentQueues({
            READY_TO_HANDOFF: readyToHandoffResult.status === 'fulfilled' ? toList(readyToHandoffResult.value) : [],
            IN_TRANSIT: inTransitResult.status === 'fulfilled' ? toList(inTransitResult.value) : [],
            NEEDS_ACTION: needsActionResult.status === 'fulfilled' ? toList(needsActionResult.value) : [],
        });
        if (rmaResult.status === 'fulfilled') {
            setRmas(toList(rmaResult.value));
        }

        const failedMessages = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
            .filter(Boolean);

        if (failedMessages.length > 0) {
            const onlyPickingFailed = failedMessages.length === 1 && pickingResult.status === 'rejected';
            showAlert(
                onlyPickingFailed ? 'warning' : 'error',
                onlyPickingFailed
                    ? 'Picking register is unavailable from the current backend instance. Shipment and return workflows are still available.'
                    : failedMessages[0] || 'Failed to load fulfillment workspace'
            );
        }

        setLoading(false);
    };

    const filteredPickingLists = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return pickingLists.filter((pickingList) => {
            if (filters.warehouseId && pickingList.warehouseId !== filters.warehouseId) return false;
            if (filters.pickingStatus && pickingList.status !== filters.pickingStatus) return false;
            if (!normalizedQuery) return true;
            return [pickingList.pickingNumber, pickingList.warehouseName, pickingList.assignedToName]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [pickingLists, filters]);

    const filterShipmentCollection = (collection) => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return collection.filter((shipment) => {
            if (filters.warehouseId && shipment.warehouseId !== filters.warehouseId) return false;
            if (filters.shipmentStatus && shipment.status !== filters.shipmentStatus) return false;
            if (filters.courierStatus && (shipment.courierDispatchStatus || 'UNASSIGNED') !== filters.courierStatus) return false;
            if (filters.provider && (shipment.courierProvider || '') !== filters.provider) return false;
            if (!normalizedQuery) return true;
            return [shipment.shipmentNumber, shipment.soNumber, shipment.trackingNumber, shipment.carrier, shipment.courierProvider, shipment.courierReference, shipment.lastCourierEvent]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    };

    const filteredShipments = useMemo(() => {
        return filterShipmentCollection(shipments);
    }, [shipments, filters]);

    const filteredShipmentQueues = useMemo(() => ({
        READY_TO_HANDOFF: filterShipmentCollection(shipmentQueues.READY_TO_HANDOFF),
        IN_TRANSIT: filterShipmentCollection(shipmentQueues.IN_TRANSIT),
        NEEDS_ACTION: filterShipmentCollection(shipmentQueues.NEEDS_ACTION),
    }), [shipmentQueues, filters]);

    const filteredRmas = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return rmas.filter((rma) => {
            if (!normalizedQuery) return true;
            return [rma.rmaNumber, rma.soNumber, rma.shipmentNumber]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [rmas, filters.query]);

    const exceptionShipments = filteredShipmentQueues.NEEDS_ACTION;

    const summary = useMemo(() => ({
        openPicks: pickingLists.filter((list) => !['COMPLETED', 'CANCELLED'].includes(list.status)).length,
        awaitingCourier: shipmentQueueSummary.readyToHandoffCount ?? 0,
        inTransitShipments: shipmentQueueSummary.inTransitCount ?? 0,
        outForDelivery: shipments.filter((shipment) => shipment.courierDispatchStatus === 'OUT_FOR_DELIVERY').length,
        deliveredShipments: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
        dispatchExceptions: shipmentQueueSummary.needsActionCount ?? 0,
        openRmas: rmas.filter((rma) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rma.status)).length,
    }), [pickingLists, shipmentQueueSummary, shipments, rmas]);

    const providerOptions = useMemo(
        () => [...new Set(shipments.map((shipment) => shipment.courierProvider).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right))
            .map((value) => ({ value, label: value })),
        [shipments]
    );

    const queueBoardRows = useMemo(() => SHIPMENT_QUEUE_CONFIG.flatMap((queue) => (
        filteredShipmentQueues[queue.key].slice(0, 6).map((shipment) => ({
            id: `${queue.key}-${shipment.id}`,
            queueLabel: queue.label,
            queueKey: queue.key,
            shipmentNumber: shipment.shipmentNumber,
            soNumber: shipment.soNumber,
            courier: shipment.courierProvider || shipment.carrier || 'Pending',
            reviewStatus: shipment.deliveryReviewStatus || 'NOT_REQUIRED',
            lastSignal: shipment.lastCourierEvent || 'No courier event logged',
            nextAction: describeShipmentNextStep(shipment),
            shipment,
        }))
    )), [filteredShipmentQueues]);

    const activeQueueMeta = SHIPMENT_QUEUE_CONFIG.find((queue) => queue.key === activeShipmentQueue);
    const activeQueueShipments = activeShipmentQueue === 'ALL' ? filteredShipments : (filteredShipmentQueues[activeShipmentQueue] || []);

    const eligibleForPicking = useMemo(() => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED'].includes(order.status)), [salesOrders]);
    const eligibleForShipment = useMemo(() => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED', 'PARTIALLY_SHIPPED'].includes(order.status)), [salesOrders]);

    const runAction = async (action, successMessage) => {
        try {
            setWorking(true);
            const result = await action();
            showAlert('success', successMessage);
            await loadPage();
            if (detailShipmentId) {
                await loadShipmentDetail(detailShipmentId);
            }
            return result;
        } catch (error) {
            showAlert('error', error.message || 'Fulfillment action failed');
            throw error;
        } finally {
            setWorking(false);
        }
    };

    const handleCreatePickingList = async (event) => {
        event.preventDefault();
        if (pickingApiUnavailable) {
            showAlert('warning', 'Picking endpoints are unavailable from the current backend instance. Restart the backend with the latest build before generating picks.');
            return;
        }
        const created = await runAction(
            () => createPickingList({ salesOrderIds: pickingForm.salesOrderIds, assignedToId: pickingForm.assignedToId || null, notes: pickingForm.notes || null }),
            'Picking list generated successfully'
        );
        setShowPickingForm(false);
        setPickingForm(createEmptyPickingForm());
        setSelectedPicking(created);
    };

    const handleCreateShipment = async (event) => {
        event.preventDefault();
        const items = shipmentForm.items.filter((item) => Number(item.quantity) > 0).map((item) => ({ salesOrderItemId: item.salesOrderItemId, quantity: Number(item.quantity) }));
        const created = await runAction(
            () => createShipment({
                salesOrderId: shipmentForm.salesOrderId,
                carrier: shipmentForm.carrier || null,
                courierProvider: shipmentForm.courierProvider || null,
                courierService: shipmentForm.courierService || null,
                courierReference: shipmentForm.courierReference || null,
                cashOnDeliveryAmount: shipmentForm.cashOnDeliveryAmount === '' ? null : Number(shipmentForm.cashOnDeliveryAmount),
                deliveryFee: shipmentForm.deliveryFee === '' ? null : Number(shipmentForm.deliveryFee),
                notes: shipmentForm.notes || null,
                items,
            }),
            'Shipment created successfully'
        );
        setShowShipmentForm(false);
        setShipmentForm(createEmptyShipmentForm());
        setSelectedShipment(created);
    };

    const handleAssignPicker = async (pickingListId, userId) => {
        const updated = await runAction(() => assignPicker(pickingListId, userId), 'Picker assigned successfully');
        setSelectedPicking(updated);
    };

    const handleUpdateTask = async (taskId, draft) => {
        const updated = await runAction(() => updatePickingTask(taskId, { pickedQuantity: Number(draft.pickedQuantity || 0), notes: draft.notes || null }), 'Picking task updated');
        setSelectedPicking(updated);
    };

    const handleCompletePickingList = async (pickingListId) => {
        const updated = await runAction(() => completePickingList(pickingListId), 'Picking list completed');
        setSelectedPicking(updated);
    };

    const handleOpenPicking = async (row) => {
        if (pickingApiUnavailable) {
            showAlert('warning', 'Picking detail is unavailable from the current backend instance.');
            return;
        }
        try {
            const detail = await getPickingList(row.id);
            setSelectedPicking(detail);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load picking list detail');
        }
    };

    const handleUpdateTracking = async (shipmentId, payload) => {
        const updated = await runAction(() => updateShipmentTracking(shipmentId, payload), 'Shipment tracking updated');
        setSelectedShipment(updated);
    };

    const handleGenerateLabel = async (shipmentId) => {
        const updated = await runAction(() => generateShippingLabel(shipmentId), 'Shipping label generated');
        setSelectedShipment(updated);
    };

    const handleConfirmDelivery = async (shipmentId) => {
        const updated = await runAction(() => confirmDelivery(shipmentId), 'Delivery confirmed successfully');
        setSelectedShipment(updated);
    };

    const handleBookSteadfast = async (shipmentId) => {
        const updated = await runAction(() => bookSteadfast(shipmentId), 'Shipment booked with Steadfast');
        setSelectedShipment(updated);
    };

    const handleSyncSteadfast = async (shipmentId) => {
        const updated = await runAction(() => syncSteadfastStatus(shipmentId), 'Steadfast status synced');
        setSelectedShipment(updated);
    };

    const handleRefreshActiveQueue = async () => {
        if (activeShipmentQueue === 'ALL') {
            await loadPage();
            if (detailShipmentId) {
                await loadShipmentDetail(detailShipmentId);
            }
            showAlert('success', 'Shipment register refreshed');
            return;
        }

        const result = await runAction(() => refreshSteadfastQueue(activeShipmentQueue), `${activeShipmentQueue.replaceAll('_', ' ')} queue refreshed`);
        showAlert('success', `${activeShipmentQueue.replaceAll('_', ' ')} queue refreshed: ${result.attemptedCount} attempted, ${result.failedCount} failed`);
    };

    const handleApproveDelivery = async (shipmentId, payload) => {
        const updated = await runAction(() => approveDelivery(shipmentId, payload), 'Delivery review approved');
        setSelectedShipment(updated);
    };

    const handleDisputeDelivery = async (shipmentId, payload) => {
        const updated = await runAction(() => disputeDelivery(shipmentId, payload), 'Delivery marked as disputed');
        setSelectedShipment(updated);
    };

    const handleCreateRma = async (payload) => {
        const created = await runAction(() => createRma(payload), 'RMA created successfully');
        setSelectedRma(created);
    };

    const handleUpdateRmaStatus = async (id, status) => {
        const updated = await runAction(() => updateRmaStatus(id, { status, notes: null }), `RMA moved to ${status}`);
        setSelectedRma(updated);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Fulfillment Control"
                    title="Coordinate picking, shipping, and returns from one operational console."
                    description="Run queue-first fulfillment from one workspace: release packed orders to courier, monitor in-transit shipments, and clear only the exceptions that need human attention."
                    actions={(
                        <>
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            {(activeTab === 'shipments' || activeTab === 'exceptions' || detailShipmentId) && <Button variant="secondary" icon="sync" onClick={handleRefreshActiveQueue}>Refresh Active Queue</Button>}
                            {activeTab === 'picking' && <Button variant="secondary" icon="playlist_add" onClick={() => setShowPickingForm(true)} disabled={pickingApiUnavailable}>Generate Pick</Button>}
                            {(activeTab === 'shipments' || activeTab === 'exceptions') && <Button icon="local_shipping" onClick={() => setShowShipmentForm(true)}>Create Shipment</Button>}
                        </>
                    )}
                    accent="from-orange-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                {/* Tab bar */}
                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                            {tab.id === 'picking' && summary.openPicks > 0 && (
                                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{summary.openPicks}</span>
                            )}
                            {tab.id === 'shipments' && summary.awaitingCourier > 0 && (
                                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{summary.awaitingCourier}</span>
                            )}
                            {tab.id === 'exceptions' && summary.dispatchExceptions > 0 && (
                                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">{summary.dispatchExceptions}</span>
                            )}
                            {tab.id === 'returns' && summary.openRmas > 0 && (
                                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-violet-100 px-1.5 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{summary.openRmas}</span>
                            )}
                        </button>
                    ))}
                </div>

                {detailShipmentId ? (
                    <FulfillmentOrderDetailScreen
                        salesOrder={detailSalesOrder}
                        shipment={selectedShipment}
                        relatedShipments={detailShipments}
                        relatedRmas={detailRmas}
                        queueLabel={SHIPMENT_QUEUE_CONFIG.find((queue) => queue.key === activeShipmentQueue)?.label || activeShipmentQueue}
                        loading={working || detailLoading}
                        onBack={closeShipmentDetail}
                        onSelectShipment={(shipment) => openShipmentDetail(shipment, activeShipmentQueue)}
                        onUpdateTracking={handleUpdateTracking}
                        onGenerateLabel={handleGenerateLabel}
                        onConfirmDelivery={handleConfirmDelivery}
                        onDownloadDeliveryNote={getDeliveryNote}
                        onCreateRma={handleCreateRma}
                        onOpenRma={setSelectedRma}
                        onBookSteadfast={handleBookSteadfast}
                        onSyncSteadfast={handleSyncSteadfast}
                        onApproveDelivery={handleApproveDelivery}
                        onDisputeDelivery={handleDisputeDelivery}
                    />
                ) : activeTab === 'overview' ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <MetricCard title="Ready To Pack" value={formatNumber(summary.openPicks)} caption="Picking work still active on the floor" icon="assignment" tone="amber" onClick={() => setActiveTab('picking')} />
                            <MetricCard title="Ready For Courier" value={formatNumber(summary.awaitingCourier)} caption="Packed orders waiting for booking, reference, or pickup" icon="inventory_2" tone="amber" onClick={() => activateShipmentQueue('READY_TO_HANDOFF')} />
                            <MetricCard title="In Transit" value={formatNumber(summary.inTransitShipments)} caption="Carrier-owned movement between pickup and final-mile" icon="local_shipping" tone="blue" onClick={() => activateShipmentQueue('IN_TRANSIT')} />
                            <MetricCard title="Needs Action" value={formatNumber(summary.dispatchExceptions)} caption="Only shipments with review or delivery exceptions" icon="error" tone="rose" onClick={() => activateShipmentQueue('NEEDS_ACTION')} />
                            <MetricCard title="Returns" value={formatNumber(summary.openRmas)} caption="Customer returns still moving through authorization" icon="assignment_return" tone="violet" onClick={() => setActiveTab('returns')} />
                        </div>

                        <Card padding="none" className="overflow-hidden" title="Operator Queue Board" subtitle="The first shipments teams should touch next, grouped by fulfillment queue rather than raw status codes.">
                            <DataTable
                                loading={loading}
                                emptyMessage="No active fulfillment queue items right now."
                                onRowClick={(row) => openShipmentDetail(row.shipment, row.queueKey)}
                                columns={[
                                    { key: 'queueLabel', header: 'Queue', render: (value, row) => <Badge variant={getShipmentQueueVariant(row.queueKey)}>{value}</Badge> },
                                    { key: 'shipmentNumber', header: 'Shipment' },
                                    { key: 'soNumber', header: 'Sales Order' },
                                    { key: 'courier', header: 'Courier' },
                                    { key: 'reviewStatus', header: 'Review', render: (value) => value && value !== 'NOT_REQUIRED' ? <Badge variant={getDeliveryReviewVariant(value)}>{value}</Badge> : 'Clear' },
                                    { key: 'lastSignal', header: 'Last Signal' },
                                    { key: 'nextAction', header: 'Next Action' },
                                ]}
                                data={queueBoardRows}
                            />
                        </Card>
                    </>
                ) : null}

                {/* ═══════════ PICKING TAB ═══════════ */}
                {!detailShipmentId && activeTab === 'picking' && (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input placeholder="Search picking number, warehouse, or assignee" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[280px]" />
                            <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="All warehouses" className="min-w-[200px]" />
                            <Select value={filters.pickingStatus} onChange={(event) => setFilters((current) => ({ ...current, pickingStatus: event.target.value }))} options={PICKING_STATUS_OPTIONS} placeholder="All statuses" className="min-w-[180px]" />
                        </div>
                        <Card padding="none" className="overflow-hidden" title="Picking Register" subtitle="Wave and single-order picks currently active in the warehouse">
                            <DataTable
                                loading={loading}
                                emptyMessage="No picking lists found."
                                onRowClick={handleOpenPicking}
                                columns={[
                                    { key: 'pickingNumber', header: 'Picking List' },
                                    { key: 'type', header: 'Type' },
                                    { key: 'warehouseName', header: 'Warehouse' },
                                    { key: 'assignedToName', header: 'Assigned To', render: (value) => value || 'Unassigned' },
                                    { key: 'status', header: 'Status', render: (value) => <Badge variant={getPickingStatusVariant(value)}>{value}</Badge> },
                                    { key: 'createdAt', header: 'Created', render: (value) => formatDateTime(value) },
                                ]}
                                data={filteredPickingLists}
                            />
                        </Card>
                    </>
                )}

                {/* ═══════════ SHIPMENTS TAB ═══════════ */}
                {!detailShipmentId && activeTab === 'shipments' && (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input placeholder="Search shipment, SO, tracking, or courier ref" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[300px]" />
                            <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="All warehouses" className="min-w-[200px]" />
                            <Select value={filters.shipmentStatus} onChange={(event) => setFilters((current) => ({ ...current, shipmentStatus: event.target.value }))} options={SHIPMENT_STATUS_OPTIONS} placeholder="All statuses" className="min-w-[180px]" />
                            <Select value={filters.courierStatus} onChange={(event) => setFilters((current) => ({ ...current, courierStatus: event.target.value }))} options={COURIER_STATUS_OPTIONS} placeholder="All courier stages" className="min-w-[190px]" />
                            <Select value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))} options={providerOptions} placeholder="All providers" className="min-w-[180px]" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard title="Ready For Courier" value={formatNumber(shipmentQueueSummary.readyToHandoffCount)} caption="Waiting on booking, reference, or pickup confirmation" icon="inventory_2" tone="amber" onClick={() => activateShipmentQueue('READY_TO_HANDOFF')} />
                            <MetricCard title="In Transit" value={formatNumber(shipmentQueueSummary.inTransitCount)} caption="Courier-owned movement and final-mile progress" icon="local_shipping" tone="blue" onClick={() => activateShipmentQueue('IN_TRANSIT')} />
                            <MetricCard title="Needs Action" value={formatNumber(shipmentQueueSummary.needsActionCount)} caption="Human exceptions only, including delivery review" icon="error" tone="rose" onClick={() => activateShipmentQueue('NEEDS_ACTION')} />
                            <MetricCard title="Delivered" value={formatNumber(summary.deliveredShipments)} caption="Completed shipments already closed or awaiting audit" icon="task_alt" tone="emerald" onClick={() => activateShipmentQueue('ALL')} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                            {SHIPMENT_QUEUE_CONFIG.map((queue) => (
                                <button
                                    key={queue.key}
                                    type="button"
                                        onClick={() => activateShipmentQueue(queue.key)}
                                    className={`rounded-2xl border p-4 text-left transition-all ${activeShipmentQueue === queue.key ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="material-symbols-outlined text-[22px] text-slate-500 dark:text-slate-300">{queue.icon}</span>
                                        <Badge variant={getShipmentQueueVariant(queue.key)}>{formatNumber(filteredShipmentQueues[queue.key].length)}</Badge>
                                    </div>
                                    <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">{queue.label}</div>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{queue.caption}</p>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => activateShipmentQueue('ALL')}
                                className={`rounded-2xl border p-4 text-left transition-all ${activeShipmentQueue === 'ALL' ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="material-symbols-outlined text-[22px] text-slate-500 dark:text-slate-300">view_list</span>
                                    <Badge variant="default">{formatNumber(filteredShipments.length)}</Badge>
                                </div>
                                <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">All shipments</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fallback register for manual search, audit, and ad-hoc status review.</p>
                            </button>
                        </div>

                        <Card
                            padding="none"
                            className="overflow-hidden"
                            title={activeShipmentQueue === 'ALL' ? 'Shipment Register' : `${activeQueueMeta?.label || 'Shipment'} Queue`}
                            subtitle={activeShipmentQueue === 'ALL' ? 'All dispatch records for manual lookup and correction.' : activeQueueMeta?.caption}
                        >
                            <DataTable
                                loading={loading}
                                emptyMessage={activeShipmentQueue === 'ALL' ? 'No shipments found.' : 'No shipments in this queue for the current filters.'}
                                onRowClick={(shipment) => openShipmentDetail(shipment, activeShipmentQueue)}
                                columns={[
                                    { key: 'shipmentNumber', header: 'Shipment' },
                                    { key: 'soNumber', header: 'Sales Order' },
                                    { key: 'courierProvider', header: 'Courier', render: (value, row) => value || row.carrier || 'Pending' },
                                    { key: 'courierDispatchStatus', header: 'Courier Stage', render: (value) => <Badge variant={getCourierDispatchVariant(value)}>{value || 'UNASSIGNED'}</Badge> },
                                    { key: 'deliveryReviewStatus', header: 'Review', render: (value) => value && value !== 'NOT_REQUIRED' ? <Badge variant={getDeliveryReviewVariant(value)}>{value}</Badge> : 'Clear' },
                                    { key: 'courierReference', header: 'Courier Ref', render: (value) => value || '-' },
                                    { key: 'lastCourierEvent', header: 'Last Signal', render: (value) => value || '-' },
                                    { key: 'status', header: 'Status', render: (value) => <Badge variant={getShipmentStatusVariant(value)}>{value}</Badge> },
                                    { key: 'cashOnDeliveryAmount', header: 'COD', render: (value) => formatCurrency(value, 'BDT') },
                                    { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
                                    { key: 'nextStep', header: 'Next Action', render: (_value, row) => describeShipmentNextStep(row) },
                                ]}
                                data={activeQueueShipments}
                            />
                        </Card>
                    </>
                )}

                {/* ═══════════ EXCEPTIONS TAB ═══════════ */}
                {!detailShipmentId && activeTab === 'exceptions' && (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input placeholder="Search exceptions by shipment, SO, courier ref, or event" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[320px]" />
                            <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="All warehouses" className="min-w-[200px]" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard title="Needs Action" value={formatNumber(summary.dispatchExceptions)} caption="Shipments currently escalated for operator review" icon="error" tone="rose" />
                            <MetricCard title="Review Pending" value={formatNumber(shipmentQueueSummary.deliveryReviewPendingCount)} caption="Courier delivery recorded but still awaiting internal review" icon="fact_check" tone="amber" />
                            <MetricCard title="Disputed" value={formatNumber(shipmentQueueSummary.deliveryReviewDisputedCount)} caption="Delivered outcomes currently under active dispute" icon="gavel" tone="rose" />
                            <MetricCard title="Open RMAs" value={formatNumber(summary.openRmas)} caption="Customer returns in progress" icon="assignment_return" tone="violet" />
                        </div>

                        <Card
                            padding="none"
                            className="overflow-hidden"
                            title="Needs Action Queue"
                            subtitle="Only shipments that need human intervention. Delivery review stays internal here unless the outcome is disputed."
                        >
                            <DataTable
                                loading={loading}
                                emptyMessage="No active shipment exceptions."
                                onRowClick={(shipment) => openShipmentDetail(shipment, 'NEEDS_ACTION')}
                                columns={[
                                    { key: 'shipmentNumber', header: 'Shipment' },
                                    { key: 'soNumber', header: 'Sales Order' },
                                    { key: 'courierProvider', header: 'Courier', render: (value, row) => value || row.carrier || 'Missing' },
                                    { key: 'courierDispatchStatus', header: 'Stage', render: (value) => <Badge variant={getCourierDispatchVariant(value)}>{value || 'UNASSIGNED'}</Badge> },
                                    { key: 'deliveryReviewStatus', header: 'Review', render: (value) => value && value !== 'NOT_REQUIRED' ? <Badge variant={getDeliveryReviewVariant(value)}>{value}</Badge> : 'Clear' },
                                    { key: 'courierReference', header: 'Courier Ref', render: (value) => value || '-' },
                                    { key: 'lastCourierEvent', header: 'Last Event', render: (value) => value || 'No event log' },
                                    { key: 'nextStep', header: 'Next Action', render: (_value, row) => describeShipmentNextStep(row) },
                                    { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
                                ]}
                                data={exceptionShipments}
                            />
                        </Card>
                    </>
                )}

                {/* ═══════════ RETURNS TAB ═══════════ */}
                {!detailShipmentId && activeTab === 'returns' && (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input placeholder="Search RMA, SO, or shipment number" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[300px]" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <MetricCard title="Open RMAs" value={formatNumber(summary.openRmas)} caption="Returns still in authorization flow" icon="assignment_return" tone="violet" />
                            <MetricCard title="Total Returns" value={formatNumber(rmas.length)} caption="All-time return authorizations" icon="receipt_long" tone="slate" />
                            <MetricCard title="Delivered Shipments" value={formatNumber(summary.deliveredShipments)} caption="Successfully completed deliveries" icon="task_alt" tone="emerald" />
                        </div>

                        <Card padding="none" className="overflow-hidden" title="Returns Register" subtitle="Customer return authorizations and exception handling workflow">
                            <DataTable
                                loading={loading}
                                emptyMessage="No RMAs found."
                                onRowClick={setSelectedRma}
                                columns={[
                                    { key: 'rmaNumber', header: 'RMA' },
                                    { key: 'soNumber', header: 'Sales Order' },
                                    { key: 'shipmentNumber', header: 'Shipment', render: (value) => value || '-' },
                                    { key: 'status', header: 'Status', render: (value) => <Badge variant={getRmaStatusVariant(value)}>{value}</Badge> },
                                    { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
                                ]}
                                data={filteredRmas}
                            />
                        </Card>
                    </>
                )}
            </div>

            <PickingListFormModal isOpen={showPickingForm} onClose={() => setShowPickingForm(false)} salesOrders={eligibleForPicking} users={users} formData={pickingForm} setFormData={setPickingForm} onSubmit={handleCreatePickingList} loading={working} />
            <ShipmentFormModal isOpen={showShipmentForm} onClose={() => setShowShipmentForm(false)} salesOrders={eligibleForShipment} formData={shipmentForm} setFormData={setShipmentForm} onSubmit={handleCreateShipment} loading={working} />

            <PickingListDetailModal pickingList={selectedPicking} isOpen={Boolean(selectedPicking)} onClose={() => setSelectedPicking(null)} users={users} onAssign={handleAssignPicker} onUpdateTask={handleUpdateTask} onComplete={handleCompletePickingList} onDownloadPackingList={getPackingList} loading={working} />
            <RmaDetailModal rma={selectedRma} isOpen={Boolean(selectedRma)} onClose={() => setSelectedRma(null)} onTransition={handleUpdateRmaStatus} loading={working} />
        </div>
    );
};

export default Fulfillment;

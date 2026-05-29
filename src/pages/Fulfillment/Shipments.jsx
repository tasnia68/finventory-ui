import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getSalesOrders } from '../../services/salesOrderService';
import {
    getShipmentQueueSummary,
    getShipments,
    getShipmentsByQueue,
    refreshSteadfastQueue,
} from '../../services/shipmentService';
import { getWarehouses } from '../../services/warehouseService';
import {
    formatCurrency,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getDeliveryReviewVariant,
    getShipmentStatusVariant,
    toList,
} from '../Sales/utils';
import {
    COURIER_STATUS_OPTIONS,
    SHIPMENT_QUEUE_CONFIG,
    SHIPMENT_STATUS_OPTIONS,
    createEmptyShipmentQueues,
    describeShipmentNextStep,
    getShipmentQueueVariant,
    showAlertHelper,
} from './constants';
import ShipmentForm from './ShipmentForm';

const Shipments = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const queueFromUrl = searchParams.get('queue');
    const [activeShipmentQueue, setActiveShipmentQueue] = useState(() => {
        if (queueFromUrl === 'READY_TO_HANDOFF' || queueFromUrl === 'IN_TRANSIT' || queueFromUrl === 'ALL') {
            return queueFromUrl;
        }
        return 'READY_TO_HANDOFF';
    });

    const [shipments, setShipments] = useState([]);
    const [shipmentQueues, setShipmentQueues] = useState(createEmptyShipmentQueues());
    const [shipmentQueueSummary, setShipmentQueueSummary] = useState({
        readyToHandoffCount: 0,
        inTransitCount: 0,
        needsActionCount: 0,
        deliveryReviewPendingCount: 0,
        deliveryReviewDisputedCount: 0,
    });
    const [warehouses, setWarehouses] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [filters, setFilters] = useState({ query: '', warehouseId: '', shipmentStatus: '', courierStatus: '', provider: '' });
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showShipmentForm, setShowShipmentForm] = useState(false);

    const showAlert = showAlertHelper(setAlert);

    useEffect(() => {
        if (queueFromUrl && (queueFromUrl === 'READY_TO_HANDOFF' || queueFromUrl === 'IN_TRANSIT' || queueFromUrl === 'ALL')) {
            setActiveShipmentQueue(queueFromUrl);
        }
    }, [queueFromUrl]);

    const loadPage = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getSalesOrders({ page: 0, size: 100 }),
            getShipments({ page: 0, size: 100 }),
            getShipmentQueueSummary(),
            getShipmentsByQueue('READY_TO_HANDOFF', { page: 0, size: 50 }),
            getShipmentsByQueue('IN_TRANSIT', { page: 0, size: 50 }),
            getShipmentsByQueue('NEEDS_ACTION', { page: 0, size: 50 }),
        ]);
        const [warehouseResult, salesOrderResult, shipmentResult, queueSummaryResult, readyToHandoffResult, inTransitResult, needsActionResult] = results;

        if (warehouseResult.status === 'fulfilled') {
            setWarehouses(Array.isArray(warehouseResult.value) ? warehouseResult.value : []);
        }
        if (salesOrderResult.status === 'fulfilled') {
            setSalesOrders(toList(salesOrderResult.value));
        }
        if (shipmentResult.status === 'fulfilled') {
            setShipments(toList(shipmentResult.value));
        }
        if (queueSummaryResult.status === 'fulfilled') {
            setShipmentQueueSummary(queueSummaryResult.value || {});
        }
        setShipmentQueues({
            READY_TO_HANDOFF: readyToHandoffResult.status === 'fulfilled' ? toList(readyToHandoffResult.value) : [],
            IN_TRANSIT: inTransitResult.status === 'fulfilled' ? toList(inTransitResult.value) : [],
            NEEDS_ACTION: needsActionResult.status === 'fulfilled' ? toList(needsActionResult.value) : [],
        });

        const failedMessages = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
            .filter(Boolean);
        if (failedMessages.length > 0) {
            showAlert('error', failedMessages[0] || 'Failed to load shipments workspace');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPage();
    }, []);

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

    const filteredShipments = useMemo(() => filterShipmentCollection(shipments), [shipments, filters]);
    const filteredShipmentQueues = useMemo(() => ({
        READY_TO_HANDOFF: filterShipmentCollection(shipmentQueues.READY_TO_HANDOFF),
        IN_TRANSIT: filterShipmentCollection(shipmentQueues.IN_TRANSIT),
        NEEDS_ACTION: filterShipmentCollection(shipmentQueues.NEEDS_ACTION),
    }), [shipmentQueues, filters]);

    const summary = useMemo(() => ({
        deliveredShipments: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
    }), [shipments]);

    const providerOptions = useMemo(
        () => [...new Set(shipments.map((shipment) => shipment.courierProvider).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right))
            .map((value) => ({ value, label: value })),
        [shipments],
    );

    const activateShipmentQueue = (queueKey) => {
        if (queueKey === 'NEEDS_ACTION') {
            navigate('/fulfillment/exceptions');
            return;
        }
        setActiveShipmentQueue(queueKey);
        const next = new URLSearchParams(searchParams);
        next.set('queue', queueKey);
        setSearchParams(next);
    };

    const activeQueueMeta = SHIPMENT_QUEUE_CONFIG.find((queue) => queue.key === activeShipmentQueue);
    const activeQueueShipments = activeShipmentQueue === 'ALL' ? filteredShipments : (filteredShipmentQueues[activeShipmentQueue] || []);

    const eligibleForShipment = useMemo(
        () => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED', 'PARTIALLY_SHIPPED'].includes(order.status)),
        [salesOrders],
    );

    const openShipmentDetail = (shipment) => {
        navigate(`/fulfillment/shipments/${shipment.id}?queue=${activeShipmentQueue}`);
    };

    const handleRefreshActiveQueue = async () => {
        if (activeShipmentQueue === 'ALL') {
            await loadPage();
            showAlert('success', 'Shipment register refreshed');
            return;
        }
        try {
            setWorking(true);
            const result = await refreshSteadfastQueue(activeShipmentQueue);
            showAlert('success', `${activeShipmentQueue.replaceAll('_', ' ')} queue refreshed: ${result.attemptedCount} attempted, ${result.failedCount} failed`);
            await loadPage();
        } catch (error) {
            showAlert('error', error.message || 'Failed to refresh queue');
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Fulfillment Control"
                    title="Dispatch & shipments"
                    description="Release packed orders to courier, monitor in-transit shipments, and audit completed dispatches."
                    actions={(
                        <>
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            <Button variant="secondary" icon="sync" onClick={handleRefreshActiveQueue} loading={working}>Refresh Active Queue</Button>
                            <Button icon="local_shipping" onClick={() => setShowShipmentForm(true)}>Create Shipment</Button>
                        </>
                    )}
                    accent="from-orange-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

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
                    <MetricCard title="Needs Action" value={formatNumber(shipmentQueueSummary.needsActionCount)} caption="Human exceptions only, including delivery review" icon="error" tone="rose" onClick={() => navigate('/fulfillment/exceptions')} />
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
                        onRowClick={(shipment) => openShipmentDetail(shipment)}
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
            </div>

            <ShipmentForm
                isOpen={showShipmentForm}
                onClose={() => setShowShipmentForm(false)}
                salesOrders={eligibleForShipment}
                onCreated={async (created) => {
                    setShowShipmentForm(false);
                    showAlert('success', 'Shipment created successfully');
                    await loadPage();
                    if (created?.id) {
                        navigate(`/fulfillment/shipments/${created.id}`);
                    }
                }}
                onError={(message) => showAlert('error', message)}
            />
        </div>
    );
};

export default Shipments;

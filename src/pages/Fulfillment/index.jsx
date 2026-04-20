import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getPickingList, getPickingLists, createPickingList, assignPicker, updatePickingTask, completePickingList, getPackingList } from '../../services/pickingService';
import { getSalesOrders } from '../../services/salesOrderService';
import { confirmDelivery, createRma, createShipment, generateShippingLabel, getDeliveryNote, getRmas, getShipments, updateRmaStatus, updateShipmentTracking } from '../../services/shipmentService';
import { getUsers } from '../../services/userService';
import { getWarehouses } from '../../services/warehouseService';
import PickingListDetailModal from './PickingListDetailModal';
import PickingListFormModal from './PickingListFormModal';
import RmaDetailModal from './RmaDetailModal';
import ShipmentDetailModal from './ShipmentDetailModal';
import ShipmentFormModal from './ShipmentFormModal';
import {
    formatCurrency,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
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

const Fulfillment = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [users, setUsers] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [pickingLists, setPickingLists] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ query: '', warehouseId: '', pickingStatus: '', shipmentStatus: '', courierStatus: '', provider: '' });
    const [showPickingForm, setShowPickingForm] = useState(false);
    const [showShipmentForm, setShowShipmentForm] = useState(false);
    const [pickingForm, setPickingForm] = useState(createEmptyPickingForm());
    const [shipmentForm, setShipmentForm] = useState(createEmptyShipmentForm());
    const [selectedPicking, setSelectedPicking] = useState(null);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [selectedRma, setSelectedRma] = useState(null);
    const [pickingApiUnavailable, setPickingApiUnavailable] = useState(false);

    useEffect(() => {
        loadPage();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadPage = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getUsers(),
            getSalesOrders({ page: 0, size: 100 }),
            getPickingLists({ page: 0, size: 100 }),
            getShipments({ page: 0, size: 100 }),
            getRmas({ page: 0, size: 100 }),
        ]);

        const [warehouseResult, userResult, salesOrderResult, pickingResult, shipmentResult, rmaResult] = results;

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

    const filteredShipments = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return shipments.filter((shipment) => {
            if (filters.warehouseId && shipment.warehouseId !== filters.warehouseId) return false;
            if (filters.shipmentStatus && shipment.status !== filters.shipmentStatus) return false;
            if (filters.courierStatus && shipment.courierDispatchStatus !== filters.courierStatus) return false;
            if (filters.provider && (shipment.courierProvider || '') !== filters.provider) return false;
            if (!normalizedQuery) return true;
            return [shipment.shipmentNumber, shipment.soNumber, shipment.trackingNumber, shipment.carrier, shipment.courierProvider, shipment.courierReference]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [shipments, filters]);

    const filteredRmas = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return rmas.filter((rma) => {
            if (!normalizedQuery) return true;
            return [rma.rmaNumber, rma.soNumber, rma.shipmentNumber]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [rmas, filters.query]);

    const summary = useMemo(() => ({
        openPicks: pickingLists.filter((list) => !['COMPLETED', 'CANCELLED'].includes(list.status)).length,
        awaitingCourier: shipments.filter((shipment) => ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING'].includes(shipment.courierDispatchStatus || 'UNASSIGNED')).length,
        inTransitShipments: shipments.filter((shipment) => ['PICKED_UP', 'IN_TRANSIT'].includes(shipment.courierDispatchStatus)).length,
        outForDelivery: shipments.filter((shipment) => shipment.courierDispatchStatus === 'OUT_FOR_DELIVERY').length,
        deliveredShipments: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
        dispatchExceptions: shipments.filter((shipment) => ['DELIVERY_FAILED', 'RETURNED', 'CANCELLED'].includes(shipment.courierDispatchStatus)).length,
        openRmas: rmas.filter((rma) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rma.status)).length,
    }), [pickingLists, shipments, rmas]);

    const providerOptions = useMemo(
        () => [...new Set(shipments.map((shipment) => shipment.courierProvider).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right))
            .map((value) => ({ value, label: value })),
        [shipments]
    );

    const shipmentPipelineRows = useMemo(() => {
        const bucketConfig = [
            { key: 'UNASSIGNED', label: 'Awaiting Provider' },
            { key: 'BOOKED', label: 'Booked' },
            { key: 'PICKUP_PENDING', label: 'Pickup Pending' },
            { key: 'PICKED_UP', label: 'Picked Up' },
            { key: 'IN_TRANSIT', label: 'In Transit' },
            { key: 'OUT_FOR_DELIVERY', label: 'Out For Delivery' },
            { key: 'DELIVERED', label: 'Delivered' },
            { key: 'DELIVERY_FAILED', label: 'Delivery Failed' },
        ];

        return bucketConfig.map((bucket) => {
            const matching = shipments.filter((shipment) => (shipment.courierDispatchStatus || 'UNASSIGNED') === bucket.key);
            return {
                ...bucket,
                shipments: matching.length,
                units: matching.reduce((sum, shipment) => sum + (shipment.items || []).reduce((lineSum, item) => lineSum + Number(item.quantity || 0), 0), 0),
                codValue: matching.reduce((sum, shipment) => sum + Number(shipment.cashOnDeliveryAmount || 0), 0),
            };
        });
    }, [shipments]);

    const eligibleForPicking = useMemo(() => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED'].includes(order.status)), [salesOrders]);
    const eligibleForShipment = useMemo(() => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED', 'PARTIALLY_SHIPPED'].includes(order.status)), [salesOrders]);

    const runAction = async (action, successMessage) => {
        try {
            setWorking(true);
            const result = await action();
            showAlert('success', successMessage);
            await loadPage();
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
                    description="Warehouse and customer-service teams can see outbound execution in one place, from pick generation through carrier handoff and customer return resolution."
                    actions={(
                        <>
                            <Input placeholder="Search pick, shipment, tracking, or RMA" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[280px]" />
                            <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="Warehouse" className="min-w-[200px]" />
                            <Select value={filters.pickingStatus} onChange={(event) => setFilters((current) => ({ ...current, pickingStatus: event.target.value }))} options={PICKING_STATUS_OPTIONS} placeholder="Pick status" className="min-w-[180px]" />
                            <Select value={filters.shipmentStatus} onChange={(event) => setFilters((current) => ({ ...current, shipmentStatus: event.target.value }))} options={SHIPMENT_STATUS_OPTIONS} placeholder="Shipment status" className="min-w-[190px]" />
                            <Select value={filters.courierStatus} onChange={(event) => setFilters((current) => ({ ...current, courierStatus: event.target.value }))} options={COURIER_STATUS_OPTIONS} placeholder="Courier stage" className="min-w-[190px]" />
                            <Select value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))} options={providerOptions} placeholder="Courier provider" className="min-w-[190px]" />
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            <Button variant="secondary" icon="playlist_add" onClick={() => setShowPickingForm(true)} disabled={pickingApiUnavailable}>Generate Pick</Button>
                            <Button icon="local_shipping" onClick={() => setShowShipmentForm(true)}>Create Shipment</Button>
                        </>
                    )}
                    accent="from-orange-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <MetricCard title="Open Picks" value={formatNumber(summary.openPicks)} caption="Picking work not yet closed on the floor" icon="assignment" tone="amber" />
                    <MetricCard title="Awaiting Courier" value={formatNumber(summary.awaitingCourier)} caption="Packed shipments still waiting on booking or pickup handoff" icon="inventory_2" tone="amber" />
                    <MetricCard title="In Transit" value={formatNumber(summary.inTransitShipments)} caption="Shipments currently moving between warehouse and final-mile route" icon="local_shipping" tone="blue" />
                    <MetricCard title="Out For Delivery" value={formatNumber(summary.outForDelivery)} caption="Final-mile drop attempts active today or in the latest sync cycle" icon="route" tone="blue" />
                    <MetricCard title="Delivered" value={formatNumber(summary.deliveredShipments)} caption="Shipments fully confirmed at customer handoff" icon="task_alt" tone="emerald" />
                    <MetricCard title="Dispatch Issues" value={formatNumber(summary.dispatchExceptions)} caption="Failed attempts, returns, or cancelled courier movements" icon="warning" tone="rose" />
                    <MetricCard title="Open RMAs" value={formatNumber(summary.openRmas)} caption="Returns still moving through authorization and receipt" icon="assignment_return" tone="violet" />
                </div>

                <Card padding="none" className="overflow-hidden" title="Courier Pipeline" subtitle="Status-wise shipment, unit, and COD exposure across the dispatch board">
                    <DataTable
                        loading={loading}
                        emptyMessage="No courier-stage activity yet."
                        columns={[
                            { key: 'label', header: 'Courier Stage', render: (value, row) => <Badge variant={getCourierDispatchVariant(row.key)}>{value}</Badge> },
                            { key: 'shipments', header: 'Shipments', render: (value) => formatNumber(value) },
                            { key: 'units', header: 'Units', render: (value) => formatNumber(value) },
                            { key: 'codValue', header: 'COD Exposure', render: (value) => formatCurrency(value, 'BDT') },
                        ]}
                        data={shipmentPipelineRows}
                    />
                </Card>

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

                <Card padding="none" className="overflow-hidden" title="Shipment Register" subtitle="Carrier handoff records and delivery execution">
                    <DataTable
                        loading={loading}
                        emptyMessage="No shipments found."
                        onRowClick={setSelectedShipment}
                        columns={[
                            { key: 'shipmentNumber', header: 'Shipment' },
                            { key: 'soNumber', header: 'Sales Order' },
                            { key: 'courierProvider', header: 'Courier', render: (value, row) => value || row.carrier || 'Pending' },
                            { key: 'courierDispatchStatus', header: 'Courier Stage', render: (value) => <Badge variant={getCourierDispatchVariant(value)}>{value || 'UNASSIGNED'}</Badge> },
                            { key: 'carrier', header: 'Carrier Label', render: (value) => value || '-' },
                            { key: 'courierReference', header: 'Courier Ref', render: (value) => value || '-' },
                            { key: 'trackingNumber', header: 'Tracking', render: (value) => value || '-' },
                            { key: 'status', header: 'Status', render: (value) => <Badge variant={getShipmentStatusVariant(value)}>{value}</Badge> },
                            { key: 'cashOnDeliveryAmount', header: 'COD', render: (value) => formatCurrency(value, 'BDT') },
                            { key: 'shippedDate', header: 'Shipped', render: (value) => formatDateTime(value) },
                        ]}
                        data={filteredShipments}
                    />
                </Card>

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
            </div>

            <PickingListFormModal isOpen={showPickingForm} onClose={() => setShowPickingForm(false)} salesOrders={eligibleForPicking} users={users} formData={pickingForm} setFormData={setPickingForm} onSubmit={handleCreatePickingList} loading={working} />
            <ShipmentFormModal isOpen={showShipmentForm} onClose={() => setShowShipmentForm(false)} salesOrders={eligibleForShipment} formData={shipmentForm} setFormData={setShipmentForm} onSubmit={handleCreateShipment} loading={working} />

            <PickingListDetailModal pickingList={selectedPicking} isOpen={Boolean(selectedPicking)} onClose={() => setSelectedPicking(null)} users={users} onAssign={handleAssignPicker} onUpdateTask={handleUpdateTask} onComplete={handleCompletePickingList} onDownloadPackingList={getPackingList} loading={working} />
            <ShipmentDetailModal shipment={selectedShipment} relatedRmas={rmas.filter((rma) => rma.shipmentId === selectedShipment?.id)} isOpen={Boolean(selectedShipment)} onClose={() => setSelectedShipment(null)} onUpdateTracking={handleUpdateTracking} onGenerateLabel={handleGenerateLabel} onConfirmDelivery={handleConfirmDelivery} onDownloadDeliveryNote={getDeliveryNote} onCreateRma={handleCreateRma} loading={working} onOpenRma={setSelectedRma} />
            <RmaDetailModal rma={selectedRma} isOpen={Boolean(selectedRma)} onClose={() => setSelectedRma(null)} onTransition={handleUpdateRmaStatus} loading={working} />
        </div>
    );
};

export default Fulfillment;

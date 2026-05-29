import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getSalesOrders } from '../../services/salesOrderService';
import {
    getRmas,
    getShipmentQueueSummary,
    getShipmentsByQueue,
    refreshSteadfastQueue,
} from '../../services/shipmentService';
import { getWarehouses } from '../../services/warehouseService';
import {
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getDeliveryReviewVariant,
    toList,
} from '../Sales/utils';
import {
    describeShipmentNextStep,
    showAlertHelper,
} from './constants';
import ShipmentForm from './ShipmentForm';

const Exceptions = () => {
    const navigate = useNavigate();

    const [exceptionShipments, setExceptionShipments] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [shipmentQueueSummary, setShipmentQueueSummary] = useState({
        readyToHandoffCount: 0,
        inTransitCount: 0,
        needsActionCount: 0,
        deliveryReviewPendingCount: 0,
        deliveryReviewDisputedCount: 0,
    });
    const [filters, setFilters] = useState({ query: '', warehouseId: '' });
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showShipmentForm, setShowShipmentForm] = useState(false);

    const showAlert = showAlertHelper(setAlert);

    const loadPage = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getSalesOrders({ page: 0, size: 100 }),
            getShipmentQueueSummary(),
            getShipmentsByQueue('NEEDS_ACTION', { page: 0, size: 50 }),
            getRmas({ page: 0, size: 100 }),
        ]);
        const [warehouseResult, salesOrderResult, queueSummaryResult, needsActionResult, rmaResult] = results;

        if (warehouseResult.status === 'fulfilled') {
            setWarehouses(Array.isArray(warehouseResult.value) ? warehouseResult.value : []);
        }
        if (salesOrderResult.status === 'fulfilled') {
            setSalesOrders(toList(salesOrderResult.value));
        }
        if (queueSummaryResult.status === 'fulfilled') {
            setShipmentQueueSummary(queueSummaryResult.value || {});
        }
        setExceptionShipments(needsActionResult.status === 'fulfilled' ? toList(needsActionResult.value) : []);
        setRmas(rmaResult.status === 'fulfilled' ? toList(rmaResult.value) : []);

        const failedMessages = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
            .filter(Boolean);
        if (failedMessages.length > 0) {
            showAlert('error', failedMessages[0] || 'Failed to load exceptions workspace');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPage();
    }, []);

    const filteredExceptions = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return exceptionShipments.filter((shipment) => {
            if (filters.warehouseId && shipment.warehouseId !== filters.warehouseId) return false;
            if (!normalizedQuery) return true;
            return [shipment.shipmentNumber, shipment.soNumber, shipment.trackingNumber, shipment.carrier, shipment.courierProvider, shipment.courierReference, shipment.lastCourierEvent]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [exceptionShipments, filters]);

    const summary = useMemo(() => ({
        dispatchExceptions: shipmentQueueSummary.needsActionCount ?? 0,
        openRmas: rmas.filter((rma) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rma.status)).length,
    }), [shipmentQueueSummary, rmas]);

    const eligibleForShipment = useMemo(
        () => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED', 'PARTIALLY_SHIPPED'].includes(order.status)),
        [salesOrders],
    );

    const handleRefreshActiveQueue = async () => {
        try {
            setWorking(true);
            const result = await refreshSteadfastQueue('NEEDS_ACTION');
            showAlert('success', `NEEDS ACTION queue refreshed: ${result.attemptedCount} attempted, ${result.failedCount} failed`);
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
                    title="Needs action queue"
                    description="Only shipments that need human intervention. Delivery review stays internal here unless the outcome is disputed."
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
                    <Input placeholder="Search exceptions by shipment, SO, courier ref, or event" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[320px]" />
                    <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="All warehouses" className="min-w-[200px]" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Needs Action" value={formatNumber(summary.dispatchExceptions)} caption="Shipments currently escalated for operator review" icon="error" tone="rose" />
                    <MetricCard title="Review Pending" value={formatNumber(shipmentQueueSummary.deliveryReviewPendingCount)} caption="Courier delivery recorded but still awaiting internal review" icon="fact_check" tone="amber" />
                    <MetricCard title="Disputed" value={formatNumber(shipmentQueueSummary.deliveryReviewDisputedCount)} caption="Delivered outcomes currently under active dispute" icon="gavel" tone="rose" />
                    <MetricCard title="Open RMAs" value={formatNumber(summary.openRmas)} caption="Customer returns in progress" icon="assignment_return" tone="violet" onClick={() => navigate('/fulfillment/returns')} />
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
                        onRowClick={(shipment) => navigate(`/fulfillment/shipments/${shipment.id}?queue=NEEDS_ACTION`)}
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
                        data={filteredExceptions}
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

export default Exceptions;

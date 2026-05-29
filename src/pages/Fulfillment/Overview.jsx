import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, MetricCard } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getPickingLists } from '../../services/pickingService';
import { getRmas, getShipmentQueueSummary, getShipments, getShipmentsByQueue } from '../../services/shipmentService';
import {
    formatNumber,
    getDeliveryReviewVariant,
    toList,
} from '../Sales/utils';
import {
    SHIPMENT_QUEUE_CONFIG,
    createEmptyShipmentQueues,
    describeShipmentNextStep,
    getShipmentQueueVariant,
    showAlertHelper,
} from './constants';

const Overview = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [pickingLists, setPickingLists] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [shipmentQueues, setShipmentQueues] = useState(createEmptyShipmentQueues());
    const [shipmentQueueSummary, setShipmentQueueSummary] = useState({
        readyToHandoffCount: 0,
        inTransitCount: 0,
        needsActionCount: 0,
        deliveryReviewPendingCount: 0,
        deliveryReviewDisputedCount: 0,
    });

    const showAlert = showAlertHelper(setAlert);

    const loadOverview = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getPickingLists({ page: 0, size: 100 }),
            getShipments({ page: 0, size: 100 }),
            getShipmentQueueSummary(),
            getShipmentsByQueue('READY_TO_HANDOFF', { page: 0, size: 50 }),
            getShipmentsByQueue('IN_TRANSIT', { page: 0, size: 50 }),
            getShipmentsByQueue('NEEDS_ACTION', { page: 0, size: 50 }),
            getRmas({ page: 0, size: 100 }),
        ]);
        const [pickingResult, shipmentResult, queueSummaryResult, readyToHandoffResult, inTransitResult, needsActionResult, rmaResult] = results;

        setPickingLists(pickingResult.status === 'fulfilled' ? toList(pickingResult.value) : []);
        setShipments(shipmentResult.status === 'fulfilled' ? toList(shipmentResult.value) : []);
        if (queueSummaryResult.status === 'fulfilled') {
            setShipmentQueueSummary(queueSummaryResult.value || {});
        }
        setShipmentQueues({
            READY_TO_HANDOFF: readyToHandoffResult.status === 'fulfilled' ? toList(readyToHandoffResult.value) : [],
            IN_TRANSIT: inTransitResult.status === 'fulfilled' ? toList(inTransitResult.value) : [],
            NEEDS_ACTION: needsActionResult.status === 'fulfilled' ? toList(needsActionResult.value) : [],
        });
        setRmas(rmaResult.status === 'fulfilled' ? toList(rmaResult.value) : []);

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

    useEffect(() => {
        loadOverview();
    }, []);

    const summary = useMemo(() => ({
        openPicks: pickingLists.filter((list) => !['COMPLETED', 'CANCELLED'].includes(list.status)).length,
        awaitingCourier: shipmentQueueSummary.readyToHandoffCount ?? 0,
        inTransitShipments: shipmentQueueSummary.inTransitCount ?? 0,
        outForDelivery: shipments.filter((shipment) => shipment.courierDispatchStatus === 'OUT_FOR_DELIVERY').length,
        deliveredShipments: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
        dispatchExceptions: shipmentQueueSummary.needsActionCount ?? 0,
        openRmas: rmas.filter((rma) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rma.status)).length,
    }), [pickingLists, shipmentQueueSummary, shipments, rmas]);

    const queueBoardRows = useMemo(() => SHIPMENT_QUEUE_CONFIG.flatMap((queue) => (
        (shipmentQueues[queue.key] || []).slice(0, 6).map((shipment) => ({
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
    )), [shipmentQueues]);

    const goToShipmentsQueue = (queueKey) => {
        if (queueKey === 'NEEDS_ACTION') {
            navigate('/fulfillment/exceptions');
        } else {
            navigate(`/fulfillment/shipments?queue=${queueKey}`);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Fulfillment Control"
                    title="Coordinate picking, shipping, and returns from one operational console."
                    description="Run queue-first fulfillment from one workspace: release packed orders to courier, monitor in-transit shipments, and clear only the exceptions that need human attention."
                    actions={(
                        <Button variant="secondary" icon="sync" onClick={loadOverview}>Refresh</Button>
                    )}
                    accent="from-orange-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard title="Ready To Pack" value={formatNumber(summary.openPicks)} caption="Picking work still active on the floor" icon="assignment" tone="amber" onClick={() => navigate('/fulfillment/picking')} />
                    <MetricCard title="Ready For Courier" value={formatNumber(summary.awaitingCourier)} caption="Packed orders waiting for booking, reference, or pickup" icon="inventory_2" tone="amber" onClick={() => goToShipmentsQueue('READY_TO_HANDOFF')} />
                    <MetricCard title="In Transit" value={formatNumber(summary.inTransitShipments)} caption="Carrier-owned movement between pickup and final-mile" icon="local_shipping" tone="blue" onClick={() => goToShipmentsQueue('IN_TRANSIT')} />
                    <MetricCard title="Needs Action" value={formatNumber(summary.dispatchExceptions)} caption="Only shipments with review or delivery exceptions" icon="error" tone="rose" onClick={() => navigate('/fulfillment/exceptions')} />
                    <MetricCard title="Returns" value={formatNumber(summary.openRmas)} caption="Customer returns still moving through authorization" icon="assignment_return" tone="violet" onClick={() => navigate('/fulfillment/returns')} />
                </div>

                <Card padding="none" className="overflow-hidden" title="Operator Queue Board" subtitle="The first shipments teams should touch next, grouped by fulfillment queue rather than raw status codes.">
                    <DataTable
                        loading={loading}
                        emptyMessage="No active fulfillment queue items right now."
                        onRowClick={(row) => navigate(`/fulfillment/shipments/${row.shipment.id}?queue=${row.queueKey}`)}
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
            </div>
        </div>
    );
};

export default Overview;

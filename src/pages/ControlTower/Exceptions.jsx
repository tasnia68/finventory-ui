import React, { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Badge, Card, DataTable, MetricCard } from '../../components/common';
import {
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getRmaStatusVariant,
    getSalesOrderStatusVariant,
} from '../Sales/utils';

const Exceptions = () => {
    const {
        loading,
        rmas,
        pickingLists,
        filteredSalesOrders,
        filteredShipments,
        filteredGoodsReceipts,
    } = useOutletContext();

    const exceptionSummary = useMemo(() => ({
        backorders: filteredSalesOrders.filter((order) => order.status === 'BACKORDERED').length,
        deliveryFailures: filteredShipments.filter((shipment) => shipment.courierDispatchStatus === 'DELIVERY_FAILED').length,
        returnsInFlight: rmas.filter((rma) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(rma.status)).length,
        draftReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'DRAFT').length,
        delayedDispatch: filteredShipments.filter((shipment) => ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING'].includes(shipment.courierDispatchStatus || 'UNASSIGNED')).length,
        openPicks: pickingLists.filter((list) => !['COMPLETED', 'CANCELLED'].includes(list.status)).length,
    }), [filteredSalesOrders, filteredShipments, rmas, filteredGoodsReceipts, pickingLists]);

    const exceptionRows = useMemo(() => {
        const rows = [];

        filteredSalesOrders
            .filter((order) => ['PENDING', 'HOLD', 'BACKORDERED'].includes(order.status))
            .forEach((order) => {
                rows.push({
                    kind: order.status === 'BACKORDERED' ? 'Backorder' : 'Approval Queue',
                    reference: order.soNumber,
                    owner: order.customerName,
                    stage: order.status,
                    secondary: order.warehouseName || '-',
                    updatedAt: order.updatedAt || order.orderDate,
                    path: '/sales-orders',
                    tone: getSalesOrderStatusVariant(order.status),
                });
            });

        filteredShipments
            .filter((shipment) => ['DELIVERY_FAILED', 'RETURNED', 'UNASSIGNED', 'PICKUP_PENDING'].includes(shipment.courierDispatchStatus || 'UNASSIGNED'))
            .forEach((shipment) => {
                rows.push({
                    kind: 'Courier Exception',
                    reference: shipment.shipmentNumber,
                    owner: shipment.courierProvider || shipment.carrier || shipment.soNumber,
                    stage: shipment.courierDispatchStatus || 'UNASSIGNED',
                    secondary: shipment.trackingNumber || shipment.courierReference || '-',
                    updatedAt: shipment.updatedAt || shipment.shippedDate,
                    path: '/fulfillment',
                    tone: getCourierDispatchVariant(shipment.courierDispatchStatus || 'UNASSIGNED'),
                });
            });

        rmas
            .filter((rma) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(rma.status))
            .forEach((rma) => {
                rows.push({
                    kind: 'Return In Flight',
                    reference: rma.rmaNumber,
                    owner: rma.soNumber,
                    stage: rma.status,
                    secondary: rma.shipmentNumber || '-',
                    updatedAt: rma.updatedAt || rma.requestedAt,
                    path: '/refunds-exchanges',
                    tone: getRmaStatusVariant(rma.status),
                });
            });

        filteredGoodsReceipts
            .filter((receipt) => ['DRAFT', 'VERIFIED'].includes(receipt.status))
            .forEach((receipt) => {
                rows.push({
                    kind: 'Receiving Queue',
                    reference: receipt.grnNumber,
                    owner: receipt.supplierName,
                    stage: receipt.status,
                    secondary: receipt.purchaseOrderNumber,
                    updatedAt: receipt.updatedAt || receipt.receivedDate,
                    path: '/goods-receipts',
                    tone: receipt.status === 'VERIFIED' ? 'info' : 'warning',
                });
            });

        return rows.sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
    }, [filteredSalesOrders, filteredShipments, rmas, filteredGoodsReceipts]);

    return (
        <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <MetricCard title="Backorders" value={formatNumber(exceptionSummary.backorders)} caption="Sales demand blocked by insufficient available stock or allocation" icon="event_busy" tone="rose" />
                <MetricCard title="Delivery Failures" value={formatNumber(exceptionSummary.deliveryFailures)} caption="Courier attempts that need recovery, retry, or customer contact" icon="warning" tone="rose" />
                <MetricCard title="Returns In Flight" value={formatNumber(exceptionSummary.returnsInFlight)} caption="RMAs still open across approval, receipt, or completion steps" icon="assignment_return" tone="violet" />
                <MetricCard title="Receiving Queue" value={formatNumber(exceptionSummary.draftReceipts)} caption="GRNs needing warehouse balancing or final validation before posting" icon="move_to_inbox" tone="amber" />
                <MetricCard title="Dispatch Delays" value={formatNumber(exceptionSummary.delayedDispatch)} caption="Shipments still not moving with a provider or still waiting pickup" icon="schedule_send" tone="amber" />
                <MetricCard title="Open Picks" value={formatNumber(exceptionSummary.openPicks)} caption="Warehouse picking work not yet completed or cancelled" icon="assignment" tone="blue" />
            </div>

            <Card padding="none" className="overflow-hidden" title="Exception Queue" subtitle="Cross-functional worklist for commercial, warehouse, courier, and returns teams">
                <DataTable
                    loading={loading}
                    emptyMessage="No active exceptions found."
                    columns={[
                        { key: 'kind', header: 'Queue' },
                        { key: 'reference', header: 'Reference', render: (value, row) => <Link to={row.path} className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white">{value}</Link> },
                        { key: 'owner', header: 'Owner / Context' },
                        { key: 'stage', header: 'Stage', render: (value, row) => <Badge variant={row.tone}>{value}</Badge> },
                        { key: 'secondary', header: 'Secondary Ref' },
                        { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
                    ]}
                    data={exceptionRows}
                />
            </Card>
        </>
    );
};

export default Exceptions;

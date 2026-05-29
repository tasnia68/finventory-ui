import React, { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Badge, Card, DataTable, MetricCard } from '../../components/common';
import {
    formatCurrency,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getSalesOrderStatusVariant,
    getShipmentStatusVariant,
} from '../Sales/utils';

const ORDER_STAGE_CONFIG = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'HOLD', label: 'Hold' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PACKAGING', label: 'Packaging' },
    { key: 'BACKORDERED', label: 'Backordered' },
    { key: 'PARTIALLY_SHIPPED', label: 'Partially Shipped' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'DELIVERED', label: 'Delivered' },
];

const COURIER_STAGE_CONFIG = [
    { key: 'UNASSIGNED', label: 'Awaiting Provider' },
    { key: 'BOOKED', label: 'Booked' },
    { key: 'PICKUP_PENDING', label: 'Pickup Pending' },
    { key: 'PICKED_UP', label: 'Picked Up' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out For Delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'DELIVERY_FAILED', label: 'Delivery Failed' },
];

const sumShipmentUnits = (shipment) => (shipment.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const buildStatusRows = (items, config, statusAccessor, valueAccessor) =>
    config.map((stage) => {
        const matching = items.filter((item) => statusAccessor(item) === stage.key);
        return {
            key: stage.key,
            label: stage.label,
            records: matching.length,
            units: matching.reduce((sum, item) => sum + Number(valueAccessor(item).units || 0), 0),
            amount: matching.reduce((sum, item) => sum + Number(valueAccessor(item).amount || 0), 0),
        };
    });

const Outbound = () => {
    const { loading, filteredSalesOrders, filteredShipments } = useOutletContext();

    const outboundSummary = useMemo(() => ({
        approvalQueue: filteredSalesOrders.filter((order) => ['PENDING', 'HOLD', 'APPROVED'].includes(order.status)).length,
        backorders: filteredSalesOrders.filter((order) => order.status === 'BACKORDERED').length,
        awaitingDispatch: filteredShipments.filter((shipment) => ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING'].includes(shipment.courierDispatchStatus || 'UNASSIGNED')).length,
        inTransit: filteredShipments.filter((shipment) => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.courierDispatchStatus)).length,
        delivered: filteredShipments.filter((shipment) => shipment.status === 'DELIVERED').length,
        codExposure: filteredShipments.reduce((sum, shipment) => sum + Number(shipment.cashOnDeliveryAmount || 0), 0),
    }), [filteredSalesOrders, filteredShipments]);

    const orderPipelineRows = useMemo(
        () => buildStatusRows(filteredSalesOrders, ORDER_STAGE_CONFIG, (item) => item.status, (item) => ({ units: item.items?.length || 0, amount: item.totalAmount || 0 })),
        [filteredSalesOrders]
    );

    const dispatchPipelineRows = useMemo(
        () => buildStatusRows(filteredShipments, COURIER_STAGE_CONFIG, (item) => item.courierDispatchStatus || 'UNASSIGNED', (item) => ({ units: sumShipmentUnits(item), amount: item.cashOnDeliveryAmount || 0 })),
        [filteredShipments]
    );

    return (
        <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <MetricCard title="Approval Queue" value={formatNumber(outboundSummary.approvalQueue)} caption="Orders waiting on commercial sign-off before warehouse action" icon="approval_delegation" tone="amber" />
                <MetricCard title="Backorders" value={formatNumber(outboundSummary.backorders)} caption="Demand without full inventory coverage or reservation confidence" icon="event_busy" tone="rose" />
                <MetricCard title="Awaiting Dispatch" value={formatNumber(outboundSummary.awaitingDispatch)} caption="Shipments packed or staged but not yet moving with courier" icon="inventory_2" tone="amber" />
                <MetricCard title="In Transit" value={formatNumber(outboundSummary.inTransit)} caption="Parcels already handed to carrier and moving through network stages" icon="local_shipping" tone="blue" />
                <MetricCard title="Delivered" value={formatNumber(outboundSummary.delivered)} caption="Shipments completed and commercially closed at customer handoff" icon="task_alt" tone="emerald" />
                <MetricCard title="COD Exposure" value={formatCurrency(outboundSummary.codExposure, 'BDT')} caption="Outstanding COD amount across the currently filtered shipment set" icon="payments" tone="violet" />
            </div>

            <Card padding="none" className="overflow-hidden" title="Order Pipeline" subtitle="Commercial status counts across the outbound sales order book">
                <DataTable
                    loading={loading}
                    emptyMessage="No outbound order stages available."
                    columns={[
                        { key: 'label', header: 'Order Stage', render: (value, row) => <Badge variant={getSalesOrderStatusVariant(row.key)}>{value}</Badge> },
                        { key: 'records', header: 'Orders', render: (value) => formatNumber(value) },
                        { key: 'units', header: 'Lines', render: (value) => formatNumber(value) },
                        { key: 'amount', header: 'Order Value', render: (value) => formatCurrency(value) },
                    ]}
                    data={orderPipelineRows}
                />
            </Card>

            <Card padding="none" className="overflow-hidden" title="Dispatch Pipeline" subtitle="Courier-side shipment stages, unit volume, and COD load">
                <DataTable
                    loading={loading}
                    emptyMessage="No dispatch stages available."
                    columns={[
                        { key: 'label', header: 'Courier Stage', render: (value, row) => <Badge variant={getCourierDispatchVariant(row.key)}>{value}</Badge> },
                        { key: 'records', header: 'Shipments', render: (value) => formatNumber(value) },
                        { key: 'units', header: 'Units', render: (value) => formatNumber(value) },
                        { key: 'amount', header: 'COD Exposure', render: (value) => formatCurrency(value, 'BDT') },
                    ]}
                    data={dispatchPipelineRows}
                />
            </Card>

            <Card padding="none" className="overflow-hidden" title="Live Dispatch Board" subtitle="Shipment register optimized for active outbound execution">
                <DataTable
                    loading={loading}
                    emptyMessage="No shipments available."
                    columns={[
                        { key: 'shipmentNumber', header: 'Shipment', render: (value, row) => <Link to="/fulfillment" className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white">{value}<div className="text-xs text-slate-500 dark:text-slate-400">{row.soNumber}</div></Link> },
                        { key: 'courierProvider', header: 'Provider', render: (value, row) => value || row.carrier || '-' },
                        { key: 'courierDispatchStatus', header: 'Courier Stage', render: (value) => <Badge variant={getCourierDispatchVariant(value || 'UNASSIGNED')}>{value || 'UNASSIGNED'}</Badge> },
                        { key: 'status', header: 'Shipment State', render: (value) => <Badge variant={getShipmentStatusVariant(value)}>{value}</Badge> },
                        { key: 'cashOnDeliveryAmount', header: 'COD', render: (value) => formatCurrency(value, 'BDT') },
                        { key: 'trackingNumber', header: 'Tracking', render: (value) => value || '-' },
                        { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
                    ]}
                    data={filteredShipments}
                />
            </Card>
        </>
    );
};

export default Outbound;

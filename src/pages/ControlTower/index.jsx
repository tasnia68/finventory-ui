import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import { getPickingLists } from '../../services/pickingService';
import { getPurchaseOrders } from '../../services/purchaseOrderService';
import { getSalesOrders } from '../../services/salesOrderService';
import { getShipments, getRmas } from '../../services/shipmentService';
import { getWarehouses } from '../../services/warehouseService';
import {
    formatCurrency,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getRmaStatusVariant,
    getSalesOrderStatusVariant,
    getShipmentStatusVariant,
    toList,
} from '../Sales/utils';

const TAB_OPTIONS = [
    { value: 'outbound', label: 'Outbound' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'exceptions', label: 'Exceptions' },
];

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

const PROCUREMENT_STAGE_CONFIG = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'ISSUED', label: 'Issued' },
    { key: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CLOSED', label: 'Closed' },
];

const GRN_STAGE_CONFIG = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
    >
        {children}
    </button>
);

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

const ControlTower = () => {
    const [activeTab, setActiveTab] = useState('outbound');
    const [warehouses, setWarehouses] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [pickingLists, setPickingLists] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ query: '', warehouseId: '', provider: '' });

    useEffect(() => {
        loadWorkspace();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadWorkspace = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getSalesOrders({ page: 0, size: 200 }),
            getPickingLists({ page: 0, size: 200 }),
            getShipments({ page: 0, size: 200 }),
            getRmas({ page: 0, size: 200 }),
            getPurchaseOrders({ page: 0, size: 200 }),
            getGoodsReceiptNotes({ page: 0, size: 200 }),
        ]);

        const [warehouseResult, salesOrderResult, pickingResult, shipmentResult, rmaResult, poResult, grnResult] = results;

        if (warehouseResult.status === 'fulfilled') setWarehouses(Array.isArray(warehouseResult.value) ? warehouseResult.value : []);
        if (salesOrderResult.status === 'fulfilled') setSalesOrders(toList(salesOrderResult.value));
        if (pickingResult.status === 'fulfilled') setPickingLists(toList(pickingResult.value));
        if (shipmentResult.status === 'fulfilled') setShipments(toList(shipmentResult.value));
        if (rmaResult.status === 'fulfilled') setRmas(toList(rmaResult.value));
        if (poResult.status === 'fulfilled') setPurchaseOrders(toList(poResult.value));
        if (grnResult.status === 'fulfilled') setGoodsReceipts(toList(grnResult.value));

        const failedMessages = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
            .filter(Boolean);

        if (failedMessages.length) {
            showAlert('warning', failedMessages[0] || 'Some control tower sources could not be loaded.');
        }

        setLoading(false);
    };

    const providerOptions = useMemo(
        () => [...new Set(shipments.map((shipment) => shipment.courierProvider).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right))
            .map((value) => ({ value, label: value })),
        [shipments]
    );

    const filteredSalesOrders = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return salesOrders.filter((order) => {
            if (filters.warehouseId && order.warehouseId !== filters.warehouseId) return false;
            if (!query) return true;
            return [order.soNumber, order.customerName, order.warehouseName, order.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [salesOrders, filters]);

    const filteredShipments = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return shipments.filter((shipment) => {
            if (filters.warehouseId && shipment.warehouseId !== filters.warehouseId) return false;
            if (filters.provider && shipment.courierProvider !== filters.provider) return false;
            if (!query) return true;
            return [
                shipment.shipmentNumber,
                shipment.soNumber,
                shipment.courierProvider,
                shipment.courierReference,
                shipment.trackingNumber,
                shipment.courierDispatchStatus,
                shipment.status,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [shipments, filters]);

    const filteredPurchaseOrders = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return purchaseOrders.filter((order) => {
            if (!query) return true;
            return [order.poNumber, order.supplierName, order.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [purchaseOrders, filters.query]);

    const filteredGoodsReceipts = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return goodsReceipts.filter((receipt) => {
            if (filters.warehouseId && receipt.warehouseId !== filters.warehouseId) return false;
            if (!query) return true;
            return [receipt.grnNumber, receipt.purchaseOrderNumber, receipt.supplierName, receipt.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [goodsReceipts, filters]);

    const outboundSummary = useMemo(() => ({
        approvalQueue: filteredSalesOrders.filter((order) => ['PENDING', 'HOLD', 'APPROVED'].includes(order.status)).length,
        backorders: filteredSalesOrders.filter((order) => order.status === 'BACKORDERED').length,
        awaitingDispatch: filteredShipments.filter((shipment) => ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING'].includes(shipment.courierDispatchStatus || 'UNASSIGNED')).length,
        inTransit: filteredShipments.filter((shipment) => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.courierDispatchStatus)).length,
        delivered: filteredShipments.filter((shipment) => shipment.status === 'DELIVERED').length,
        codExposure: filteredShipments.reduce((sum, shipment) => sum + Number(shipment.cashOnDeliveryAmount || 0), 0),
    }), [filteredSalesOrders, filteredShipments]);

    const inboundSummary = useMemo(() => ({
        pendingPo: filteredPurchaseOrders.filter((order) => ['PENDING', 'APPROVED', 'ISSUED'].includes(order.status)).length,
        receivingPo: filteredPurchaseOrders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length,
        draftReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'DRAFT').length,
        verifiedReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'VERIFIED').length,
        completedReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'COMPLETED').length,
        committedValue: filteredPurchaseOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    }), [filteredPurchaseOrders, filteredGoodsReceipts]);

    const exceptionSummary = useMemo(() => ({
        backorders: filteredSalesOrders.filter((order) => order.status === 'BACKORDERED').length,
        deliveryFailures: filteredShipments.filter((shipment) => shipment.courierDispatchStatus === 'DELIVERY_FAILED').length,
        returnsInFlight: rmas.filter((rma) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(rma.status)).length,
        draftReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'DRAFT').length,
        delayedDispatch: filteredShipments.filter((shipment) => ['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING'].includes(shipment.courierDispatchStatus || 'UNASSIGNED')).length,
        openPicks: pickingLists.filter((list) => !['COMPLETED', 'CANCELLED'].includes(list.status)).length,
    }), [filteredSalesOrders, filteredShipments, rmas, filteredGoodsReceipts, pickingLists]);

    const orderPipelineRows = useMemo(
        () => buildStatusRows(filteredSalesOrders, ORDER_STAGE_CONFIG, (item) => item.status, (item) => ({ units: item.items?.length || 0, amount: item.totalAmount || 0 })),
        [filteredSalesOrders]
    );

    const dispatchPipelineRows = useMemo(
        () => buildStatusRows(filteredShipments, COURIER_STAGE_CONFIG, (item) => item.courierDispatchStatus || 'UNASSIGNED', (item) => ({ units: sumShipmentUnits(item), amount: item.cashOnDeliveryAmount || 0 })),
        [filteredShipments]
    );

    const procurementPipelineRows = useMemo(
        () => buildStatusRows(filteredPurchaseOrders, PROCUREMENT_STAGE_CONFIG, (item) => item.status, (item) => ({ units: item.items?.length || 0, amount: item.totalAmount || 0 })),
        [filteredPurchaseOrders]
    );

    const receiptPipelineRows = useMemo(
        () => buildStatusRows(filteredGoodsReceipts, GRN_STAGE_CONFIG, (item) => item.status, (item) => ({ units: item.items?.length || 0, amount: 0 })),
        [filteredGoodsReceipts]
    );

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
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Operations Control Tower"
                    title="See the full state pipeline across outbound, inbound, and exceptions."
                    description="One operational surface for approval queues, warehouse execution, courier dispatch, receiving progress, and exception recovery."
                    actions={(
                        <>
                            <Input placeholder="Search order, shipment, PO, GRN, courier, or reference" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[320px]" />
                            <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="Warehouse" className="min-w-[190px]" />
                            <Select value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))} options={providerOptions} placeholder="Courier provider" className="min-w-[190px]" />
                            <Button variant="secondary" icon="sync" onClick={loadWorkspace}>Refresh</Button>
                            <Link to="/fulfillment" className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Open Fulfillment</Link>
                        </>
                    )}
                    accent="from-cyan-500/15 via-transparent to-amber-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="flex flex-wrap gap-2">
                    {TAB_OPTIONS.map((tab) => (
                        <TabButton key={tab.value} active={activeTab === tab.value} onClick={() => setActiveTab(tab.value)}>
                            {tab.label}
                        </TabButton>
                    ))}
                </div>

                {activeTab === 'outbound' ? (
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
                ) : null}

                {activeTab === 'inbound' ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                            <MetricCard title="Pending POs" value={formatNumber(inboundSummary.pendingPo)} caption="Supplier orders still moving through approval, issue, or supplier coordination" icon="receipt_long" tone="amber" />
                            <MetricCard title="Receiving POs" value={formatNumber(inboundSummary.receivingPo)} caption="Procurement orders partially received and still open for the warehouse" icon="move_to_inbox" tone="blue" />
                            <MetricCard title="Draft Receipts" value={formatNumber(inboundSummary.draftReceipts)} caption="GRNs awaiting balancing and receiving team validation" icon="edit_note" tone="amber" />
                            <MetricCard title="Verified Receipts" value={formatNumber(inboundSummary.verifiedReceipts)} caption="Receipts validated and ready to post into inventory and accounting" icon="fact_check" tone="blue" />
                            <MetricCard title="Completed Receipts" value={formatNumber(inboundSummary.completedReceipts)} caption="Inbound receipts already posted to stock and procurement records" icon="task_alt" tone="emerald" />
                            <MetricCard title="Committed Value" value={formatCurrency(inboundSummary.committedValue)} caption="Commercial exposure across the filtered purchase order book" icon="account_balance_wallet" tone="violet" />
                        </div>

                        <Card padding="none" className="overflow-hidden" title="Procurement Pipeline" subtitle="Purchase order stages from pending approval to commercial close">
                            <DataTable
                                loading={loading}
                                emptyMessage="No procurement stages available."
                                columns={[
                                    { key: 'label', header: 'PO Stage', render: (value) => <Badge variant="info">{value}</Badge> },
                                    { key: 'records', header: 'Orders', render: (value) => formatNumber(value) },
                                    { key: 'units', header: 'Lines', render: (value) => formatNumber(value) },
                                    { key: 'amount', header: 'Committed Value', render: (value) => formatCurrency(value) },
                                ]}
                                data={procurementPipelineRows}
                            />
                        </Card>

                        <Card padding="none" className="overflow-hidden" title="Receiving Pipeline" subtitle="Warehouse receipt states from draft balancing to posted inbound stock">
                            <DataTable
                                loading={loading}
                                emptyMessage="No receipt stages available."
                                columns={[
                                    { key: 'label', header: 'Receipt Stage', render: (value, row) => <Badge variant={row.key === 'COMPLETED' ? 'success' : row.key === 'VERIFIED' ? 'info' : 'warning'}>{value}</Badge> },
                                    { key: 'records', header: 'Receipts', render: (value) => formatNumber(value) },
                                    { key: 'units', header: 'Lines', render: (value) => formatNumber(value) },
                                ]}
                                data={receiptPipelineRows}
                            />
                        </Card>

                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <Card padding="none" className="overflow-hidden" title="Purchase Order Register" subtitle="Filtered inbound order book for buyers and receiving leads">
                                <DataTable
                                    loading={loading}
                                    emptyMessage="No purchase orders available."
                                    columns={[
                                        { key: 'poNumber', header: 'PO', render: (value) => <Link to="/purchase-orders" className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white">{value}</Link> },
                                        { key: 'supplierName', header: 'Supplier' },
                                        { key: 'status', header: 'Status', render: (value) => <Badge variant={['COMPLETED', 'CLOSED'].includes(value) ? 'success' : ['PARTIALLY_RECEIVED', 'APPROVED', 'ISSUED'].includes(value) ? 'info' : 'warning'}>{value}</Badge> },
                                        { key: 'totalAmount', header: 'Value', render: (value, row) => formatCurrency(value, row.currency) },
                                    ]}
                                    data={filteredPurchaseOrders}
                                />
                            </Card>

                            <Card padding="none" className="overflow-hidden" title="Goods Receipt Register" subtitle="Filtered receipt queue for receiving and stock control">
                                <DataTable
                                    loading={loading}
                                    emptyMessage="No goods receipts available."
                                    columns={[
                                        { key: 'grnNumber', header: 'GRN', render: (value) => <Link to="/goods-receipts" className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white">{value}</Link> },
                                        { key: 'purchaseOrderNumber', header: 'PO' },
                                        { key: 'supplierName', header: 'Supplier' },
                                        { key: 'status', header: 'Status', render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : value === 'VERIFIED' ? 'info' : 'warning'}>{value}</Badge> },
                                    ]}
                                    data={filteredGoodsReceipts}
                                />
                            </Card>
                        </div>
                    </>
                ) : null}

                {activeTab === 'exceptions' ? (
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
                ) : null}
            </div>
        </div>
    );
};

export default ControlTower;

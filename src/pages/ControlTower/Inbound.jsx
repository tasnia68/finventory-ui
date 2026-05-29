import React, { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Badge, Card, DataTable, MetricCard } from '../../components/common';
import { formatCurrency, formatNumber } from '../Sales/utils';

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

const Inbound = () => {
    const { loading, filteredPurchaseOrders, filteredGoodsReceipts } = useOutletContext();

    const inboundSummary = useMemo(() => ({
        pendingPo: filteredPurchaseOrders.filter((order) => ['PENDING', 'APPROVED', 'ISSUED'].includes(order.status)).length,
        receivingPo: filteredPurchaseOrders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length,
        draftReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'DRAFT').length,
        verifiedReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'VERIFIED').length,
        completedReceipts: filteredGoodsReceipts.filter((receipt) => receipt.status === 'COMPLETED').length,
        committedValue: filteredPurchaseOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    }), [filteredPurchaseOrders, filteredGoodsReceipts]);

    const procurementPipelineRows = useMemo(
        () => buildStatusRows(filteredPurchaseOrders, PROCUREMENT_STAGE_CONFIG, (item) => item.status, (item) => ({ units: item.items?.length || 0, amount: item.totalAmount || 0 })),
        [filteredPurchaseOrders]
    );

    const receiptPipelineRows = useMemo(
        () => buildStatusRows(filteredGoodsReceipts, GRN_STAGE_CONFIG, (item) => item.status, (item) => ({ units: item.items?.length || 0, amount: 0 })),
        [filteredGoodsReceipts]
    );

    return (
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
    );
};

export default Inbound;

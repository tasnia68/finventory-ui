import React from 'react';
import { Badge, Button, Card, DataTable, Modal } from '../../components/common';
import { formatCurrency, formatDate, formatDateTime, getSalesOrderStatusVariant } from '../Sales/utils';
import { getSalesOrderSourceBadgeVariant, getSalesOrderSourceLabel } from '../../utils/salesOrderSource';

const SalesOrderDetailModal = ({ salesOrder, isOpen, onClose, onEdit, onTransition }) => {
    if (!salesOrder) return null;

    const actions = [];
    if (salesOrder.status === 'DRAFT') {
        actions.push({ label: 'Submit', status: 'PENDING_APPROVAL' });
        actions.push({ label: 'Confirm', status: 'CONFIRMED' });
        actions.push({ label: 'Cancel', status: 'CANCELLED', variant: 'danger' });
    }
    if (salesOrder.status === 'PENDING_APPROVAL') {
        actions.push({ label: 'Approve', status: 'APPROVED' });
        actions.push({ label: 'Cancel', status: 'CANCELLED', variant: 'danger' });
    }
    if (salesOrder.status === 'APPROVED') {
        actions.push({ label: 'Confirm', status: 'CONFIRMED' });
        actions.push({ label: 'Cancel', status: 'CANCELLED', variant: 'danger' });
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={salesOrder.soNumber} size="xl">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{salesOrder.soNumber}</h3>
                            <Badge variant={getSalesOrderSourceBadgeVariant(salesOrder)}>{getSalesOrderSourceLabel(salesOrder)}</Badge>
                            <Badge variant={getSalesOrderStatusVariant(salesOrder.status)}>{salesOrder.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{salesOrder.customerName} • {salesOrder.warehouseName || 'No warehouse'} • Priority {salesOrder.priority}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Expected delivery {formatDate(salesOrder.expectedDeliveryDate)} • Ordered {formatDateTime(salesOrder.orderDate)}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{salesOrder.notes || 'No order notes recorded.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['DRAFT', 'PENDING_APPROVAL'].includes(salesOrder.status) ? <Button variant="secondary" onClick={() => onEdit(salesOrder)}>Edit</Button> : null}
                        {actions.map((action) => (
                            <Button key={action.status} variant={action.variant || 'primary'} onClick={() => onTransition(salesOrder, action.status)}>{action.label}</Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Order Value</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(salesOrder.totalAmount, salesOrder.currency)}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Line Count</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.items?.length || 0}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Warehouse</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.warehouseName || '-'}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Source</p>
                        <div className="mt-2"><Badge variant={getSalesOrderSourceBadgeVariant(salesOrder)}>{getSalesOrderSourceLabel(salesOrder)}</Badge></div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Priority</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.priority}</div>
                    </Card>
                </div>

                <Card padding="none" className="overflow-hidden" title="Ordered Items" subtitle="Committed sell-side lines currently attached to the order">
                    <DataTable
                        columns={[
                            { key: 'productVariantName', header: 'Variant', render: (value, row) => <div><div className="font-semibold text-slate-900 dark:text-white">{row.sku || value}</div><div className="text-xs text-slate-500 dark:text-slate-400">{value}</div></div> },
                            { key: 'quantity', header: 'Ordered Qty' },
                            { key: 'shippedQuantity', header: 'Shipped Qty' },
                            { key: 'unitPrice', header: 'Unit Price', render: (value) => formatCurrency(value, salesOrder.currency) },
                            { key: 'totalPrice', header: 'Line Total', render: (value) => formatCurrency(value, salesOrder.currency) },
                        ]}
                        data={salesOrder.items || []}
                        emptyMessage="No order lines available."
                    />
                </Card>
            </div>
        </Modal>
    );
};

export default SalesOrderDetailModal;

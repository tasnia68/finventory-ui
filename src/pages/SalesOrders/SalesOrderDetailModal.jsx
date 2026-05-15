import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Modal } from '../../components/common';
import { formatCurrency, formatDate, formatDateTime, getSalesOrderStatusVariant } from '../Sales/utils';
import { getSalesOrderSourceBadgeVariant, getSalesOrderSourceLabel } from '../../utils/salesOrderSource';
import {
    getAllowedTransitions,
    holdOrder,
    approveOrder,
    confirmOrder,
    packComplete,
    shipOrder,
    deliverOrder,
    returnOrder,
    cancelOrder,
} from '../../services/salesOrderService';
import { getCourierProfiles, getDeliveryZones } from '../../services/courierService';
import PartialDeliveryModal from './PartialDeliveryModal';

const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const ACTION_FOR_STATUS = {
    PENDING: { label: 'Submit for review', status: 'PENDING' },
    HOLD: { label: 'Place on hold', status: 'HOLD', needsReason: true },
    APPROVED: { label: 'Approve', status: 'APPROVED' },
    CONFIRMED: { label: 'Confirm + assign courier', status: 'CONFIRMED', needsCourier: true },
    PACKAGING: { label: 'Mark packaged', status: 'PACKAGING' },
    SHIPPED: { label: 'Ship', status: 'SHIPPED' },
    DELIVERED: { label: 'Mark delivered', status: 'DELIVERED' },
    PARTIALLY_DELIVERED: { label: 'Partial delivery…', status: 'PARTIALLY_DELIVERED', needsPartial: true },
    RETURNED: { label: 'Mark returned', status: 'RETURNED', variant: 'danger' },
    CANCELLED: { label: 'Cancel', status: 'CANCELLED', variant: 'danger' },
    DELIVERY_FAILED: { label: 'Delivery failed', status: 'DELIVERY_FAILED', variant: 'danger' },
    DRAFT: { label: 'Return to draft', status: 'DRAFT' },
    BACKORDERED: { label: 'Move to backorder', status: 'BACKORDERED' },
};

const SalesOrderDetailModal = ({ salesOrder, isOpen, onClose, onEdit, onRefresh }) => {
    const [transitions, setTransitions] = useState([]);
    const [loadingTransitions, setLoadingTransitions] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [holdDialog, setHoldDialog] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [confirmCourier, setConfirmCourier] = useState('');
    const [confirmZone, setConfirmZone] = useState('');
    const [couriers, setCouriers] = useState([]);
    const [zones, setZones] = useState([]);
    const [partialOpen, setPartialOpen] = useState(false);

    useEffect(() => {
        if (!salesOrder?.id) return;
        setLoadingTransitions(true);
        getAllowedTransitions(salesOrder.id)
            .then((data) => setTransitions(Array.isArray(data) ? data : toList(data)))
            .catch(() => setTransitions([]))
            .finally(() => setLoadingTransitions(false));
    }, [salesOrder?.id, salesOrder?.status]);

    const loadCourierOptions = async () => {
        try {
            const [profileData, zoneData] = await Promise.all([getCourierProfiles(), getDeliveryZones()]);
            setCouriers(toList(profileData).filter((p) => p.isActive ?? p.active));
            setZones(toList(zoneData));
        } catch (e) {
            setError(e.message || 'Failed to load couriers');
        }
    };

    if (!salesOrder) return null;

    const runAction = async (fn, successMsg) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
            onRefresh?.(successMsg);
        } catch (e) {
            setError(e.message || 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    const handleTransition = async (target) => {
        const action = ACTION_FOR_STATUS[target];
        if (!action) {
            await runAction(
                async () => {
                    const { updateSalesOrderStatus } = await import('../../services/salesOrderService');
                    return updateSalesOrderStatus(salesOrder.id, target);
                },
                `Order moved to ${target}`,
            );
            return;
        }
        if (action.needsReason) {
            setHoldDialog(true);
            return;
        }
        if (action.needsCourier) {
            await loadCourierOptions();
            setConfirmDialog(true);
            return;
        }
        if (action.needsPartial) {
            setPartialOpen(true);
            return;
        }
        const callerMap = {
            APPROVED: () => approveOrder(salesOrder.id),
            PACKAGING: () => packComplete(salesOrder.id),
            SHIPPED: () => shipOrder(salesOrder.id),
            DELIVERED: () => deliverOrder(salesOrder.id),
            RETURNED: () => returnOrder(salesOrder.id),
            CANCELLED: () => cancelOrder(salesOrder.id),
        };
        const fn = callerMap[target];
        if (fn) {
            await runAction(fn, action.label + ' applied');
        } else {
            const { updateSalesOrderStatus } = await import('../../services/salesOrderService');
            await runAction(() => updateSalesOrderStatus(salesOrder.id, target), `Order moved to ${target}`);
        }
    };

    const submitHold = async () => {
        await runAction(() => holdOrder(salesOrder.id, holdReason), 'Order placed on hold');
        setHoldDialog(false);
        setHoldReason('');
    };

    const submitConfirm = async () => {
        await runAction(
            () => confirmOrder(salesOrder.id, { courierProfileId: confirmCourier || null, deliveryZone: confirmZone || null }),
            'Order confirmed',
        );
        setConfirmDialog(false);
        setConfirmCourier('');
        setConfirmZone('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={salesOrder.soNumber} size="xl">
            <div className="space-y-6">
                {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{salesOrder.soNumber}</h3>
                            <Badge variant={getSalesOrderSourceBadgeVariant(salesOrder)}>{getSalesOrderSourceLabel(salesOrder)}</Badge>
                            <Badge variant={getSalesOrderStatusVariant(salesOrder.status)}>{salesOrder.status}</Badge>
                            {salesOrder.holdReason ? <Badge variant="warning" title={salesOrder.holdReason}>Hold: {salesOrder.holdReason}</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{salesOrder.customerName} • {salesOrder.warehouseName || 'No warehouse'} • Priority {salesOrder.priority}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Expected delivery {formatDate(salesOrder.expectedDeliveryDate)} • Ordered {formatDateTime(salesOrder.orderDate)}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{salesOrder.notes || 'No order notes recorded.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['DRAFT', 'PENDING'].includes(salesOrder.status) ? (
                            <Button variant="secondary" onClick={() => onEdit(salesOrder)}>Edit</Button>
                        ) : !['SHIPPED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'PARTIALLY_CANCELLED', 'RETURNED', 'CANCELLED', 'DELIVERY_FAILED'].includes(salesOrder.status) ? (
                            <Button variant="secondary" onClick={() => onEdit(salesOrder)}>Edit items</Button>
                        ) : null}
                        {loadingTransitions ? (
                            <span className="text-sm text-slate-500">Loading actions…</span>
                        ) : (
                            transitions.map((target) => {
                                const action = ACTION_FOR_STATUS[target] || { label: target, status: target };
                                return (
                                    <Button
                                        key={target}
                                        variant={action.variant || 'primary'}
                                        disabled={busy}
                                        onClick={() => handleTransition(target)}
                                    >
                                        {action.label}
                                    </Button>
                                );
                            })
                        )}
                        {transitions.length === 0 && !loadingTransitions ? (
                            <span className="text-xs text-slate-500">No actions available for this state.</span>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Order value</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(salesOrder.totalAmount, salesOrder.currency)}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Line count</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.items?.length || 0}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Warehouse</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.warehouseName || '-'}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Priority</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.priority}</div>
                    </Card>
                </div>

                <Card padding="none" className="overflow-hidden" title="Ordered items" subtitle="Committed sell-side lines currently attached to the order">
                    <DataTable
                        columns={[
                            { key: 'productVariantName', header: 'Variant', render: (value, row) => <div><div className="font-semibold text-slate-900 dark:text-white">{row.sku || value}</div><div className="text-xs text-slate-500 dark:text-slate-400">{value}</div></div> },
                            { key: 'quantity', header: 'Ordered' },
                            { key: 'shippedQuantity', header: 'Shipped' },
                            { key: 'fulfilledQuantity', header: 'Delivered' },
                            { key: 'returnedQuantity', header: 'Returned' },
                            { key: 'cancelledQuantity', header: 'Cancelled' },
                            { key: 'unitPrice', header: 'Unit price', render: (value) => formatCurrency(value, salesOrder.currency) },
                            { key: 'totalPrice', header: 'Line total', render: (value) => formatCurrency(value, salesOrder.currency) },
                        ]}
                        data={salesOrder.items || []}
                        emptyMessage="No order lines available."
                    />
                </Card>
            </div>

            {holdDialog ? (
                <Modal isOpen onClose={() => setHoldDialog(false)} title="Place on hold" size="md">
                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason (optional)</label>
                        <textarea
                            className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            value={holdReason}
                            onChange={(e) => setHoldReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setHoldDialog(false)}>Cancel</Button>
                            <Button onClick={submitHold} disabled={busy}>{busy ? 'Saving…' : 'Place on hold'}</Button>
                        </div>
                    </div>
                </Modal>
            ) : null}

            {confirmDialog ? (
                <Modal isOpen onClose={() => setConfirmDialog(false)} title="Confirm order" size="md">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Courier profile</label>
                            <select
                                value={confirmCourier}
                                onChange={(e) => setConfirmCourier(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="">— Skip courier (manual) —</option>
                                {couriers.map((c) => <option key={c.id} value={c.id}>{c.displayName} ({c.providerCode})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery zone</label>
                            <select
                                value={confirmZone}
                                onChange={(e) => setConfirmZone(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="">— Select zone —</option>
                                {zones.map((z) => <option key={z} value={z}>{z.replaceAll('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setConfirmDialog(false)}>Cancel</Button>
                            <Button onClick={submitConfirm} disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</Button>
                        </div>
                    </div>
                </Modal>
            ) : null}

            {partialOpen ? (
                <PartialDeliveryModal
                    salesOrder={salesOrder}
                    onClose={() => setPartialOpen(false)}
                    onDone={(msg) => { setPartialOpen(false); onRefresh?.(msg); }}
                />
            ) : null}
        </Modal>
    );
};

export default SalesOrderDetailModal;

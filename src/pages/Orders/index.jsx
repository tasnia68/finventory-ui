import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Input } from '../../components/common';
import {
    getSalesOrders,
    getSalesOrder,
    getAllowedTransitions,
    holdOrder,
    approveOrder,
    confirmOrder,
    packComplete,
    shipOrder,
    deliverOrder,
    returnOrder,
    cancelOrder,
    updateSalesOrderStatus,
} from '../../services/salesOrderService';
import { getCourierProfiles, getDeliveryZones, requestSteadfastReturn } from '../../services/courierService';
import { formatCurrency, formatDate, formatDateTime, getSalesOrderStatusVariant } from '../Sales/utils';
import PartialDeliveryModal from '../SalesOrders/PartialDeliveryModal';

const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'HOLD', label: 'Hold' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PACKAGING', label: 'Packaging' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'PARTIALLY_DELIVERED', label: 'Partial' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'RETURNED', label: 'Returned' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

const ACTION_META = {
    PENDING: { label: 'Submit for review', hint: 'Move from draft into the approval queue.' },
    HOLD: { label: 'Place on hold', hint: 'Reserve stock but pause fulfillment pending decision.', needsReason: true },
    APPROVED: { label: 'Approve', hint: 'Approve for confirmation and courier assignment.' },
    CONFIRMED: { label: 'Confirm + assign courier', hint: 'Lock the order and attach a courier + zone.', needsCourier: true },
    PACKAGING: { label: 'Move to packaging', hint: 'Print invoice, pack the goods.' },
    SHIPPED: { label: 'Mark shipped', hint: 'Courier has picked up. Fulfills reservations.' },
    DELIVERED: { label: 'Mark delivered', hint: 'Customer received full order. Posts AR invoice and revenue.' },
    PARTIALLY_DELIVERED: { label: 'Record partial delivery…', hint: 'Some items accepted, some returned or cancelled.', needsPartial: true },
    PARTIALLY_CANCELLED: { label: 'Partial cancel', hint: 'Delivery fee kept, product returned.' },
    RETURNED: { label: 'Mark returned', hint: 'Post-delivery return. Restocks inventory.', variant: 'danger' },
    CANCELLED: { label: 'Cancel', hint: 'Releases reservations. Pre-ship only.', variant: 'danger' },
    DELIVERY_FAILED: { label: 'Delivery failed', hint: 'Courier could not deliver.', variant: 'danger' },
    DRAFT: { label: 'Return to draft', hint: 'Send back to draft.' },
    BACKORDERED: { label: 'Move to backorder', hint: 'Stock unavailable.' },
};

const ageLabel = (iso) => {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'future';
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [transitions, setTransitions] = useState([]);
    const [busy, setBusy] = useState(false);
    const [activeDialog, setActiveDialog] = useState(null);
    const [dialogState, setDialogState] = useState({});
    const [couriers, setCouriers] = useState([]);
    const [zones, setZones] = useState([]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 4000);
    };

    const loadList = async () => {
        try {
            setLoading(true);
            const data = await getSalesOrders({ size: 200, sortBy: 'orderDate', sortDirection: 'desc' });
            setOrders(toList(data));
        } catch (e) {
            showAlert('error', e.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const loadDetail = async (id) => {
        if (!id) { setDetail(null); setTransitions([]); return; }
        try {
            setDetailLoading(true);
            const [order, trans] = await Promise.all([getSalesOrder(id), getAllowedTransitions(id)]);
            setDetail(order);
            setTransitions(Array.isArray(trans) ? trans : toList(trans));
        } catch (e) {
            showAlert('error', e.message || 'Failed to load order');
        } finally {
            setDetailLoading(false);
        }
    };

    const loadCourierOptions = async () => {
        try {
            const [profileData, zoneData] = await Promise.all([getCourierProfiles(), getDeliveryZones()]);
            setCouriers(toList(profileData).filter((p) => p.isActive ?? p.active));
            setZones(toList(zoneData));
        } catch (e) {
            showAlert('error', e.message || 'Failed to load couriers');
        }
    };

    useEffect(() => { loadList(); }, []);
    useEffect(() => { loadDetail(selectedId); }, [selectedId]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (statusTab && o.status !== statusTab) return false;
            if (!q) return true;
            return [o.soNumber, o.customerName, o.externalOrderId]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
    }, [orders, search, statusTab]);

    // Auto-select first visible row on first load (and after filter change clears the selection).
    useEffect(() => {
        if (filtered.length === 0) return;
        const stillVisible = filtered.some((o) => o.id === selectedId);
        if (!selectedId || !stillVisible) {
            setSelectedId(filtered[0].id);
        }
    }, [filtered, selectedId]);

    const statusCounts = useMemo(() => {
        const counts = {};
        for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
        return counts;
    }, [orders]);

    const refreshAfterAction = async (message) => {
        if (message) showAlert('success', message);
        await Promise.all([loadList(), loadDetail(selectedId)]);
    };

    const runAction = async (fn, successMsg) => {
        setBusy(true);
        try {
            await fn();
            await refreshAfterAction(successMsg);
        } catch (e) {
            showAlert('error', e.message || 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    const handleAction = async (target) => {
        const meta = ACTION_META[target] || {};
        if (meta.needsReason) {
            setActiveDialog({ type: 'hold', target });
            setDialogState({ reason: '' });
            return;
        }
        if (meta.needsCourier) {
            await loadCourierOptions();
            setActiveDialog({ type: 'confirm', target });
            setDialogState({ courierProfileId: detail?.courierProfileId || '', deliveryZone: detail?.deliveryZone || '' });
            return;
        }
        if (meta.needsPartial) {
            setActiveDialog({ type: 'partial', target });
            return;
        }
        const callers = {
            APPROVED: () => approveOrder(selectedId),
            PACKAGING: () => packComplete(selectedId),
            SHIPPED: () => shipOrder(selectedId),
            DELIVERED: () => deliverOrder(selectedId),
            RETURNED: () => returnOrder(selectedId),
            CANCELLED: () => cancelOrder(selectedId),
        };
        await runAction(
            callers[target] || (() => updateSalesOrderStatus(selectedId, target)),
            `${meta.label || target} applied`,
        );
    };

    const submitHold = async () => {
        await runAction(() => holdOrder(selectedId, dialogState.reason), 'Order placed on hold');
        setActiveDialog(null);
    };

    const submitConfirm = async () => {
        await runAction(
            () => confirmOrder(selectedId, {
                courierProfileId: dialogState.courierProfileId || null,
                deliveryZone: dialogState.deliveryZone || null,
            }),
            'Order confirmed',
        );
        setActiveDialog(null);
    };

    const handleSteadfastReturn = async (shipmentId) => {
        const reason = window.prompt('Reason for return request (optional):') || '';
        await runAction(() => requestSteadfastReturn(shipmentId, reason), 'Steadfast return requested');
    };

    return (
        <div className="flex-1 overflow-hidden bg-background-light p-6 dark:bg-background-dark">
          <div className="mx-auto h-full max-w-7xl flex flex-col gap-4">
            {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Orders</h1>
                    <span className="text-sm text-slate-500">{filtered.length} / {orders.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search SO#, customer, external ID"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-72"
                    />
                    <Button variant="secondary" onClick={loadList}>Refresh</Button>
                </div>
            </div>

            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
                {(() => {
                    // Always show "All" + the active tab + tabs with non-zero counts.
                    // Hide zero-count tabs behind a "More" dropdown so the strip stays scannable.
                    const visible = STATUS_TABS.filter((tab) => {
                        if (!tab.key) return true; // All
                        if (statusTab === tab.key) return true;
                        return (statusCounts[tab.key] || 0) > 0;
                    });
                    const hidden = STATUS_TABS.filter((tab) => tab.key && !visible.some((v) => v.key === tab.key));
                    return (
                        <>
                            <div className="flex flex-wrap gap-1">
                                {visible.map((tab) => {
                                    const count = tab.key ? (statusCounts[tab.key] || 0) : orders.length;
                                    const isActive = statusTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key || 'all'}
                                            onClick={() => setStatusTab(tab.key)}
                                            className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                                isActive
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                            }`}
                                        >
                                            {tab.label} <span className="ml-1 text-xs text-slate-400">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {hidden.length > 0 ? (
                                <div className="ml-auto">
                                    <select
                                        value=""
                                        onChange={(e) => e.target.value && setStatusTab(e.target.value)}
                                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                    >
                                        <option value="">More ({hidden.length})…</option>
                                        {hidden.map((tab) => <option key={tab.key} value={tab.key}>{tab.label} (0)</option>)}
                                    </select>
                                </div>
                            ) : null}
                        </>
                    );
                })()}
            </div>

            <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="h-full overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-sm text-slate-500">Loading…</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-6 text-sm text-slate-500">No orders match this filter.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((o) => {
                                    const selected = o.id === selectedId;
                                    return (
                                        <li
                                            key={o.id}
                                            onClick={() => setSelectedId(o.id)}
                                            className={`cursor-pointer px-4 py-3 transition-colors ${
                                                selected
                                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{o.soNumber}</span>
                                                <Badge variant={getSalesOrderStatusVariant(o.status)}>{o.status}</Badge>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                                <span className="truncate">{o.customerName || '—'}</span>
                                                <span>{ageLabel(o.orderDate)}</span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-xs">
                                                <span className="text-slate-400">{o.externalSource || o.salesChannel || 'SALES_ORDER'}</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                    {formatCurrency(o.totalAmount, o.currency)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                    {!selectedId ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            Select an order to view details and actions.
                        </div>
                    ) : detailLoading || !detail ? (
                        <div className="p-6 text-sm text-slate-500">Loading…</div>
                    ) : (
                        <div className="h-full overflow-y-auto">
                            <OrderDetail
                                order={detail}
                                transitions={transitions}
                                busy={busy}
                                onAction={handleAction}
                                onSteadfastReturn={handleSteadfastReturn}
                            />
                        </div>
                    )}
                </div>
            </div>

            {activeDialog?.type === 'hold' ? (
                <DialogShell title="Place on hold" onClose={() => setActiveDialog(null)}>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason (optional)</label>
                    <textarea
                        className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                        value={dialogState.reason || ''}
                        onChange={(e) => setDialogState({ ...dialogState, reason: e.target.value })}
                    />
                    <div className="flex justify-end gap-2 pt-3">
                        <Button variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                        <Button onClick={submitHold} disabled={busy}>{busy ? 'Saving…' : 'Place on hold'}</Button>
                    </div>
                </DialogShell>
            ) : null}

            {activeDialog?.type === 'confirm' ? (
                <DialogShell title="Confirm order" onClose={() => setActiveDialog(null)}>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Courier profile</label>
                            <select
                                value={dialogState.courierProfileId || ''}
                                onChange={(e) => setDialogState({ ...dialogState, courierProfileId: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="">— Skip courier (manual) —</option>
                                {couriers.map((c) => <option key={c.id} value={c.id}>{c.displayName} ({c.providerCode})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery zone</label>
                            <select
                                value={dialogState.deliveryZone || ''}
                                onChange={(e) => setDialogState({ ...dialogState, deliveryZone: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="">— Select zone —</option>
                                {zones.map((z) => <option key={z} value={z}>{z.replaceAll('_', ' ')}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                        <Button variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                        <Button onClick={submitConfirm} disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</Button>
                    </div>
                </DialogShell>
            ) : null}

            {activeDialog?.type === 'partial' ? (
                <PartialDeliveryModal
                    salesOrder={detail}
                    onClose={() => setActiveDialog(null)}
                    onDone={(msg) => { setActiveDialog(null); refreshAfterAction(msg); }}
                />
            ) : null}
          </div>
        </div>
    );
};

const OrderDetail = ({ order, transitions, busy, onAction, onSteadfastReturn }) => {
    return (
        <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">{order.soNumber}</span>
                        <Badge variant={getSalesOrderStatusVariant(order.status)}>{order.status}</Badge>
                        {order.holdReason ? <Badge variant="warning" title={order.holdReason}>On hold</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        Placed {formatDateTime(order.orderDate)} • {order.salesChannel || 'SALES_ORDER'}
                        {order.externalSource ? ` • ${order.externalSource} #${order.externalOrderRef || order.externalOrderId}` : ''}
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-500">Order value</div>
                    <div className="text-xl font-bold tabular-nums">{formatCurrency(order.totalAmount, order.currency)}</div>
                    {order.codAmount ? <div className="mt-1 text-xs text-slate-500">COD {formatCurrency(order.codAmount, order.currency)}</div> : null}
                </div>
            </div>

            <Section title="Customer">
                <KV label="Name" value={order.customerName} />
                <KV label="Warehouse" value={order.warehouseName || '—'} />
                <KV label="Expected delivery" value={formatDate(order.expectedDeliveryDate)} />
                <KV label="Priority" value={order.priority} />
                {order.notes ? (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                        {order.notes}
                    </div>
                ) : null}
                {order.holdReason ? <div className="mt-3 rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">Hold reason: {order.holdReason}</div> : null}
            </Section>

            <Section title="Fulfillment">
                <KV label="Delivery zone" value={order.deliveryZone || '—'} />
                <KV label="Courier profile" value={order.courierProfileId ? <span className="font-mono text-xs">{order.courierProfileId}</span> : '—'} />
                {Array.isArray(order.shipments) && order.shipments.length > 0 ? (
                    <div className="mt-2 space-y-2">
                        {order.shipments.map((s) => (
                            <div key={s.id} className="rounded border border-slate-200 p-3 text-sm dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-semibold">{s.shipmentNumber}</span>
                                    <Badge variant="info">{s.courierDispatchStatus || s.status}</Badge>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {s.courierProvider || 'No courier'} {s.trackingNumber ? `• ${s.trackingNumber}` : ''}
                                </div>
                                {s.trackingUrl ? <a className="text-xs text-blue-600 hover:underline" href={s.trackingUrl} target="_blank" rel="noreferrer">Track →</a> : null}
                                {s.courierProvider === 'STEADFAST' && s.courierReference ? (
                                    <div className="mt-2">
                                        <Button size="sm" variant="ghost" onClick={() => onSteadfastReturn(s.id)}>Request Steadfast return</Button>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
            </Section>

            <Section title="Items">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                                <th className="py-2 pr-2">Variant</th>
                                <th className="py-2 pr-2">Ord</th>
                                <th className="py-2 pr-2">Ship</th>
                                <th className="py-2 pr-2">Deliv</th>
                                <th className="py-2 pr-2">Retn</th>
                                <th className="py-2 pr-2">Cnc</th>
                                <th className="py-2 pr-2 text-right">Unit</th>
                                <th className="py-2 pr-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items || []).map((item) => (
                                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 pr-2">
                                        <div className="font-semibold">{item.sku || item.productVariantName}</div>
                                        <div className="text-xs text-slate-500">{item.productVariantName}</div>
                                    </td>
                                    <td className="py-2 pr-2">{item.quantity}</td>
                                    <td className="py-2 pr-2">{item.shippedQuantity || 0}</td>
                                    <td className="py-2 pr-2">{item.fulfilledQuantity || 0}</td>
                                    <td className="py-2 pr-2">{item.returnedQuantity || 0}</td>
                                    <td className="py-2 pr-2">{item.cancelledQuantity || 0}</td>
                                    <td className="py-2 pr-2 text-right">{formatCurrency(item.unitPrice, order.currency)}</td>
                                    <td className="py-2 pr-2 text-right">{formatCurrency(item.totalPrice, order.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="Actions">
                {transitions.length === 0 ? (
                    <div className="text-sm text-slate-500">No further actions available for this state.</div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {transitions.map((target) => {
                            const meta = ACTION_META[target] || { label: target, hint: '' };
                            const variant = meta.variant === 'danger' ? 'ghost' : (meta.variant || 'primary');
                            return (
                                <li key={target} className="flex items-start justify-between gap-4 py-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{meta.label}</div>
                                        <div className="text-xs text-slate-500">{meta.hint}</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={variant}
                                        disabled={busy}
                                        className={meta.variant === 'danger' ? 'text-red-600' : ''}
                                        onClick={() => onAction(target)}
                                    >
                                        {meta.variant === 'danger' ? meta.label : 'Apply'}
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>
        </div>
    );
};

const Section = ({ title, children }) => (
    <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {children}
        </div>
    </div>
);

const KV = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="text-right text-slate-900 dark:text-slate-100">{value ?? '—'}</span>
    </div>
);

const DialogShell = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                <button className="text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={onClose}>✕</button>
            </div>
            {children}
        </div>
    </div>
);

export default Orders;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button } from '../../components/common';
import {
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
import PartialDeliveryModal from '../SalesOrders/PartialDeliveryModal';
import { ACTION_META, toList } from './constants';
import HeaderCard from './Sections/HeaderCard';
import CustomerCard from './Sections/CustomerCard';
import FulfillmentCard from './Sections/FulfillmentCard';
import ItemsCard from './Sections/ItemsCard';
import ActionsCard from './Sections/ActionsCard';

const OrdersDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(true);
    const [transitions, setTransitions] = useState([]);
    const [alert, setAlert] = useState(null);
    const [busy, setBusy] = useState(false);
    const [activeDialog, setActiveDialog] = useState(null);
    const [dialogState, setDialogState] = useState({});
    const [couriers, setCouriers] = useState([]);
    const [zones, setZones] = useState([]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 4000);
    };

    const loadDetail = async () => {
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

    useEffect(() => { loadDetail(); }, [id]);

    const refreshAfterAction = async (message) => {
        if (message) showAlert('success', message);
        await loadDetail();
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
            APPROVED: () => approveOrder(id),
            PACKAGING: () => packComplete(id),
            SHIPPED: () => shipOrder(id),
            DELIVERED: () => deliverOrder(id),
            RETURNED: () => returnOrder(id),
            CANCELLED: () => cancelOrder(id),
        };
        await runAction(
            callers[target] || (() => updateSalesOrderStatus(id, target)),
            `${meta.label || target} applied`,
        );
    };

    const submitHold = async () => {
        await runAction(() => holdOrder(id, dialogState.reason), 'Order placed on hold');
        setActiveDialog(null);
    };

    const submitConfirm = async () => {
        await runAction(
            () => confirmOrder(id, {
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
        <div className="flex-1 overflow-y-auto bg-background-light p-6 dark:bg-background-dark">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
                {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}

                <div className="flex items-center justify-between gap-3">
                    <Button variant="ghost" onClick={() => navigate('/orders')}>← Back to orders</Button>
                    {detail ? (
                        <Button variant="secondary" onClick={loadDetail}>Refresh</Button>
                    ) : null}
                </div>

                {detailLoading || !detail ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        {detailLoading ? 'Loading…' : 'Order not found.'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <HeaderCard order={detail} />
                        <CustomerCard order={detail} />
                        <FulfillmentCard order={detail} onSteadfastReturn={handleSteadfastReturn} />
                        <ItemsCard order={detail} />
                        <ActionsCard transitions={transitions} busy={busy} onAction={handleAction} />
                    </div>
                )}

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

export default OrdersDetail;

import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Input, Select } from '../../components/common';
import {
    COURIER_DISPATCH_OPTIONS,
    COURIER_PROVIDER_OPTIONS,
    downloadTextFile,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getDeliveryReviewVariant,
    getRmaStatusVariant,
    getSalesOrderStatusVariant,
    getShipmentStatusVariant,
} from '../Sales/utils';

const createRmaItems = (shipment) => (shipment?.items || []).map((item) => ({
    salesOrderItemId: item.salesOrderItemId,
    sku: item.sku,
    quantity: 0,
    reason: '',
}));

const humanize = (value) => {
    if (!value) return '-';
    return String(value).replaceAll('_', ' ');
};

const describeShipmentNextStep = (shipment) => {
    const dispatchStatus = shipment.courierDispatchStatus || 'UNASSIGNED';

    if (['PENDING', 'DISPUTED'].includes(shipment.deliveryReviewStatus)) {
        return shipment.deliveryReviewStatus === 'DISPUTED' ? 'Resolve disputed delivery outcome' : 'Review proof and close delivery review';
    }
    if (!shipment.courierProvider) {
        return 'Assign courier provider';
    }
    if (dispatchStatus === 'UNASSIGNED') {
        return 'Book courier handoff';
    }
    if (['BOOKED', 'PICKUP_PENDING'].includes(dispatchStatus) && !shipment.courierReference) {
        return 'Capture courier reference';
    }
    if (['BOOKED', 'PICKUP_PENDING'].includes(dispatchStatus)) {
        return 'Confirm pickup handoff';
    }
    if (['PICKED_UP', 'IN_TRANSIT'].includes(dispatchStatus)) {
        return 'Monitor or sync courier movement';
    }
    if (dispatchStatus === 'OUT_FOR_DELIVERY') {
        return 'Watch final-mile outcome';
    }
    if (dispatchStatus === 'DELIVERY_FAILED') {
        return 'Reschedule or contact customer';
    }
    if (dispatchStatus === 'RETURNED') {
        return 'Inspect return and reopen order path';
    }
    return 'Review shipment timeline';
};

const FulfillmentOrderDetailScreen = ({
    salesOrder,
    shipment,
    relatedShipments,
    relatedRmas,
    queueLabel,
    loading,
    onBack,
    onSelectShipment,
    onUpdateTracking,
    onGenerateLabel,
    onConfirmDelivery,
    onDownloadDeliveryNote,
    onCreateRma,
    onOpenRma,
    onBookSteadfast,
    onSyncSteadfast,
    onApproveDelivery,
    onDisputeDelivery,
}) => {
    const [trackingForm, setTrackingForm] = useState({
        carrier: '',
        courierProvider: '',
        courierService: '',
        courierReference: '',
        courierDispatchStatus: '',
        trackingNumber: '',
        trackingUrl: '',
        cashOnDeliveryAmount: '',
        deliveryFee: '',
        lastCourierEvent: '',
    });
    const [rmaForm, setRmaForm] = useState({ reason: '', notes: '', items: [] });
    const [reviewReason, setReviewReason] = useState('');
    const [showAdvancedCourierDesk, setShowAdvancedCourierDesk] = useState(false);

    useEffect(() => {
        setTrackingForm({
            carrier: shipment?.carrier || '',
            courierProvider: shipment?.courierProvider || '',
            courierService: shipment?.courierService || '',
            courierReference: shipment?.courierReference || '',
            courierDispatchStatus: shipment?.courierDispatchStatus || '',
            trackingNumber: shipment?.trackingNumber || '',
            trackingUrl: shipment?.trackingUrl || '',
            cashOnDeliveryAmount: shipment?.cashOnDeliveryAmount ?? '',
            deliveryFee: shipment?.deliveryFee ?? '',
            lastCourierEvent: shipment?.lastCourierEvent || '',
        });
        setRmaForm({ reason: '', notes: '', items: createRmaItems(shipment) });
        setReviewReason(shipment?.deliveryReviewReason || '');
        setShowAdvancedCourierDesk(false);
    }, [shipment]);

    if (!shipment || !salesOrder) {
        return (
            <Card title="Loading fulfillment detail" subtitle="Pulling the latest order, shipment, and return context.">
                <div className="py-8 text-sm text-slate-500 dark:text-slate-400">{loading ? 'Loading detail...' : 'Select a shipment from a queue to inspect the full fulfillment detail.'}</div>
            </Card>
        );
    }

    const downloadDeliveryNote = async () => {
        const data = await onDownloadDeliveryNote(shipment.id);
        downloadTextFile(data.note, `${shipment.shipmentNumber}-delivery-note.txt`);
    };

    const saveCourierDesk = async (overrides = {}) => {
        await onUpdateTracking(shipment.id, {
            ...trackingForm,
            ...overrides,
            cashOnDeliveryAmount: trackingForm.cashOnDeliveryAmount === '' ? null : Number(trackingForm.cashOnDeliveryAmount),
            deliveryFee: trackingForm.deliveryFee === '' ? null : Number(trackingForm.deliveryFee),
            lastCourierSyncAt: new Date().toISOString(),
        });
    };

    const createReturn = async () => {
        const items = rmaForm.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({ salesOrderItemId: item.salesOrderItemId, quantity: Number(item.quantity), reason: item.reason || null }));
        if (!items.length) return;
        await onCreateRma({ salesOrderId: shipment.salesOrderId, shipmentId: shipment.id, reason: rmaForm.reason || null, notes: rmaForm.notes || null, items });
        setRmaForm({ reason: '', notes: '', items: createRmaItems(shipment) });
    };

    const approveDeliveryReview = async () => {
        await onApproveDelivery(shipment.id, { reason: reviewReason || shipment.deliveryReviewReason || null });
    };

    const disputeDeliveryReview = async () => {
        await onDisputeDelivery(shipment.id, { reason: reviewReason || null });
    };

    const quickStageActions = [
        { label: 'Book Courier', status: 'BOOKED' },
        { label: 'Mark Picked Up', status: 'PICKED_UP' },
        { label: 'Out For Delivery', status: 'OUT_FOR_DELIVERY' },
        { label: 'Delivery Failed', status: 'DELIVERY_FAILED', variant: 'secondary' },
    ];

    const dispatchStatus = trackingForm.courierDispatchStatus || shipment.courierDispatchStatus || 'UNASSIGNED';
    const isSteadfast = trackingForm.courierProvider === 'STEADFAST';
    const hasCourierReference = Boolean(shipment.courierReference || trackingForm.courierReference);
    const reviewStatus = shipment.deliveryReviewStatus || 'NOT_REQUIRED';
    const reviewOpen = ['PENDING', 'DISPUTED'].includes(reviewStatus);
    const timeline = Array.isArray(shipment.timeline) ? shipment.timeline : [];

    const nextAction = (() => {
        if (reviewOpen) {
            return {
                label: 'Approve Delivery Review',
                helper: 'Close the internal review if courier proof and customer outcome line up.',
                run: () => approveDeliveryReview(),
            };
        }

        if (shipment.status !== 'DELIVERED' && isSteadfast && !hasCourierReference) {
            return {
                label: 'Pack Done & Book Steadfast',
                helper: 'Creates the courier booking and tracking reference in one step.',
                run: () => onBookSteadfast(shipment.id),
            };
        }

        if (shipment.status === 'DELIVERED') {
            return {
                label: 'Sync Courier Status',
                helper: 'Recheck the courier feed if the delivered outcome changes later.',
                run: () => (isSteadfast ? onSyncSteadfast(shipment.id) : saveCourierDesk()),
            };
        }

        if (['UNASSIGNED', 'BOOKED', 'PICKUP_PENDING'].includes(dispatchStatus)) {
            return {
                label: 'Mark Picked Up',
                helper: 'Use after parcel handoff to rider at pickup.',
                run: () => saveCourierDesk({ courierDispatchStatus: 'PICKED_UP' }),
            };
        }

        if (['PICKED_UP', 'IN_TRANSIT'].includes(dispatchStatus)) {
            return {
                label: 'Mark Out For Delivery',
                helper: 'Use when courier confirms final-mile dispatch.',
                run: () => saveCourierDesk({ courierDispatchStatus: 'OUT_FOR_DELIVERY' }),
            };
        }

        if (dispatchStatus === 'OUT_FOR_DELIVERY') {
            return {
                label: 'Confirm Delivered',
                helper: 'Use when delivery proof is received.',
                run: () => onConfirmDelivery(shipment.id),
            };
        }

        return {
            label: 'Sync Courier Status',
            helper: 'Pull latest delivery state from courier.',
            run: () => (isSteadfast ? onSyncSteadfast(shipment.id) : saveCourierDesk()),
        };
    })();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" onClick={onBack}>Back to queue</Button>
                        <Badge variant="default">{queueLabel || 'Queue detail'}</Badge>
                        <Badge variant={getSalesOrderStatusVariant(salesOrder.status)}>{salesOrder.status}</Badge>
                        <Badge variant={getShipmentStatusVariant(shipment.status)}>{shipment.status}</Badge>
                        <Badge variant={getCourierDispatchVariant(shipment.courierDispatchStatus)}>{shipment.courierDispatchStatus || 'UNASSIGNED'}</Badge>
                        {reviewStatus !== 'NOT_REQUIRED' ? <Badge variant={getDeliveryReviewVariant(reviewStatus)}>{reviewStatus}</Badge> : null}
                    </div>
                    <h2 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{salesOrder.soNumber}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{salesOrder.customerName} • {salesOrder.warehouseName || 'No warehouse'} • Expected delivery {formatDate(salesOrder.expectedDeliveryDate)}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Shipment {shipment.shipmentNumber} • {describeShipmentNextStep(shipment)}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{salesOrder.notes || 'No order notes recorded.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 xl:min-w-[320px]">
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Order Value</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(salesOrder.totalAmount, salesOrder.currency)}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Line Count</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{salesOrder.items?.length || 0}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Customer</p>
                        <div className="mt-2 text-lg font-black text-slate-900 dark:text-white">{salesOrder.customerName}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Current Shipment</p>
                        <div className="mt-2 text-lg font-black text-slate-900 dark:text-white">{shipment.shipmentNumber}</div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <div className="space-y-6">
                    <Card padding="none" className="overflow-hidden" title="Ordered Items" subtitle="Customer-facing order lines and the fulfillment quantities already committed.">
                        <DataTable
                            columns={[
                                { key: 'productVariantName', header: 'Variant', render: (value, row) => <div><div className="font-semibold text-slate-900 dark:text-white">{row.sku || value}</div><div className="text-xs text-slate-500 dark:text-slate-400">{value}</div></div> },
                                { key: 'quantity', header: 'Ordered Qty', render: (value) => formatNumber(value) },
                                { key: 'shippedQuantity', header: 'Shipped Qty', render: (value) => formatNumber(value) },
                                { key: 'unitPrice', header: 'Unit Price', render: (value) => formatCurrency(value, salesOrder.currency) },
                                { key: 'totalPrice', header: 'Line Total', render: (value) => formatCurrency(value, salesOrder.currency) },
                            ]}
                            data={salesOrder.items || []}
                            emptyMessage="No order lines available."
                        />
                    </Card>

                    <Card title="Shipment Execution" subtitle="Primary courier action plus advanced controls for exception handling.">
                        <div className="space-y-5">
                            {nextAction ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Primary next action</p>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{nextAction.label}</p>
                                            <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90">{nextAction.helper}</p>
                                        </div>
                                        <Button disabled={loading} onClick={nextAction.run}>{nextAction.label}</Button>
                                    </div>
                                </div>
                            ) : null}

                            {trackingForm.courierProvider === 'STEADFAST' && (
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-800 dark:bg-indigo-900/30">
                                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Steadfast</span>
                                    {!shipment.courierReference ? (
                                        <Button size="sm" disabled={loading} onClick={() => onBookSteadfast(shipment.id)}>Book with Steadfast</Button>
                                    ) : (
                                        <Button size="sm" variant="secondary" disabled={loading} onClick={() => onSyncSteadfast(shipment.id)}>Sync Status</Button>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => onGenerateLabel(shipment.id)}>Generate Label</Button>
                                <Button variant="secondary" onClick={downloadDeliveryNote}>Delivery Note</Button>
                                {shipment.status !== 'DELIVERED' ? <Button onClick={() => onConfirmDelivery(shipment.id)}>Confirm Delivery</Button> : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowAdvancedCourierDesk((current) => !current)}
                                >
                                    {showAdvancedCourierDesk ? 'Hide Advanced Controls' : 'Show Advanced Controls'}
                                </Button>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Use advanced mode only for exceptions or corrections.</span>
                            </div>

                            {showAdvancedCourierDesk ? (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {quickStageActions.map((action) => (
                                            <Button
                                                key={action.status}
                                                variant={action.variant || 'secondary'}
                                                disabled={loading}
                                                onClick={() => saveCourierDesk({ courierDispatchStatus: action.status })}
                                            >
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <Select
                                            label="Courier Provider"
                                            value={trackingForm.courierProvider}
                                            onChange={(event) => setTrackingForm((current) => ({ ...current, courierProvider: event.target.value }))}
                                            options={COURIER_PROVIDER_OPTIONS}
                                            placeholder="Choose provider"
                                        />
                                        <Input label="Carrier Label" value={trackingForm.carrier} onChange={(event) => setTrackingForm((current) => ({ ...current, carrier: event.target.value }))} />
                                        <Input label="Courier Service" value={trackingForm.courierService} onChange={(event) => setTrackingForm((current) => ({ ...current, courierService: event.target.value }))} />
                                        <Input label="Courier Reference" value={trackingForm.courierReference} onChange={(event) => setTrackingForm((current) => ({ ...current, courierReference: event.target.value }))} />
                                        <Select
                                            label="Dispatch Stage"
                                            value={trackingForm.courierDispatchStatus}
                                            onChange={(event) => setTrackingForm((current) => ({ ...current, courierDispatchStatus: event.target.value }))}
                                            options={COURIER_DISPATCH_OPTIONS}
                                            placeholder="Select stage"
                                        />
                                        <Input label="Tracking Number" value={trackingForm.trackingNumber} onChange={(event) => setTrackingForm((current) => ({ ...current, trackingNumber: event.target.value }))} />
                                        <Input label="Tracking URL" value={trackingForm.trackingUrl} onChange={(event) => setTrackingForm((current) => ({ ...current, trackingUrl: event.target.value }))} />
                                        <Input label="Last Courier Event" value={trackingForm.lastCourierEvent} onChange={(event) => setTrackingForm((current) => ({ ...current, lastCourierEvent: event.target.value }))} />
                                        <Input label="COD Amount" type="number" min="0" step="0.01" value={trackingForm.cashOnDeliveryAmount} onChange={(event) => setTrackingForm((current) => ({ ...current, cashOnDeliveryAmount: event.target.value }))} />
                                        <Input label="Delivery Fee" type="number" min="0" step="0.01" value={trackingForm.deliveryFee} onChange={(event) => setTrackingForm((current) => ({ ...current, deliveryFee: event.target.value }))} />
                                        <div className="md:col-span-2 xl:col-span-2 flex items-end">
                                            <Button onClick={() => saveCourierDesk()} disabled={loading}>Save Courier Desk</Button>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </Card>

                    <Card title="Delivery Review" subtitle="Internal exception handling for ambiguous delivery outcomes and proof-of-delivery checks.">
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review Status</div>
                                    <div className="mt-2"><Badge variant={getDeliveryReviewVariant(reviewStatus)}>{reviewStatus}</Badge></div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review Requested</div>
                                    <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.deliveryReviewRequestedAt)}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review Resolved</div>
                                    <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.deliveryReviewResolvedAt)}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Proof Captured</div>
                                    <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.proofOfDeliveryCapturedAt)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recipient</div>
                                    <div className="mt-2 font-semibold text-slate-900 dark:text-white">{shipment.proofOfDeliveryRecipientName || 'Not captured'}</div>
                                    <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">{shipment.deliveryReviewReason || 'No active review note recorded yet.'}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operator Action</div>
                                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use this note to capture why the delivery is being disputed or what cleared the review.</div>
                                    <div className="mt-3">
                                        <Input label="Review note / dispute reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {shipment.proofOfDeliveryUrl ? <Button variant="secondary" onClick={() => window.open(shipment.proofOfDeliveryUrl, '_blank', 'noopener,noreferrer')}>Open Proof Of Delivery</Button> : null}
                                <Button variant="secondary" disabled={loading || reviewStatus === 'APPROVED'} onClick={approveDeliveryReview}>Approve Delivery</Button>
                                <Button disabled={loading || !reviewReason.trim()} onClick={disputeDeliveryReview}>Mark Disputed</Button>
                            </div>
                        </div>
                    </Card>

                    <Card title="Shipment Timeline" subtitle="Carrier events, internal review milestones, and proof-of-delivery history in one stream.">
                        <div className="space-y-3">
                            {timeline.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Timeline events will appear here after shipment creation and courier updates.</p>
                            ) : timeline.map((entry, index) => (
                                <div key={`${entry.id || entry.eventAt || index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{entry.summary || humanize(entry.eventType)}</div>
                                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDateTime(entry.eventAt)} • {entry.eventSource || 'system'}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {entry.courierDispatchStatus ? <Badge variant={getCourierDispatchVariant(entry.courierDispatchStatus)}>{entry.courierDispatchStatus}</Badge> : null}
                                            {entry.deliveryReviewStatus && entry.deliveryReviewStatus !== 'NOT_REQUIRED' ? <Badge variant={getDeliveryReviewVariant(entry.deliveryReviewStatus)}>{entry.deliveryReviewStatus}</Badge> : null}
                                        </div>
                                    </div>
                                    {entry.details ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{entry.details}</p> : null}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Dispatch Timeline" subtitle="Operational timestamps captured across booking, pickup, handoff, and proof of delivery">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pickup Requested</div>
                                <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.pickupRequestedAt)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Picked Up</div>
                                <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.pickedUpAt)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Out For Delivery</div>
                                <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.outForDeliveryAt)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Last Courier Sync</div>
                                <div className="mt-2 font-semibold text-slate-900 dark:text-white">{formatDateTime(shipment.lastCourierSyncAt)}</div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Create Return" subtitle="Open a customer return against the currently selected shipment when a commercial exception must be reversed.">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Input label="Return Reason" value={rmaForm.reason} onChange={(event) => setRmaForm((current) => ({ ...current, reason: event.target.value }))} />
                                <Input label="Notes" value={rmaForm.notes} onChange={(event) => setRmaForm((current) => ({ ...current, notes: event.target.value }))} />
                            </div>
                            {(rmaForm.items || []).map((item) => (
                                <div key={item.salesOrderItemId} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-12">
                                    <div className="lg:col-span-5">
                                        <div className="font-semibold text-slate-900 dark:text-white">{item.sku}</div>
                                    </div>
                                    <Input className="lg:col-span-2" label="Return Qty" type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => setRmaForm((current) => ({ ...current, items: current.items.map((entry) => entry.salesOrderItemId === item.salesOrderItemId ? { ...entry, quantity: event.target.value } : entry) }))} />
                                    <Input className="lg:col-span-5" label="Line Reason" value={item.reason} onChange={(event) => setRmaForm((current) => ({ ...current, items: current.items.map((entry) => entry.salesOrderItemId === item.salesOrderItemId ? { ...entry, reason: event.target.value } : entry) }))} />
                                </div>
                            ))}
                            <div className="flex justify-end">
                                <Button onClick={createReturn} disabled={loading}>Create RMA</Button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card padding="none" className="overflow-hidden" title="Related Shipments" subtitle="All shipment splits tied to this order. Use these rows to switch the active execution context.">
                        <DataTable
                            columns={[
                                { key: 'shipmentNumber', header: 'Shipment' },
                                { key: 'courierDispatchStatus', header: 'Stage', render: (value) => <Badge variant={getCourierDispatchVariant(value)}>{value || 'UNASSIGNED'}</Badge> },
                                { key: 'deliveryReviewStatus', header: 'Review', render: (value) => value && value !== 'NOT_REQUIRED' ? <Badge variant={getDeliveryReviewVariant(value)}>{value}</Badge> : 'Clear' },
                                { key: 'lastCourierEvent', header: 'Last Signal', render: (value) => value || '-' },
                            ]}
                            data={relatedShipments || []}
                            emptyMessage="No related shipments available."
                            onRowClick={onSelectShipment}
                        />
                    </Card>

                    <Card padding="none" className="overflow-hidden" title="Shipment Items" subtitle="Line quantities physically assigned to the selected shipment.">
                        <DataTable
                            columns={[
                                { key: 'sku', header: 'Variant' },
                                { key: 'quantity', header: 'Shipped Qty', render: (value) => formatNumber(value) },
                            ]}
                            data={shipment.items || []}
                            emptyMessage="No shipment items available."
                        />
                    </Card>

                    <Card padding="none" className="overflow-hidden" title="Related Returns" subtitle="Return authorizations already raised against this order or shipment.">
                        <DataTable
                            columns={[
                                { key: 'rmaNumber', header: 'RMA' },
                                { key: 'shipmentNumber', header: 'Shipment', render: (value) => value || 'Order level' },
                                { key: 'status', header: 'Status', render: (value) => <Badge variant={getRmaStatusVariant(value)}>{value}</Badge> },
                                { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
                            ]}
                            data={relatedRmas || []}
                            emptyMessage="No RMAs linked to this order."
                            onRowClick={onOpenRma}
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FulfillmentOrderDetailScreen;
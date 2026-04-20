import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Input, Modal, Select } from '../../components/common';
import {
    COURIER_DISPATCH_OPTIONS,
    COURIER_PROVIDER_OPTIONS,
    downloadTextFile,
    formatCurrency,
    formatDateTime,
    formatNumber,
    getCourierDispatchVariant,
    getRmaStatusVariant,
    getShipmentStatusVariant,
} from '../Sales/utils';

const createRmaItems = (shipment) => (shipment?.items || []).map((item) => ({
    salesOrderItemId: item.salesOrderItemId,
    sku: item.sku,
    quantity: 0,
    reason: '',
}));

const ShipmentDetailModal = ({ shipment, relatedRmas, isOpen, onClose, onUpdateTracking, onGenerateLabel, onConfirmDelivery, onDownloadDeliveryNote, onCreateRma, loading, onOpenRma }) => {
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
    }, [shipment]);

    if (!shipment) return null;

    const createReturn = async () => {
        const items = rmaForm.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({ salesOrderItemId: item.salesOrderItemId, quantity: Number(item.quantity), reason: item.reason || null }));
        if (!items.length) return;
        await onCreateRma({ salesOrderId: shipment.salesOrderId, shipmentId: shipment.id, reason: rmaForm.reason || null, notes: rmaForm.notes || null, items });
        setRmaForm({ reason: '', notes: '', items: createRmaItems(shipment) });
    };

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

    const quickStageActions = [
        { label: 'Book Courier', status: 'BOOKED' },
        { label: 'Mark Picked Up', status: 'PICKED_UP' },
        { label: 'Out For Delivery', status: 'OUT_FOR_DELIVERY' },
        { label: 'Delivery Failed', status: 'DELIVERY_FAILED', variant: 'secondary' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={shipment.shipmentNumber} size="xl">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{shipment.shipmentNumber}</h3>
                            <Badge variant={getShipmentStatusVariant(shipment.status)}>{shipment.status}</Badge>
                            <Badge variant={getCourierDispatchVariant(shipment.courierDispatchStatus)}>{shipment.courierDispatchStatus || 'UNASSIGNED'}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {shipment.soNumber} • {shipment.warehouseName} • {shipment.courierProvider || shipment.carrier || 'Courier pending'}
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Shipped {formatDateTime(shipment.shippedDate)} • Delivered {formatDateTime(shipment.deliveredDate)}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{shipment.notes || 'No shipment notes recorded.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => onGenerateLabel(shipment.id)}>Generate Label</Button>
                        <Button variant="secondary" onClick={downloadDeliveryNote}>Delivery Note</Button>
                        {shipment.status !== 'DELIVERED' ? <Button onClick={() => onConfirmDelivery(shipment.id)}>Confirm Delivery</Button> : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Courier Provider</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{shipment.courierProvider || '-'}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Courier Reference</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{shipment.courierReference || '-'}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">COD Amount</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(shipment.cashOnDeliveryAmount, 'BDT')}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Delivery Fee</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(shipment.deliveryFee, 'BDT')}</div>
                    </Card>
                </div>

                <Card title="Courier Desk" subtitle="Run provider booking, dispatch stage, tracking, and COD data from one panel">
                    <div className="space-y-5">
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

                <Card padding="none" className="overflow-hidden" title="Shipment Items" subtitle="Line quantities that physically left the warehouse in this shipment">
                    <DataTable
                        columns={[
                            { key: 'sku', header: 'Variant' },
                            { key: 'quantity', header: 'Shipped Qty', render: (value) => formatNumber(value) },
                        ]}
                        data={shipment.items || []}
                        emptyMessage="No shipment items available."
                    />
                </Card>

                <Card title="Return Merchandise Authorization" subtitle="Open a customer return against this shipment when commercial exceptions occur">
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

                <Card padding="none" className="overflow-hidden" title="Related Returns" subtitle="RMAs already opened against this shipment">
                    <DataTable
                        columns={[
                            { key: 'rmaNumber', header: 'RMA' },
                            { key: 'status', header: 'Status', render: (value) => <Badge variant={getRmaStatusVariant(value)}>{value}</Badge> },
                            { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
                        ]}
                        data={relatedRmas}
                        emptyMessage="No RMAs linked to this shipment."
                        onRowClick={onOpenRma}
                    />
                </Card>
            </div>
        </Modal>
    );
};

export default ShipmentDetailModal;

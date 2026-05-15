import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, MetricCard, Modal, Select } from '../../components/common';
import { getWebhookEvents, getWebhookEvent, materializeWebhookEvent } from '../../services/webhookEventService';
import { getCustomers } from '../../services/customerService';
import { getWarehouses } from '../../services/warehouseService';

const STATUS_VARIANT = {
    RECEIVED: 'default',
    VERIFIED: 'info',
    PROCESSED: 'success',
    FAILED: 'danger',
    DUPLICATE: 'warning',
};

const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const prettyPayload = (raw) => {
    if (!raw) return '';
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
};

const OrderInbox = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ status: 'VERIFIED', source: '' });
    const [selected, setSelected] = useState(null);
    const [materializing, setMaterializing] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [materializeForm, setMaterializeForm] = useState({ customerId: '', warehouseId: '', autoMapItemsBySku: true });
    const [materializeBusy, setMaterializeBusy] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const load = async () => {
        try {
            setLoading(true);
            const data = await getWebhookEvents(filters);
            setEvents(toList(data));
        } catch (e) {
            showAlert('error', e.message || 'Failed to load webhook events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.status, filters.source]);

    const summary = useMemo(() => ({
        total: events.length,
        verified: events.filter((e) => e.status === 'VERIFIED').length,
        processed: events.filter((e) => e.status === 'PROCESSED').length,
        failed: events.filter((e) => e.status === 'FAILED').length,
    }), [events]);

    const openDetail = async (row) => {
        try {
            const full = await getWebhookEvent(row.id);
            setSelected(full.data || full);
        } catch (e) {
            showAlert('error', e.message || 'Failed to load event');
        }
    };

    const openMaterialize = async (row) => {
        setMaterializing(row);
        setMaterializeForm({ customerId: '', warehouseId: '', autoMapItemsBySku: true });
        if (customers.length === 0 || warehouses.length === 0) {
            try {
                const [customerData, warehouseData] = await Promise.all([getCustomers(), getWarehouses()]);
                setCustomers(toList(customerData));
                setWarehouses(toList(warehouseData));
            } catch (e) {
                showAlert('error', e.message || 'Failed to load customers/warehouses');
            }
        }
    };

    const submitMaterialize = async () => {
        if (!materializeForm.customerId || !materializeForm.warehouseId) {
            showAlert('error', 'Customer and warehouse are required');
            return;
        }
        try {
            setMaterializeBusy(true);
            const result = await materializeWebhookEvent(materializing.id, {
                customerId: materializeForm.customerId,
                warehouseId: materializeForm.warehouseId,
                autoMapItemsBySku: materializeForm.autoMapItemsBySku,
            });
            const soNumber = result?.soNumber || result?.data?.soNumber || 'created';
            showAlert('success', `Sales order ${soNumber} created from webhook event`);
            setMaterializing(null);
            load();
        } catch (e) {
            showAlert('error', e.message || 'Materialize failed');
        } finally {
            setMaterializeBusy(false);
        }
    };

    const columns = [
        { key: 'source', header: 'Source', render: (v) => <Badge variant="info">{v}</Badge> },
        { key: 'topic', header: 'Topic' },
        { key: 'externalEventId', header: 'External ID' },
        { key: 'status', header: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v] || 'default'}>{v}</Badge> },
        { key: 'receivedAt', header: 'Received' },
        { key: 'salesOrderId', header: 'Order', render: (v, row) => v
            ? <span className="text-xs text-slate-500">linked</span>
            : (row.status === 'VERIFIED' || row.status === 'RECEIVED'
                ? <Button size="sm" variant="secondary" onClick={() => openMaterialize(row)}>Materialize</Button>
                : <span className="text-xs text-slate-400">—</span>) },
        { key: 'actions', header: '', render: (_, row) => <Button size="sm" variant="ghost" onClick={() => openDetail(row)}>View</Button> },
    ];

    return (
        <div className="space-y-6">
            {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}

            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Order inbox</h1>
                <p className="text-sm text-slate-500">Review inbound order events from Shopify and WooCommerce webhooks. Materialize them into Sales Orders once customer and warehouse are assigned.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard label="Events" value={summary.total} />
                <MetricCard label="Verified (awaiting)" value={summary.verified} />
                <MetricCard label="Processed" value={summary.processed} />
                <MetricCard label="Failed" value={summary.failed} />
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="flex flex-wrap gap-3 p-4">
                    <Select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'VERIFIED', label: 'Verified (awaiting)' },
                            { value: 'PROCESSED', label: 'Processed' },
                            { value: 'FAILED', label: 'Failed' },
                            { value: 'DUPLICATE', label: 'Duplicate' },
                        ]}
                    />
                    <Select
                        value={filters.source}
                        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                        options={[
                            { value: '', label: 'All sources' },
                            { value: 'SHOPIFY', label: 'Shopify' },
                            { value: 'WOOCOMMERCE', label: 'WooCommerce' },
                        ]}
                    />
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                </div>
                <DataTable columns={columns} data={events} loading={loading} emptyMessage="No webhook events." />
            </Card>

            {materializing ? (
                <Modal isOpen onClose={() => setMaterializing(null)} title={`Materialize ${materializing.source} ${materializing.externalEventId || ''}`} size="lg">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Pick a customer and warehouse for the inbound order. Items are auto-mapped from the payload by SKU. If a SKU has no matching ProductVariant, materialize will fail — fix the variant mapping then retry.
                        </p>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</label>
                            <select
                                value={materializeForm.customerId}
                                onChange={(e) => setMaterializeForm({ ...materializeForm, customerId: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="">— Select customer —</option>
                                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phoneNumber ? `(${c.phoneNumber})` : ''}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Warehouse</label>
                            <select
                                value={materializeForm.warehouseId}
                                onChange={(e) => setMaterializeForm({ ...materializeForm, warehouseId: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="">— Select warehouse —</option>
                                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={materializeForm.autoMapItemsBySku}
                                   onChange={(e) => setMaterializeForm({ ...materializeForm, autoMapItemsBySku: e.target.checked })} />
                            Auto-map line items by SKU
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setMaterializing(null)} disabled={materializeBusy}>Cancel</Button>
                            <Button onClick={submitMaterialize} disabled={materializeBusy}>{materializeBusy ? 'Creating…' : 'Create order'}</Button>
                        </div>
                    </div>
                </Modal>
            ) : null}

            {selected ? (
                <Modal isOpen onClose={() => setSelected(null)} title={`Webhook event — ${selected.source}`} size="xl">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-slate-500">Topic:</span> {selected.topic || '-'}</div>
                            <div><span className="text-slate-500">External ID:</span> {selected.externalEventId || '-'}</div>
                            <div><span className="text-slate-500">Status:</span> <Badge variant={STATUS_VARIANT[selected.status] || 'default'}>{selected.status}</Badge></div>
                            <div><span className="text-slate-500">Received:</span> {selected.receivedAt}</div>
                            <div className="col-span-2"><span className="text-slate-500">Error:</span> {selected.error || '-'}</div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Raw payload</p>
                            <pre className="mt-2 max-h-[400px] overflow-auto rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-900">{prettyPayload(selected.payload)}</pre>
                        </div>
                    </div>
                </Modal>
            ) : null}
        </div>
    );
};

export default OrderInbox;

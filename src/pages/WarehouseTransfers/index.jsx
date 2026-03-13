import React, { useEffect, useMemo, useState } from 'react';
import { createWarehouseTransfer } from '../../services/warehouseTransferService';
import { getWarehouses } from '../../services/warehouseService';
import { Alert, Button, Card, InfoTip, Input, MetricCard, Select } from '../../components/common';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const emptyItem = { productVariantId: '', quantity: '', unitCost: '', sourceStorageLocationId: '', destinationStorageLocationId: '' };

const WarehouseTransfers = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        reference: '',
        notes: '',
        items: [emptyItem],
    });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const handleItemChange = (index, field, value) => {
        setFormData((current) => ({
            ...current,
            items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
        }));
    };

    const addItem = () => {
        setFormData((current) => ({ ...current, items: [...current.items, emptyItem] }));
    };

    const removeItem = (index) => {
        setFormData((current) => {
            const items = current.items.filter((_, itemIndex) => itemIndex !== index);
            return { ...current, items: items.length ? items : [emptyItem] };
        });
    };

    const resetForm = () => {
        setFormData({
            sourceWarehouseId: '',
            destinationWarehouseId: '',
            reference: '',
            notes: '',
            items: [emptyItem],
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.sourceWarehouseId || !formData.destinationWarehouseId) {
            showAlert('error', 'Source and destination warehouses are required');
            return;
        }
        if (formData.sourceWarehouseId === formData.destinationWarehouseId) {
            showAlert('error', 'Source and destination warehouses must be different');
            return;
        }
        if (formData.items.some((item) => !item.productVariantId || Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity)))) {
            showAlert('error', 'Each transfer line needs a product variant and a positive quantity');
            return;
        }

        try {
            setLoading(true);
            await createWarehouseTransfer({
                sourceWarehouseId: formData.sourceWarehouseId,
                destinationWarehouseId: formData.destinationWarehouseId,
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                items: formData.items.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: Number(item.quantity),
                    unitCost: item.unitCost === '' ? null : Number(item.unitCost),
                    sourceStorageLocationId: item.sourceStorageLocationId || null,
                    destinationStorageLocationId: item.destinationStorageLocationId || null,
                })),
            });
            showAlert('success', 'Warehouse transfer created successfully');
            resetForm();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create transfer');
        } finally {
            setLoading(false);
        }
    };

    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })), [warehouses]);
    const totalQuantity = useMemo(() => formData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [formData.items]);

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_40%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.16),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                Warehouse Transfers
                            </span>
                            <InfoTip text="Transfers create and confirm a stock transaction that moves inventory from one warehouse to another in a single guided flow." />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Move stock between warehouses with fewer mistakes.</h1>
                        <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Set the route, add line items, and capture location context so transfer execution and audit review stay aligned.
                        </p>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard title="Available Warehouses" value={formatNumber(warehouses.length)} caption="Warehouses that can participate in transfer routing" icon="warehouse" tone="blue" info="This count is based on warehouses currently loaded into the page." />
                    <MetricCard title="Transfer Lines" value={formatNumber(formData.items.length)} caption="Distinct SKU lines in the draft transfer" icon="playlist_add" tone="emerald" info="Each line becomes one item in the transfer payload." />
                    <MetricCard title="Draft Quantity" value={formatNumber(totalQuantity)} caption="Total units currently staged in this transfer" icon="swap_horiz" tone="amber" info="Use this as a quick sense-check before posting the transfer." />
                </div>

                <Card title="Transfer Builder" subtitle="Create a warehouse-to-warehouse stock movement" action={<InfoTip text="Complete the route first, then add the exact product variant IDs and optional storage location IDs for the move." />}>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Select label="Source warehouse" value={formData.sourceWarehouseId} onChange={(event) => setFormData((current) => ({ ...current, sourceWarehouseId: event.target.value }))} options={warehouseOptions} placeholder="Select source warehouse" required />
                            <Select label="Destination warehouse" value={formData.destinationWarehouseId} onChange={(event) => setFormData((current) => ({ ...current, destinationWarehouseId: event.target.value }))} options={warehouseOptions} placeholder="Select destination warehouse" required />
                            <Input label="Reference" value={formData.reference} onChange={(event) => setFormData((current) => ({ ...current, reference: event.target.value }))} placeholder="Transfer note or dispatch number" />
                            <Input label="Notes" value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} placeholder="Operational handoff notes" />
                        </div>

                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <span>Transfer lines</span>
                                    <InfoTip text="Source and destination location IDs are optional but help execution teams move stock to the exact bin, rack, or zone." />
                                </div>
                                <Button variant="secondary" size="sm" type="button" onClick={addItem}>Add Line</Button>
                            </div>

                            {formData.items.map((item, index) => (
                                <div key={`${item.productVariantId}-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
                                    <Input label={index === 0 ? 'Product variant ID' : undefined} value={item.productVariantId} onChange={(event) => handleItemChange(index, 'productVariantId', event.target.value)} placeholder="Exact variant ID" required />
                                    <Input label={index === 0 ? 'Quantity' : undefined} type="number" min="0" value={item.quantity} onChange={(event) => handleItemChange(index, 'quantity', event.target.value)} placeholder="Positive quantity" required />
                                    <Input label={index === 0 ? 'Unit cost' : undefined} type="number" min="0" value={item.unitCost} onChange={(event) => handleItemChange(index, 'unitCost', event.target.value)} placeholder="Optional" />
                                    <Input label={index === 0 ? 'Source location ID' : undefined} value={item.sourceStorageLocationId} onChange={(event) => handleItemChange(index, 'sourceStorageLocationId', event.target.value)} placeholder="Optional source bin" />
                                    <Input label={index === 0 ? 'Destination location ID' : undefined} value={item.destinationStorageLocationId} onChange={(event) => handleItemChange(index, 'destinationStorageLocationId', event.target.value)} placeholder="Optional destination bin" />
                                    <div className="flex justify-end md:col-span-5">
                                        <Button variant="ghost" size="sm" type="button" className="text-red-600 dark:text-red-400" onClick={() => removeItem(index)}>Remove</Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" loading={loading}>Create Transfer</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default WarehouseTransfers;
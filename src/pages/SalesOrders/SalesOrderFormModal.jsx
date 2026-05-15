import React from 'react';
import { Button, Input, Modal, ProductVariantLookup, Select } from '../../components/common';
import { generateUUID } from '../../utils/uuid';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ value, label: value }));

const createLine = () => ({ id: generateUUID(), variant: null, quantity: 1, unitPrice: '' });

const SalesOrderFormModal = ({ isOpen, onClose, customers, warehouses, formData, setFormData, onSubmit, loading, isEditing, itemsOnly = false, editingStatus }) => {
    const updateLine = (lineId, field, value) => {
        setFormData((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === lineId ? { ...item, [field]: value } : item)),
        }));
    };

    const addLine = () => setFormData((current) => ({ ...current, items: [...current.items, createLine()] }));
    const removeLine = (lineId) => setFormData((current) => ({ ...current, items: current.items.filter((item) => item.id !== lineId) }));

    const title = isEditing ? (itemsOnly ? `Edit items — order is ${editingStatus}` : 'Edit Sales Order') : 'Create Sales Order';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
            <form className="space-y-6" onSubmit={onSubmit}>
                {itemsOnly ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
                        This order is <strong>{editingStatus}</strong>. Customer, warehouse, and metadata are locked — only line items can be changed. Reservations and totals will be recalculated on save.
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Select label="Customer" value={formData.customerId} onChange={(event) => setFormData((current) => ({ ...current, customerId: event.target.value }))} options={customers.map((customer) => ({ value: customer.id, label: customer.name }))} required disabled={itemsOnly} />
                    <Select label="Warehouse" value={formData.warehouseId} onChange={(event) => setFormData((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} required disabled={itemsOnly} />
                    <Input label="Expected Delivery" type="date" value={formData.expectedDeliveryDate} onChange={(event) => setFormData((current) => ({ ...current, expectedDeliveryDate: event.target.value }))} disabled={itemsOnly} />
                    <Select label="Priority" value={formData.priority} onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))} options={PRIORITY_OPTIONS} disabled={itemsOnly} />
                    <Input label="Currency" value={formData.currency} onChange={(event) => setFormData((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="md:col-span-2 lg:col-span-1" disabled={itemsOnly} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Order Notes</label>
                    <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                        disabled={itemsOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
                    />
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Lines</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Stage sellable variants, ordered quantities, and sell prices.</p>
                        </div>
                        <Button variant="secondary" onClick={addLine}>Add Line</Button>
                    </div>

                    {formData.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-12">
                            <ProductVariantLookup className="lg:col-span-6" label={`Variant ${index + 1}`} selectedVariant={item.variant} onSelect={(variant) => updateLine(item.id, 'variant', variant)} required />
                            <Input className="lg:col-span-2" label="Quantity" type="number" min="0.000001" step="0.01" value={item.quantity} onChange={(event) => updateLine(item.id, 'quantity', event.target.value)} required />
                            <Input className="lg:col-span-2" label="Unit Price" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateLine(item.id, 'unitPrice', event.target.value)} required />
                            <div className="flex items-end lg:col-span-2">
                                <Button variant="ghost" onClick={() => removeLine(item.id)} disabled={formData.items.length === 1}>Remove</Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading}>{isEditing ? (itemsOnly ? 'Save items' : 'Save Sales Order') : 'Create Sales Order'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default SalesOrderFormModal;
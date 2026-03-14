import React, { useState } from 'react';
import { Button, Input, Modal, ProductVariantLookup, Select } from '../../components/common';
import { generateUUID } from '../../utils/uuid';

const defaultItem = { id: generateUUID(), variant: null, quantity: 1, unitPrice: '' };

const PurchaseOrderFormModal = ({ isOpen, onClose, suppliers, formData, setFormData, onSubmit, loading, isEditing }) => {
    const [localError, setLocalError] = useState('');

    const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

    const updateItem = (id, changes) => {
        setFormData((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
        }));
    };

    const addItem = () => {
        setFormData((current) => ({ ...current, items: [...current.items, { ...defaultItem, id: generateUUID() }] }));
    };

    const removeItem = (id) => {
        setFormData((current) => ({
            ...current,
            items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
        }));
    };

    const submit = (event) => {
        event.preventDefault();
        const hasInvalidItem = formData.items.some((item) => !item.variant || !item.quantity || Number(item.quantity) <= 0 || item.unitPrice === '' || Number(item.unitPrice) < 0);
        if (hasInvalidItem) {
            setLocalError('Every PO line needs a product variant, quantity, and unit price.');
            return;
        }
        setLocalError('');
        onSubmit(event);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Update Purchase Order' : 'Create Purchase Order'} size="xl">
            <form className="space-y-5" onSubmit={submit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select label="Supplier" value={formData.supplierId} onChange={(event) => setFormData((current) => ({ ...current, supplierId: event.target.value }))} options={supplierOptions} required placeholder="Select supplier" />
                    <Input label="Expected delivery date" type="date" value={formData.expectedDeliveryDate} onChange={(event) => setFormData((current) => ({ ...current, expectedDeliveryDate: event.target.value }))} />
                    <Select label="Currency" value={formData.currency} onChange={(event) => setFormData((current) => ({ ...current, currency: event.target.value }))} options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]} placeholder="Select currency" />
                    <div />
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Operational Notes</label>
                    <textarea value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Supplier instructions, incoterms, or receiving notes" />
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">PO Line Items</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Build the commercial order that will drive receipt and valuation.</p>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={addItem}>Add Line</Button>
                    </div>

                    {formData.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[1.4fr_0.4fr_0.4fr_auto] md:items-end">
                            <ProductVariantLookup label={`Line ${index + 1}`} selectedVariant={item.variant} onSelect={(variant) => updateItem(item.id, { variant })} />
                            <Input label="Quantity" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: event.target.value })} />
                            <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })} />
                            <Button type="button" variant="ghost" onClick={() => removeItem(item.id)}>Remove</Button>
                        </div>
                    ))}
                </div>

                {localError ? <p className="text-sm text-red-500">{localError}</p> : null}

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading}>{isEditing ? 'Save Purchase Order' : 'Create Purchase Order'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PurchaseOrderFormModal;
import React, { useEffect, useState } from 'react';
import { Button, Input, Select } from '../../components/common';
import Field from './Field';
import {
    CODE_STATUSES,
    createCodeForm,
    inputClass,
    optionsFrom,
    toInputDateTime,
    toIntegerOrNull,
} from './constants';

const codeToFormState = (c) => ({
    discountId: c.discountId || '',
    code: c.code || '',
    status: c.status || 'ACTIVE',
    validFrom: toInputDateTime(c.validFrom),
    validTo: toInputDateTime(c.validTo),
    maxRedemptions: c.maxRedemptions ?? '',
    maxRedemptionsPerCustomer: c.maxRedemptionsPerCustomer ?? '',
    notes: c.notes || '',
});

// Drawer-style slide-in panel for create/edit discount code.
const CodeDrawer = ({
    isOpen,
    onClose,
    code, // existing code object when editing, null for create
    discountId, // fixed discount id (used in create when not selectable)
    discountOptions, // optional list when picker should be shown
    onSubmit, // async (payload, codeId) => void
    onAlert,
}) => {
    const [form, setForm] = useState(createCodeForm());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (code) {
            setForm(codeToFormState(code));
        } else {
            setForm({
                ...createCodeForm(),
                discountId: discountId || (discountOptions?.[0]?.value ?? ''),
            });
        }
    }, [isOpen, code, discountId, discountOptions]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !saving) onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, saving]);

    if (!isOpen) return null;

    const editingId = code?.id || null;
    const showDiscountPicker = Array.isArray(discountOptions) && discountOptions.length > 0;
    const resolvedDiscountId = form.discountId || discountId;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!resolvedDiscountId) {
            onAlert?.('error', 'Discount is required');
            return;
        }
        const payload = {
            code: form.code,
            status: form.status,
            validFrom: form.validFrom || null,
            validTo: form.validTo || null,
            maxRedemptions: toIntegerOrNull(form.maxRedemptions),
            maxRedemptionsPerCustomer: toIntegerOrNull(form.maxRedemptionsPerCustomer),
            notes: form.notes || null,
        };
        try {
            setSaving(true);
            await onSubmit(payload, editingId, resolvedDiscountId);
            onAlert?.('success', `Code ${editingId ? 'updated' : 'created'}`);
        } catch (error) {
            onAlert?.('error', error.message || 'Failed to save code');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => (saving ? null : onClose())}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingId ? 'Edit code' : 'Add code'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                        {showDiscountPicker && (
                            <Select
                                label="Discount"
                                required
                                value={form.discountId}
                                onChange={(e) => setForm((f) => ({ ...f, discountId: e.target.value }))}
                                options={discountOptions}
                                disabled={Boolean(editingId)}
                            />
                        )}
                        <Input
                            label="Code"
                            required
                            value={form.code}
                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                        />
                        <Select
                            label="Status"
                            value={form.status}
                            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                            options={optionsFrom(CODE_STATUSES)}
                        />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label="Valid From"
                                type="datetime-local"
                                value={form.validFrom}
                                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                            />
                            <Input
                                label="Valid To"
                                type="datetime-local"
                                value={form.validTo}
                                onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
                            />
                            <Input
                                label="Max Redemptions"
                                type="number"
                                value={form.maxRedemptions}
                                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                            />
                            <Input
                                label="Max Redemptions Per Customer"
                                type="number"
                                value={form.maxRedemptionsPerCustomer}
                                onChange={(e) => setForm((f) => ({ ...f, maxRedemptionsPerCustomer: e.target.value }))}
                            />
                        </div>
                        <Field label="Notes">
                            <textarea
                                className={inputClass}
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button type="submit" loading={saving}>
                            {editingId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </aside>
        </div>
    );
};

export default CodeDrawer;

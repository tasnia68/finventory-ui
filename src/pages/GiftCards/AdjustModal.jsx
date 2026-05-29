import React, { useEffect, useState } from 'react';
import {
    Button,
    Input,
    Modal,
    Select,
} from '../../components/common';
import { adjustGiftCard } from '../../services/giftCardService';

const ADJUSTMENT_TYPES = ['ISSUE', 'REDEEM', 'REFUND', 'ADJUSTMENT', 'EXPIRE', 'REVERSAL'];

const optionsFrom = (values) => values.map((v) => ({ value: v, label: v }));

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
};

const createAdjustForm = () => ({
    type: 'ADJUSTMENT',
    amount: '',
    reference: '',
});

const AdjustModal = ({ isOpen, onClose, giftCardId, onAdjusted }) => {
    const [form, setForm] = useState(createAdjustForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setForm(createAdjustForm());
            setError(null);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (saving) return;
        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!giftCardId) return;
        try {
            setSaving(true);
            setError(null);
            await adjustGiftCard(giftCardId, {
                type: form.type,
                amount: toNumberOrNull(form.amount),
                reference: form.reference || null,
            });
            setForm(createAdjustForm());
            onAdjusted?.();
        } catch (err) {
            setError(err.message || 'Failed to adjust');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Adjust Balance" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Select
                        label="Type"
                        value={form.type}
                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                        options={optionsFrom(ADJUSTMENT_TYPES)}
                    />
                    <Input
                        label="Amount"
                        required
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                    <Input
                        label="Reference"
                        value={form.reference}
                        onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                    />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" loading={saving}>Apply</Button>
                </div>
            </form>
        </Modal>
    );
};

export default AdjustModal;

import React, { useState } from 'react';
import {
    Button,
    Input,
    Modal,
    Select,
} from '../../components/common';
import { issueGiftCard } from '../../services/giftCardService';

const GIFT_CARD_SOURCES = ['MANUAL', 'PURCHASED', 'REFUND', 'REFERRAL_REWARD', 'PROMOTION'];

const optionsFrom = (values) => values.map((v) => ({ value: v, label: v }));

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
};

const createIssueForm = () => ({
    code: '',
    currency: 'USD',
    initialBalance: '',
    issuedToCustomerId: '',
    expiresAt: '',
    source: 'MANUAL',
    notes: '',
});

const IssueModal = ({ isOpen, onClose, onIssued, customerOptions = [] }) => {
    const [form, setForm] = useState(createIssueForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleClose = () => {
        if (saving) return;
        setForm(createIssueForm());
        setError(null);
        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            setError(null);
            const payload = {
                code: form.code || null,
                currency: form.currency,
                initialBalance: toNumberOrNull(form.initialBalance),
                issuedToCustomerId: form.issuedToCustomerId || null,
                expiresAt: form.expiresAt || null,
                source: form.source,
                notes: form.notes || null,
            };
            await issueGiftCard(payload);
            setForm(createIssueForm());
            onIssued?.();
        } catch (err) {
            setError(err.message || 'Failed to issue gift card');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Issue Gift Card" size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                        label="Code (optional)"
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                        placeholder="Server generates if blank"
                    />
                    <Input
                        label="Currency"
                        required
                        value={form.currency}
                        onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    />
                    <Input
                        label="Initial Balance"
                        required
                        type="number"
                        step="0.01"
                        value={form.initialBalance}
                        onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))}
                    />
                    <Select
                        label="Issued To Customer"
                        value={form.issuedToCustomerId}
                        onChange={(e) => setForm((f) => ({ ...f, issuedToCustomerId: e.target.value }))}
                        options={[{ value: '', label: '— none —' }, ...customerOptions]}
                        placeholder="— none —"
                    />
                    <Input
                        label="Expires At"
                        type="datetime-local"
                        value={form.expiresAt}
                        onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    />
                    <Select
                        label="Source"
                        value={form.source}
                        onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                        options={optionsFrom(GIFT_CARD_SOURCES)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                    <textarea
                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" loading={saving}>Issue</Button>
                </div>
            </form>
        </Modal>
    );
};

export default IssueModal;

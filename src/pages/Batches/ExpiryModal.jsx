import React, { useEffect, useState } from 'react';
import { Button, Input, Modal } from '../../components/common';
import { updateBatchExpiry } from '../../services/batchService';

const createForm = (batch) => ({
    manufacturingDate: batch?.manufacturingDate || '',
    expiryDate: batch?.expiryDate || '',
});

const ExpiryModal = ({ isOpen, onClose, batch, onUpdated }) => {
    const [form, setForm] = useState(createForm(batch));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setForm(createForm(batch));
            setError(null);
        }
    }, [isOpen, batch]);

    const handleClose = () => {
        if (saving) return;
        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!batch?.id) return;
        try {
            setSaving(true);
            setError(null);
            await updateBatchExpiry(batch.id, form);
            onUpdated?.();
        } catch (err) {
            setError(err.message || 'Failed to update expiry details');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Update Batch Dating${batch ? ` - ${batch.batchNumber}` : ''}`}
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                        {error}
                    </div>
                )}
                <Input
                    label="Manufacturing Date"
                    type="date"
                    value={form.manufacturingDate}
                    onChange={(event) => setForm((current) => ({ ...current, manufacturingDate: event.target.value }))}
                />
                <Input
                    label="Expiry Date"
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
                />
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" type="button" onClick={handleClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" loading={saving}>Save Dating</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ExpiryModal;

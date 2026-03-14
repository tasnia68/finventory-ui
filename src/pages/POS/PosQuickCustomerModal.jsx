import React, { useState } from 'react';
import { Button, Input, Modal } from '../../components/common';

const INITIAL_FORM = {
    name: '',
    phoneNumber: '',
};

const PosQuickCustomerModal = ({ isOpen, onClose, onCreate, loading }) => {
    const [form, setForm] = useState(INITIAL_FORM);

    const handleClose = () => {
        setForm(INITIAL_FORM);
        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await onCreate({
            name: form.name.trim(),
            contactName: form.name.trim(),
            phoneNumber: form.phoneNumber.trim() || null,
            category: 'OTHER',
            status: 'ACTIVE',
            isActive: true,
            creditLimit: 0,
        });
        setForm(INITIAL_FORM);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Quick Customer" size="md">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <Input
                    label="Customer Name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Walk-in name or customer name"
                    required
                />
                <Input
                    label="Phone Number"
                    value={form.phoneNumber}
                    onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    placeholder="Optional phone number"
                />
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" loading={loading} disabled={!form.name.trim()}>Save Customer</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PosQuickCustomerModal;
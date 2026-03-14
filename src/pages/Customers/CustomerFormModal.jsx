import React from 'react';
import { Button, Input, Modal, Select } from '../../components/common';

const CATEGORY_OPTIONS = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'ENTERPRISE', 'GOVERNMENT', 'OTHER'].map((value) => ({
    value,
    label: value.replaceAll('_', ' '),
}));

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'BLOCKED'].map((value) => ({
    value,
    label: value,
}));

const CustomerFormModal = ({ isOpen, onClose, formData, onChange, onSubmit, loading, isEditing }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Customer' : 'Create Customer'} size="lg">
            <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input label="Customer Name" value={formData.name} onChange={(event) => onChange('name', event.target.value)} required />
                    <Input label="Contact Name" value={formData.contactName} onChange={(event) => onChange('contactName', event.target.value)} />
                    <Input label="Email" type="email" value={formData.email} onChange={(event) => onChange('email', event.target.value)} />
                    <Input label="Phone" value={formData.phoneNumber} onChange={(event) => onChange('phoneNumber', event.target.value)} />
                    <Select label="Category" value={formData.category} onChange={(event) => onChange('category', event.target.value)} options={CATEGORY_OPTIONS} />
                    <Select label="Status" value={formData.status} onChange={(event) => onChange('status', event.target.value)} options={STATUS_OPTIONS} />
                    <Input label="Credit Limit" type="number" min="0" step="0.01" value={formData.creditLimit} onChange={(event) => onChange('creditLimit', event.target.value)} />
                    <Select
                        label="Commercial Activity"
                        value={String(formData.isActive)}
                        onChange={(event) => onChange('isActive', event.target.value === 'true')}
                        options={[
                            { value: 'true', label: 'Active' },
                            { value: 'false', label: 'Inactive' },
                        ]}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                    <textarea
                        rows={3}
                        value={formData.address}
                        onChange={(event) => onChange('address', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading}>{isEditing ? 'Save Customer' : 'Create Customer'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CustomerFormModal;
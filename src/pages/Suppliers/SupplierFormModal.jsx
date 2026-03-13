import React from 'react';
import { Button, Input, Modal, Select } from '../../components/common';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'INACTIVE', label: 'Inactive' },
];

const SupplierFormModal = ({ isOpen, onClose, formData, onChange, onSubmit, loading, isEditing }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Update Supplier' : 'Add Supplier'} size="lg">
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <Input label="Supplier name" value={formData.name} onChange={(event) => onChange('name', event.target.value)} required />
                <Input label="Contact name" value={formData.contactName} onChange={(event) => onChange('contactName', event.target.value)} />
                <Input label="Email" type="email" value={formData.email} onChange={(event) => onChange('email', event.target.value)} />
                <Input label="Phone number" value={formData.phoneNumber} onChange={(event) => onChange('phoneNumber', event.target.value)} />
                <Input label="Payment terms" value={formData.paymentTerms} onChange={(event) => onChange('paymentTerms', event.target.value)} placeholder="Net 30, COD, etc." />
                <Input label="Supplier rating" type="number" min="0" max="5" step="0.1" value={formData.rating} onChange={(event) => onChange('rating', event.target.value)} />
                <Select label="Status" value={formData.status} onChange={(event) => onChange('status', event.target.value)} options={STATUS_OPTIONS} placeholder="Select status" />
                <Select label="Active flag" value={String(formData.isActive)} onChange={(event) => onChange('isActive', event.target.value === 'true')} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} placeholder="Select active state" />
                <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                    <textarea
                        value={formData.address}
                        onChange={(event) => onChange('address', event.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="Primary remit-to or operating address"
                    />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading}>{isEditing ? 'Save Changes' : 'Create Supplier'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default SupplierFormModal;
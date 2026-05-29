import React, { useState } from 'react';
import { Button, Input, Modal, Select } from '../../components/common';
import { createCycleCount } from '../../services/cycleCountService';
import { COUNT_TYPES } from './constants';

const EMPTY_FORM = {
    warehouseId: '',
    type: 'FULL',
    dueDate: '',
    description: '',
    assignedUserId: '',
};

const CreateModal = ({ isOpen, onClose, warehouseOptions, userOptions, onCreated, onError }) => {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const handleClose = () => {
        if (saving) return;
        setFormData(EMPTY_FORM);
        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await createCycleCount(formData);
            setFormData(EMPTY_FORM);
            onCreated?.();
        } catch (error) {
            onError?.(error.message || 'Failed to create cycle count');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create Cycle Count">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <Select
                    label="Warehouse"
                    value={formData.warehouseId}
                    onChange={(event) => setFormData((current) => ({ ...current, warehouseId: event.target.value }))}
                    options={warehouseOptions}
                    required
                />
                <Select
                    label="Type"
                    value={formData.type}
                    onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))}
                    options={COUNT_TYPES}
                    required
                />
                <Input
                    label="Due Date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
                />
                <Select
                    label="Assigned User"
                    value={formData.assignedUserId}
                    onChange={(event) => setFormData((current) => ({ ...current, assignedUserId: event.target.value }))}
                    options={userOptions}
                    placeholder="Unassigned"
                />
                <Input
                    label="Description"
                    value={formData.description}
                    onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                />
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" loading={saving}>Create</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateModal;

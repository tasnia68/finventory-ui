import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '../../components/common';
import { scheduleCycleCount } from '../../services/cycleCountService';

const ScheduleModal = ({ isOpen, onClose, count, userOptions, onScheduled, onError }) => {
    const [form, setForm] = useState({ dueDate: '', description: '', assignedUserId: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && count) {
            setForm({
                dueDate: count.dueDate || '',
                description: count.description || '',
                assignedUserId: count.assignedUserId || '',
            });
        }
    }, [isOpen, count]);

    const handleClose = () => {
        if (saving) return;
        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!count?.id) return;
        try {
            setSaving(true);
            await scheduleCycleCount(count.id, {
                dueDate: form.dueDate || null,
                description: form.description || null,
                assignedUserId: form.assignedUserId || null,
            });
            onScheduled?.();
        } catch (error) {
            onError?.(error.message || 'Failed to schedule cycle count');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Schedule Cycle Count">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                    label="Due Date"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
                <Select
                    label="Assigned User"
                    value={form.assignedUserId}
                    onChange={(event) => setForm((current) => ({ ...current, assignedUserId: event.target.value }))}
                    options={userOptions}
                    placeholder="Unassigned"
                />
                <Input
                    label="Description"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" loading={saving}>Save Schedule</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleModal;

import React, { useState } from 'react';
import { createPickingList } from '../../services/pickingService';
import PickingListFormModal from './PickingListFormModal';
import { createEmptyPickingForm } from './constants';

// Stateful wrapper for the Generate Pick modal.
// Owns form state + submit lifecycle so individual pages can drop it in.
const PickForm = ({
    isOpen,
    onClose,
    salesOrders,
    users,
    pickingApiUnavailable,
    onCreated,
    onError,
    onWarning,
}) => {
    const [formData, setFormData] = useState(createEmptyPickingForm());
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        if (loading) return;
        setFormData(createEmptyPickingForm());
        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (pickingApiUnavailable) {
            onWarning?.('Picking endpoints are unavailable from the current backend instance. Restart the backend with the latest build before generating picks.');
            return;
        }
        try {
            setLoading(true);
            const created = await createPickingList({
                salesOrderIds: formData.salesOrderIds,
                assignedToId: formData.assignedToId || null,
                notes: formData.notes || null,
            });
            setFormData(createEmptyPickingForm());
            onCreated?.(created);
        } catch (error) {
            onError?.(error.message || 'Failed to generate picking list');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PickingListFormModal
            isOpen={isOpen}
            onClose={handleClose}
            salesOrders={salesOrders}
            users={users}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            loading={loading}
        />
    );
};

export default PickForm;

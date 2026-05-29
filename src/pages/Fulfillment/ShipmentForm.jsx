import React, { useState } from 'react';
import { createShipment } from '../../services/shipmentService';
import ShipmentFormModal from './ShipmentFormModal';
import { createEmptyShipmentForm } from './constants';

// Stateful wrapper for the Create Shipment modal.
// Owns form state + submit lifecycle so individual pages can drop it in.
const ShipmentForm = ({
    isOpen,
    onClose,
    salesOrders,
    onCreated,
    onError,
}) => {
    const [formData, setFormData] = useState(createEmptyShipmentForm());
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        if (loading) return;
        setFormData(createEmptyShipmentForm());
        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const items = formData.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({ salesOrderItemId: item.salesOrderItemId, quantity: Number(item.quantity) }));
        try {
            setLoading(true);
            const created = await createShipment({
                salesOrderId: formData.salesOrderId,
                carrier: formData.carrier || null,
                courierProvider: formData.courierProvider || null,
                courierService: formData.courierService || null,
                courierReference: formData.courierReference || null,
                cashOnDeliveryAmount: formData.cashOnDeliveryAmount === '' ? null : Number(formData.cashOnDeliveryAmount),
                deliveryFee: formData.deliveryFee === '' ? null : Number(formData.deliveryFee),
                notes: formData.notes || null,
                items,
            });
            setFormData(createEmptyShipmentForm());
            onCreated?.(created);
        } catch (error) {
            onError?.(error.message || 'Failed to create shipment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ShipmentFormModal
            isOpen={isOpen}
            onClose={handleClose}
            salesOrders={salesOrders}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            loading={loading}
        />
    );
};

export default ShipmentForm;

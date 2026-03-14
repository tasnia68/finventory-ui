import React from 'react';
import { Button, Input, Modal, Select } from '../../components/common';
import { formatNumber } from '../Sales/utils';

const ShipmentFormModal = ({ isOpen, onClose, salesOrders, formData, setFormData, onSubmit, loading }) => {
    const selectedSalesOrder = salesOrders.find((order) => order.id === formData.salesOrderId);

    const handleSalesOrderChange = (salesOrderId) => {
        const nextSalesOrder = salesOrders.find((order) => order.id === salesOrderId);
        setFormData({
            salesOrderId,
            carrier: '',
            notes: '',
            items: (nextSalesOrder?.items || [])
                .map((item) => ({
                    salesOrderItemId: item.id,
                    sku: item.sku || item.productVariantName,
                    remainingQuantity: Math.max(Number(item.quantity || 0) - Number(item.shippedQuantity || 0), 0),
                    quantity: Math.max(Number(item.quantity || 0) - Number(item.shippedQuantity || 0), 0),
                }))
                .filter((item) => item.remainingQuantity > 0),
        });
    };

    const updateItem = (salesOrderItemId, quantity) => {
        setFormData((current) => ({
            ...current,
            items: current.items.map((item) => (item.salesOrderItemId === salesOrderItemId ? { ...item, quantity } : item)),
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Shipment" size="xl">
            <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Select label="Sales Order" value={formData.salesOrderId} onChange={(event) => handleSalesOrderChange(event.target.value)} options={salesOrders.map((order) => ({ value: order.id, label: `${order.soNumber} • ${order.customerName}` }))} required />
                    <Input label="Carrier" value={formData.carrier} onChange={(event) => setFormData((current) => ({ ...current, carrier: event.target.value }))} />
                    <Input label="Notes" value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shipment Quantities</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Enter the quantities physically leaving the warehouse in this shipment.</p>
                    </div>
                    {(selectedSalesOrder ? formData.items : []).map((item) => (
                        <div key={item.salesOrderItemId} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-12">
                            <div className="lg:col-span-7">
                                <div className="font-semibold text-slate-900 dark:text-white">{item.sku}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Remaining to ship {formatNumber(item.remainingQuantity)}</div>
                            </div>
                            <Input className="lg:col-span-5" label="Shipment Qty" type="number" min="0" step="0.01" max={item.remainingQuantity} value={item.quantity} onChange={(event) => updateItem(item.salesOrderItemId, event.target.value)} />
                        </div>
                    ))}
                    {!selectedSalesOrder ? <p className="text-sm text-slate-500 dark:text-slate-400">Choose a sales order first.</p> : null}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading} disabled={!formData.salesOrderId}>Create Shipment</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ShipmentFormModal;
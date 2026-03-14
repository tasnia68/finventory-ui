import React from 'react';
import { Button, Input, Modal, Select } from '../../components/common';
import { formatDate, formatCurrency } from '../Sales/utils';

const PickingListFormModal = ({ isOpen, onClose, salesOrders, users, formData, setFormData, onSubmit, loading }) => {
    const toggleOrder = (orderId) => {
        setFormData((current) => ({
            ...current,
            salesOrderIds: current.salesOrderIds.includes(orderId)
                ? current.salesOrderIds.filter((id) => id !== orderId)
                : [...current.salesOrderIds, orderId],
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Picking List" size="xl">
            <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                        label="Assign Picker"
                        value={formData.assignedToId}
                        onChange={(event) => setFormData((current) => ({ ...current, assignedToId: event.target.value }))}
                        options={users.map((user) => ({ value: user.id, label: user.email || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.id }))}
                        placeholder="Optional picker"
                    />
                    <Input label="Notes" value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} placeholder="Wave, zone, or shift notes" />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Eligible Sales Orders</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select one order for a single-order pick or multiple orders for a wave.</p>
                    </div>
                    <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                        {salesOrders.map((order) => {
                            const selected = formData.salesOrderIds.includes(order.id);
                            return (
                                <label key={order.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                                    <input type="checkbox" checked={selected} onChange={() => toggleOrder(order.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-slate-900 dark:text-white">{order.soNumber}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{order.customerName}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{order.warehouseName || 'No warehouse'} • Expected {formatDate(order.expectedDeliveryDate)} • {order.items?.length || 0} lines</p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatCurrency(order.totalAmount, order.currency)} • {order.status}</p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading} disabled={!formData.salesOrderIds.length}>Generate Picking List</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PickingListFormModal;
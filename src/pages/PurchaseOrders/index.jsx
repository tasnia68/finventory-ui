import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, MetricCard, Modal, Select } from '../../components/common';
import ProcurementHero from '../../components/procurement/ProcurementHero';
import { formatCurrency, formatDate, formatDateTime, formatNumber, getPurchaseOrderStatusVariant, toList } from '../Procurement/utils';
import { getSuppliers } from '../../services/supplierService';
import { createPurchaseOrder, getPurchaseOrders, updatePurchaseOrder, updatePurchaseOrderStatus } from '../../services/purchaseOrderService';
import PurchaseOrderFormModal from './PurchaseOrderFormModal';

const createEmptyForm = () => ({ supplierId: '', expectedDeliveryDate: '', currency: 'USD', notes: '', items: [{ id: crypto.randomUUID(), variant: null, quantity: 1, unitPrice: '' }] });

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CLOSED'];

const PurchaseOrders = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ supplierId: '', status: '' });
    const [showFormModal, setShowFormModal] = useState(false);
    const [formData, setFormData] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    const [editingPurchaseOrder, setEditingPurchaseOrder] = useState(null);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);

    useEffect(() => {
        loadPage();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadPage = async () => {
        try {
            setLoading(true);
            const [supplierData, poData] = await Promise.all([
                getSuppliers(),
                getPurchaseOrders({ page: 0, size: 100 }),
            ]);
            setSuppliers(toList(supplierData));
            setPurchaseOrders(toList(poData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const filteredPurchaseOrders = useMemo(() => purchaseOrders.filter((purchaseOrder) => {
        if (filters.supplierId && purchaseOrder.supplierId !== filters.supplierId) return false;
        if (filters.status && purchaseOrder.status !== filters.status) return false;
        return true;
    }), [filters, purchaseOrders]);

    const summary = useMemo(() => ({
        total: purchaseOrders.length,
        open: purchaseOrders.filter((purchaseOrder) => ['PENDING', 'APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED'].includes(purchaseOrder.status)).length,
        completed: purchaseOrders.filter((purchaseOrder) => ['COMPLETED', 'CLOSED'].includes(purchaseOrder.status)).length,
        committedValue: purchaseOrders.reduce((sum, purchaseOrder) => sum + Number(purchaseOrder.totalAmount || 0), 0),
    }), [purchaseOrders]);

    const columns = [
        {
            key: 'poNumber',
            header: 'Purchase Order',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.supplierName}</div>
                </div>
            ),
        },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getPurchaseOrderStatusVariant(value)}>{value}</Badge> },
        { key: 'expectedDeliveryDate', header: 'Expected Delivery', render: (value) => formatDate(value) },
        { key: 'totalAmount', header: 'Order Value', render: (value, row) => formatCurrency(value, row.currency) },
        { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
    ];

    const openCreate = () => {
        setEditingPurchaseOrder(null);
        setFormData(createEmptyForm());
        setShowFormModal(true);
    };

    const openEdit = (purchaseOrder) => {
        setEditingPurchaseOrder(purchaseOrder);
        setFormData({
            supplierId: purchaseOrder.supplierId,
            expectedDeliveryDate: purchaseOrder.expectedDeliveryDate || '',
            currency: purchaseOrder.currency || 'USD',
            notes: purchaseOrder.notes || '',
            items: (purchaseOrder.items || []).map((item) => ({
                id: item.id,
                variant: { id: item.productVariantId, sku: item.sku, name: item.productVariantName },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
        });
        setShowFormModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const payload = {
                supplierId: formData.supplierId,
                expectedDeliveryDate: formData.expectedDeliveryDate || null,
                currency: formData.currency,
                notes: formData.notes || null,
                items: formData.items.map((item) => ({
                    productVariantId: item.variant.id,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                })),
            };
            if (editingPurchaseOrder) {
                await updatePurchaseOrder(editingPurchaseOrder.id, payload);
                showAlert('success', 'Purchase order updated');
            } else {
                await createPurchaseOrder(payload);
                showAlert('success', 'Purchase order created');
            }
            setShowFormModal(false);
            loadPage();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save purchase order');
        } finally {
            setSaving(false);
        }
    };

    const transitionStatus = async (purchaseOrder, status) => {
        try {
            await updatePurchaseOrderStatus(purchaseOrder.id, status);
            showAlert('success', `Purchase order moved to ${status}`);
            loadPage();
            if (selectedPurchaseOrder?.id === purchaseOrder.id) {
                setSelectedPurchaseOrder({ ...selectedPurchaseOrder, status });
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to update purchase order status');
        }
    };

    const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <ProcurementHero
                    eyebrow="Purchase Orders"
                    title="Plan buy-side commitments before receiving starts."
                    description="Procurement teams can issue, review, and move supplier orders through approval into receiving with a clear operational ledger of value, dates, and line status."
                    actions={(
                        <>
                            <Select value={filters.supplierId} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))} options={supplierOptions} placeholder="Filter by supplier" className="min-w-[220px]" />
                            <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={STATUS_OPTIONS.map((status) => ({ value: status, label: status.replaceAll('_', ' ') }))} placeholder="Filter by status" className="min-w-[220px]" />
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            <Button icon="add" onClick={openCreate}>Create PO</Button>
                        </>
                    )}
                    accent="from-emerald-500/15 via-transparent to-sky-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Purchase Orders" value={formatNumber(summary.total)} caption="All procurement orders in the current working set" icon="receipt_long" tone="blue" />
                    <MetricCard title="Open Orders" value={formatNumber(summary.open)} caption="Orders still moving through approval or receiving" icon="schedule" tone="amber" />
                    <MetricCard title="Closed Orders" value={formatNumber(summary.completed)} caption="Orders fully received or commercially closed" icon="task_alt" tone="emerald" />
                    <MetricCard title="Committed Value" value={formatCurrency(summary.committedValue)} caption="Total commercial exposure across listed purchase orders" icon="payments" tone="violet" />
                </div>

                <Card padding="none" className="overflow-hidden" title="PO Ledger" subtitle="Commercial orders driving warehouse receipts and supplier commitments">
                    <DataTable columns={columns} data={filteredPurchaseOrders} loading={loading} emptyMessage="No purchase orders found." onRowClick={setSelectedPurchaseOrder} />
                </Card>
            </div>

            <PurchaseOrderFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} suppliers={suppliers.filter((supplier) => supplier.status === 'APPROVED' && supplier.isActive)} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} loading={saving} isEditing={Boolean(editingPurchaseOrder)} />

            <Modal isOpen={Boolean(selectedPurchaseOrder)} onClose={() => setSelectedPurchaseOrder(null)} title={selectedPurchaseOrder?.poNumber || 'Purchase Order'} size="xl">
                {selectedPurchaseOrder ? (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{selectedPurchaseOrder.poNumber}</h3>
                                    <Badge variant={getPurchaseOrderStatusVariant(selectedPurchaseOrder.status)}>{selectedPurchaseOrder.status}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedPurchaseOrder.supplierName} • Expected {formatDate(selectedPurchaseOrder.expectedDeliveryDate)}</p>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedPurchaseOrder.notes || 'No PO notes provided.'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedPurchaseOrder.status === 'PENDING' ? <Button onClick={() => transitionStatus(selectedPurchaseOrder, 'APPROVED')}>Approve</Button> : null}
                                {selectedPurchaseOrder.status === 'PENDING' ? <Button variant="danger" onClick={() => transitionStatus(selectedPurchaseOrder, 'REJECTED')}>Reject</Button> : null}
                                {selectedPurchaseOrder.status === 'APPROVED' ? <Button onClick={() => transitionStatus(selectedPurchaseOrder, 'ISSUED')}>Issue to Receiving</Button> : null}
                                {selectedPurchaseOrder.status === 'PARTIALLY_RECEIVED' ? <Button onClick={() => transitionStatus(selectedPurchaseOrder, 'CLOSED')}>Close PO</Button> : null}
                                {selectedPurchaseOrder.status === 'PENDING' ? <Button variant="secondary" onClick={() => { setSelectedPurchaseOrder(null); openEdit(selectedPurchaseOrder); }}>Edit</Button> : null}
                            </div>
                        </div>

                        <Card padding="none" className="overflow-hidden" title="Ordered Items" subtitle="Commercial line items expected from the supplier">
                            <DataTable
                                columns={[
                                    { key: 'productVariantName', header: 'Variant', render: (value, row) => <div><div className="font-semibold text-slate-900 dark:text-white">{row.sku || value}</div><div className="text-xs text-slate-500 dark:text-slate-400">{value}</div></div> },
                                    { key: 'quantity', header: 'Ordered Qty' },
                                    { key: 'receivedQuantity', header: 'Received Qty' },
                                    { key: 'unitPrice', header: 'Unit Price', render: (value) => formatCurrency(value, selectedPurchaseOrder.currency) },
                                    { key: 'totalPrice', header: 'Line Total', render: (value) => formatCurrency(value, selectedPurchaseOrder.currency) },
                                ]}
                                data={selectedPurchaseOrder.items || []}
                                emptyMessage="No line items on this purchase order."
                            />
                        </Card>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default PurchaseOrders;
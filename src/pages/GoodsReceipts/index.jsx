import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, MetricCard, Modal, Select } from '../../components/common';
import ProcurementHero from '../../components/procurement/ProcurementHero';
import { createGoodsReceiptNote, getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import { getPurchaseOrders } from '../../services/purchaseOrderService';
import { getSuppliers } from '../../services/supplierService';
import { getWarehouses } from '../../services/warehouseService';
import { formatDateTime, formatNumber, getGoodsReceiptStatusVariant, getPurchaseOrderStatusVariant, toList } from '../Procurement/utils';
import GoodsReceiptDetailModal from './GoodsReceiptDetailModal';

const GoodsReceipts = () => {
    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ supplierId: '', status: '' });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ purchaseOrderId: '', warehouseId: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState(null);

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
            const [grnData, poData, warehouseData, supplierData] = await Promise.all([
                getGoodsReceiptNotes({ page: 0, size: 100 }),
                getPurchaseOrders({ page: 0, size: 100 }),
                getWarehouses(),
                getSuppliers(),
            ]);
            setGoodsReceipts(toList(grnData));
            setPurchaseOrders(toList(poData));
            setWarehouses(toList(warehouseData));
            setSuppliers(toList(supplierData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load goods receipts');
        } finally {
            setLoading(false);
        }
    };

    const filteredGoodsReceipts = useMemo(() => goodsReceipts.filter((goodsReceipt) => {
        if (filters.supplierId && goodsReceipt.supplierId !== filters.supplierId) return false;
        if (filters.status && goodsReceipt.status !== filters.status) return false;
        return true;
    }), [filters, goodsReceipts]);

    const summary = useMemo(() => ({
        total: goodsReceipts.length,
        draft: goodsReceipts.filter((goodsReceipt) => goodsReceipt.status === 'DRAFT').length,
        verified: goodsReceipts.filter((goodsReceipt) => goodsReceipt.status === 'VERIFIED').length,
        completed: goodsReceipts.filter((goodsReceipt) => goodsReceipt.status === 'COMPLETED').length,
    }), [goodsReceipts]);

    const openPurchaseOrders = useMemo(() => purchaseOrders.filter((purchaseOrder) => ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED'].includes(purchaseOrder.status)), [purchaseOrders]);

    const columns = [
        {
            key: 'grnNumber',
            header: 'Goods Receipt',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.purchaseOrderNumber} • {row.supplierName}</div>
                </div>
            ),
        },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getGoodsReceiptStatusVariant(value)}>{value}</Badge> },
        { key: 'warehouseName', header: 'Warehouse' },
        { key: 'receivedDate', header: 'Received Date', render: (value) => formatDateTime(value) },
    ];

    const handleCreate = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await createGoodsReceiptNote({
                purchaseOrderId: createForm.purchaseOrderId,
                warehouseId: createForm.warehouseId,
                notes: createForm.notes || null,
            });
            showAlert('success', 'Goods receipt created');
            setShowCreateModal(false);
            setCreateForm({ purchaseOrderId: '', warehouseId: '', notes: '' });
            loadPage();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create goods receipt');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <ProcurementHero
                    eyebrow="Goods Receipts"
                    title="Turn approved supplier orders into controlled warehouse receipts."
                    description="Receiving teams can generate GRNs from purchase orders, balance accepted versus rejected quantities, and then post supplier returns without leaving procurement operations."
                    actions={(
                        <>
                            <Select value={filters.supplierId} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} placeholder="Filter by supplier" className="min-w-[220px]" />
                            <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={['DRAFT', 'VERIFIED', 'COMPLETED', 'CANCELLED'].map((status) => ({ value: status, label: status }))} placeholder="Filter by status" className="min-w-[220px]" />
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            <Button icon="add" onClick={() => setShowCreateModal(true)}>Create GRN</Button>
                        </>
                    )}
                    accent="from-orange-500/15 via-transparent to-emerald-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Receipts" value={formatNumber(summary.total)} caption="Goods receipts tracked across procurement" icon="inventory" tone="blue" />
                    <MetricCard title="Draft" value={formatNumber(summary.draft)} caption="Receipts awaiting quantity balancing" icon="edit_note" tone="amber" />
                    <MetricCard title="Verified" value={formatNumber(summary.verified)} caption="Receipts ready to hit stock" icon="rule" tone="violet" />
                    <MetricCard title="Completed" value={formatNumber(summary.completed)} caption="Receipts already posted to warehouse stock" icon="task_alt" tone="emerald" />
                </div>

                <Card padding="none" className="overflow-hidden" title="Receipt Register" subtitle="Receiving ledger sourced from approved and issued purchase orders">
                    <DataTable columns={columns} data={filteredGoodsReceipts} loading={loading} emptyMessage="No goods receipts found." onRowClick={setSelectedGoodsReceipt} />
                </Card>
            </div>

            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Goods Receipt" size="lg">
                <form className="space-y-4" onSubmit={handleCreate}>
                    <Select label="Purchase order" value={createForm.purchaseOrderId} onChange={(event) => setCreateForm((current) => ({ ...current, purchaseOrderId: event.target.value }))} options={openPurchaseOrders.map((purchaseOrder) => ({ value: purchaseOrder.id, label: `${purchaseOrder.poNumber} • ${purchaseOrder.supplierName}` }))} placeholder="Select open purchase order" />
                    <Select label="Receiving warehouse" value={createForm.warehouseId} onChange={(event) => setCreateForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="Select warehouse" />
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                        <textarea value={createForm.notes} onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Carrier, dock appointment, receipt notes" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                        <p className="font-semibold text-slate-900 dark:text-white">Eligible POs</p>
                        <ul className="mt-2 space-y-2 text-slate-500 dark:text-slate-400">
                            {openPurchaseOrders.slice(0, 3).map((purchaseOrder) => (
                                <li key={purchaseOrder.id} className="flex items-center justify-between gap-3">
                                    <span>{purchaseOrder.poNumber} • {purchaseOrder.supplierName}</span>
                                    <Badge variant={getPurchaseOrderStatusVariant(purchaseOrder.status)}>{purchaseOrder.status}</Badge>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button type="submit" loading={saving}>Create GRN</Button>
                    </div>
                </form>
            </Modal>

            <GoodsReceiptDetailModal goodsReceipt={selectedGoodsReceipt} isOpen={Boolean(selectedGoodsReceipt)} onClose={() => setSelectedGoodsReceipt(null)} onRefresh={loadPage} />
        </div>
    );
};

export default GoodsReceipts;
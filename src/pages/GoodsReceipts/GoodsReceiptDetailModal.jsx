import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, Modal, Select } from '../../components/common';
import {
    confirmGoodsReceiptNote,
    confirmSupplierReturn,
    createSupplierReturn,
    getSupplierReturns,
    updateGoodsReceiptNoteItems,
    verifyGoodsReceiptNote,
} from '../../services/goodsReceiptNoteService';
import { formatCurrency, formatDateTime, getGoodsReceiptStatusVariant, getSupplierReturnStatusVariant } from '../Procurement/utils';

const GoodsReceiptDetailModal = ({ goodsReceipt, isOpen, onClose, onRefresh }) => {
    const [workingItems, setWorkingItems] = useState([]);
    const [supplierReturns, setSupplierReturns] = useState([]);
    const [alert, setAlert] = useState(null);
    const [saving, setSaving] = useState(false);
    const [returnForm, setReturnForm] = useState({ goodsReceiptNoteItemId: '', quantity: '', reason: '', notes: '' });

    useEffect(() => {
        if (goodsReceipt) {
            setWorkingItems((goodsReceipt.items || []).map((item) => ({ ...item })));
            loadReturns(goodsReceipt.id);
            setReturnForm({ goodsReceiptNoteItemId: '', quantity: '', reason: '', notes: '' });
        }
    }, [goodsReceipt]);

    const showAlert = (type, message) => setAlert({ type, message });

    const loadReturns = async (goodsReceiptId) => {
        try {
            const data = await getSupplierReturns(goodsReceiptId);
            setSupplierReturns(Array.isArray(data) ? data : []);
        } catch (error) {
            setSupplierReturns([]);
        }
    };

    const updateItem = (id, field, value) => {
        setWorkingItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const persistItems = async () => {
        try {
            setSaving(true);
            await updateGoodsReceiptNoteItems(goodsReceipt.id, workingItems.map((item) => ({
                id: item.id,
                receivedQuantity: Number(item.receivedQuantity),
                acceptedQuantity: Number(item.acceptedQuantity),
                rejectedQuantity: Number(item.rejectedQuantity),
                rejectionReason: item.rejectionReason || null,
            })));
            showAlert('success', 'GRN item balances saved');
            onRefresh();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save GRN items');
        } finally {
            setSaving(false);
        }
    };

    const moveReceipt = async (action) => {
        try {
            setSaving(true);
            if (action === 'verify') {
                await verifyGoodsReceiptNote(goodsReceipt.id);
            } else {
                await confirmGoodsReceiptNote(goodsReceipt.id);
            }
            showAlert('success', `GRN ${action}d successfully`);
            await onRefresh();
        } catch (error) {
            showAlert('error', error.message || `Failed to ${action} GRN`);
        } finally {
            setSaving(false);
        }
    };

    const submitReturn = async (event) => {
        event.preventDefault();
        try {
            await createSupplierReturn({
                goodsReceiptNoteId: goodsReceipt.id,
                reason: returnForm.reason || null,
                notes: returnForm.notes || null,
                items: [{ goodsReceiptNoteItemId: returnForm.goodsReceiptNoteItemId, quantity: Number(returnForm.quantity), reason: returnForm.reason || null }],
            });
            showAlert('success', 'Supplier return created');
            setReturnForm({ goodsReceiptNoteItemId: '', quantity: '', reason: '', notes: '' });
            loadReturns(goodsReceipt.id);
            onRefresh();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create supplier return');
        }
    };

    const returnableOptions = useMemo(() => (workingItems || [])
        .filter((item) => Number(item.acceptedQuantity || 0) > Number(item.returnedQuantity || 0))
        .map((item) => ({ value: item.id, label: `${item.productVariantSku} (${Number(item.acceptedQuantity || 0) - Number(item.returnedQuantity || 0)} available)` })), [workingItems]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={goodsReceipt?.grnNumber || 'Goods Receipt'} size="xl">
            {goodsReceipt ? (
                <div className="space-y-6">
                    {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{goodsReceipt.grnNumber}</h3>
                                <Badge variant={getGoodsReceiptStatusVariant(goodsReceipt.status)}>{goodsReceipt.status}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{goodsReceipt.supplierName} • {goodsReceipt.purchaseOrderNumber} • {goodsReceipt.warehouseName}</p>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Received {formatDateTime(goodsReceipt.receivedDate)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {goodsReceipt.status === 'DRAFT' ? <Button onClick={persistItems} loading={saving}>Save Items</Button> : null}
                            {goodsReceipt.status === 'DRAFT' ? <Button variant="secondary" onClick={() => moveReceipt('verify')} loading={saving}>Verify</Button> : null}
                            {goodsReceipt.status === 'VERIFIED' ? <Button onClick={() => moveReceipt('confirm')} loading={saving}>Confirm Receipt</Button> : null}
                        </div>
                    </div>

                    <Card padding="none" className="overflow-hidden" title="Receipt Lines" subtitle="Balance accepted and rejected units before warehouse confirmation">
                        <DataTable
                            columns={[
                                { key: 'productVariantSku', header: 'Variant', render: (value, row) => <div><div className="font-semibold text-slate-900 dark:text-white">{value}</div><div className="text-xs text-slate-500 dark:text-slate-400">PO line {row.purchaseOrderItemId}</div></div> },
                                { key: 'receivedQuantity', header: 'Received', render: (value, row) => goodsReceipt.status === 'DRAFT' ? <input type="number" min="0" value={row.receivedQuantity} onChange={(event) => updateItem(row.id, 'receivedQuantity', event.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" /> : value },
                                { key: 'acceptedQuantity', header: 'Accepted', render: (value, row) => goodsReceipt.status === 'DRAFT' ? <input type="number" min="0" value={row.acceptedQuantity} onChange={(event) => updateItem(row.id, 'acceptedQuantity', event.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" /> : value },
                                { key: 'rejectedQuantity', header: 'Rejected', render: (value, row) => goodsReceipt.status === 'DRAFT' ? <input type="number" min="0" value={row.rejectedQuantity} onChange={(event) => updateItem(row.id, 'rejectedQuantity', event.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" /> : value },
                                { key: 'returnedQuantity', header: 'Returned' },
                            ]}
                            data={workingItems}
                            emptyMessage="No receipt items available."
                        />
                    </Card>

                    {goodsReceipt.status === 'COMPLETED' ? (
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                            <Card title="Return to Supplier" subtitle="Create a return from accepted quantities already received">
                                <form className="space-y-3" onSubmit={submitReturn}>
                                    <Select label="Receipt line" value={returnForm.goodsReceiptNoteItemId} onChange={(event) => setReturnForm((current) => ({ ...current, goodsReceiptNoteItemId: event.target.value }))} options={returnableOptions} placeholder="Select returnable line" />
                                    <Input label="Quantity" type="number" min="1" value={returnForm.quantity} onChange={(event) => setReturnForm((current) => ({ ...current, quantity: event.target.value }))} />
                                    <Input label="Reason" value={returnForm.reason} onChange={(event) => setReturnForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Damage, spec deviation, shelf life" />
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                                        <textarea value={returnForm.notes} onChange={(event) => setReturnForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit">Create Return</Button>
                                    </div>
                                </form>
                            </Card>

                            <Card padding="none" className="overflow-hidden" title="Supplier Return Register" subtitle="Track stock sent back to the supplier after receipt">
                                <DataTable
                                    columns={[
                                        { key: 'returnNumber', header: 'Return' },
                                        { key: 'status', header: 'Status', render: (value) => <Badge variant={getSupplierReturnStatusVariant(value)}>{value}</Badge> },
                                        { key: 'reason', header: 'Reason', render: (value) => value || '-' },
                                        { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
                                        { key: 'id', header: 'Actions', render: (_, row) => row.status === 'REQUESTED' ? <Button size="sm" onClick={() => confirmSupplierReturn(row.id).then(() => { showAlert('success', 'Supplier return confirmed'); loadReturns(goodsReceipt.id); onRefresh(); }).catch((error) => showAlert('error', error.message || 'Failed to confirm supplier return'))}>Confirm</Button> : <span className="text-xs text-slate-400">Posted</span> },
                                    ]}
                                    data={supplierReturns}
                                    emptyMessage="No supplier returns recorded for this receipt."
                                />
                            </Card>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </Modal>
    );
};

export default GoodsReceiptDetailModal;
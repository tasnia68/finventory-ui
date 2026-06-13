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

const parseSerialList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return String(raw)
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
};

const formatSerialList = (list) => (Array.isArray(list) ? list.join('\n') : (list || ''));

const GoodsReceiptDetailModal = ({ goodsReceipt, isOpen, onClose, onRefresh }) => {
    const [workingItems, setWorkingItems] = useState([]);
    const [expandedItemIds, setExpandedItemIds] = useState({});
    const [supplierReturns, setSupplierReturns] = useState([]);
    const [alert, setAlert] = useState(null);
    const [saving, setSaving] = useState(false);
    const [returnForm, setReturnForm] = useState({ goodsReceiptNoteItemId: '', quantity: '', reason: '', notes: '' });

    useEffect(() => {
        if (goodsReceipt) {
            setWorkingItems((goodsReceipt.items || []).map((item) => ({
                ...item,
                serialNumbersText: formatSerialList(item.serialNumbers),
            })));
            loadReturns(goodsReceipt.id);
            setReturnForm({ goodsReceiptNoteItemId: '', quantity: '', reason: '', notes: '' });
            setExpandedItemIds({});
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

    const toggleExpanded = (id) => {
        setExpandedItemIds((current) => ({ ...current, [id]: !current[id] }));
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
                batchNumber: item.batchTracked ? (item.batchNumber || null) : null,
                manufacturingDate: item.batchTracked ? (item.manufacturingDate || null) : null,
                expiryDate: item.batchTracked ? (item.expiryDate || null) : null,
                serialNumbers: item.serialTracked ? parseSerialList(item.serialNumbersText) : null,
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

    const isDraft = goodsReceipt?.status === 'DRAFT';

    const renderTrackingBadges = (row) => {
        if (!row.batchTracked && !row.serialTracked) return null;
        const labels = [];
        if (row.batchTracked) labels.push('Batch');
        if (row.serialTracked) labels.push('Serial');
        return (
            <button
                type="button"
                onClick={() => toggleExpanded(row.id)}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-200"
                title="Toggle batch / serial details"
            >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>inventory_2</span>
                {labels.join(' + ')}
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {expandedItemIds[row.id] ? 'expand_less' : 'expand_more'}
                </span>
            </button>
        );
    };

    const renderTrackingDetails = (row) => {
        if (!expandedItemIds[row.id]) return null;
        if (!row.batchTracked && !row.serialTracked) return null;
        return (
            <div className="my-2 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40 md:grid-cols-3">
                {row.batchTracked ? (
                    <>
                        <Input
                            label="Batch number *"
                            value={row.batchNumber || ''}
                            onChange={(e) => updateItem(row.id, 'batchNumber', e.target.value)}
                            disabled={!isDraft}
                            placeholder="e.g. LOT-2026-A"
                        />
                        <Input
                            label="Manufacture date"
                            type="date"
                            value={row.manufacturingDate || ''}
                            onChange={(e) => updateItem(row.id, 'manufacturingDate', e.target.value)}
                            disabled={!isDraft}
                        />
                        <Input
                            label="Expiry date"
                            type="date"
                            value={row.expiryDate || ''}
                            onChange={(e) => updateItem(row.id, 'expiryDate', e.target.value)}
                            disabled={!isDraft}
                        />
                    </>
                ) : null}
                {row.serialTracked ? (
                    <div className={row.batchTracked ? 'md:col-span-3' : 'md:col-span-3'}>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Serial numbers * <span className="text-xs text-slate-500">(one per line, must match accepted qty)</span>
                        </label>
                        <textarea
                            rows={Math.min(8, Math.max(3, Number(row.acceptedQuantity) || 3))}
                            value={row.serialNumbersText || ''}
                            onChange={(e) => updateItem(row.id, 'serialNumbersText', e.target.value)}
                            disabled={!isDraft}
                            placeholder={`SN-001\nSN-002\nSN-003`}
                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-800"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {parseSerialList(row.serialNumbersText).length} / {row.acceptedQuantity || 0}
                        </p>
                    </div>
                ) : null}
            </div>
        );
    };

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
                            {isDraft ? <Button onClick={persistItems} loading={saving}>Save Items</Button> : null}
                            {isDraft ? <Button variant="secondary" onClick={() => moveReceipt('verify')} loading={saving}>Verify</Button> : null}
                            {goodsReceipt.status === 'VERIFIED' ? <Button onClick={() => moveReceipt('confirm')} loading={saving}>Confirm Receipt</Button> : null}
                        </div>
                    </div>

                    <Card padding="none" className="overflow-hidden" title="Receipt Lines" subtitle="Balance accepted and rejected units, capture batch + expiry for tracked products">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Variant</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Received</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Accepted</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Returned</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                                    {workingItems.length === 0 ? (
                                        <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">No receipt items available.</td></tr>
                                    ) : null}
                                    {workingItems.map((row) => (
                                        <React.Fragment key={row.id}>
                                            <tr>
                                                <td className="px-4 py-2 align-top">
                                                    <div className="flex items-start">
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white">{row.productVariantSku}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">PO line {row.purchaseOrderItemId}</div>
                                                        </div>
                                                        {renderTrackingBadges(row)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 align-top">
                                                    {isDraft ? <input type="number" min="0" value={row.receivedQuantity} onChange={(e) => updateItem(row.id, 'receivedQuantity', e.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" /> : row.receivedQuantity}
                                                </td>
                                                <td className="px-4 py-2 align-top">
                                                    {isDraft ? <input type="number" min="0" value={row.acceptedQuantity} onChange={(e) => updateItem(row.id, 'acceptedQuantity', e.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" /> : row.acceptedQuantity}
                                                </td>
                                                <td className="px-4 py-2 align-top">
                                                    {isDraft ? <input type="number" min="0" value={row.rejectedQuantity} onChange={(e) => updateItem(row.id, 'rejectedQuantity', e.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" /> : row.rejectedQuantity}
                                                </td>
                                                <td className="px-4 py-2 align-top">{row.returnedQuantity}</td>
                                            </tr>
                                            {(row.batchTracked || row.serialTracked) && expandedItemIds[row.id] ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 pb-3">{renderTrackingDetails(row)}</td>
                                                </tr>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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

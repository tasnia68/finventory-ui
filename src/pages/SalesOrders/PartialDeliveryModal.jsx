import React, { useMemo, useState } from 'react';
import { Button, Input, Modal } from '../../components/common';
import { partialDeliver } from '../../services/salesOrderService';

const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

const PartialDeliveryModal = ({ salesOrder, onClose, onDone }) => {
    const [rows, setRows] = useState(() => (salesOrder.items || []).map((item) => ({
        itemId: item.id,
        sku: item.sku || item.productVariantName,
        variantName: item.productVariantName,
        ordered: toNum(item.quantity),
        shipped: toNum(item.shippedQuantity),
        priorFulfilled: toNum(item.fulfilledQuantity),
        priorReturned: toNum(item.returnedQuantity),
        priorCancelled: toNum(item.cancelledQuantity),
        fulfilledQuantity: toNum(item.fulfilledQuantity),
        returnedQuantity: toNum(item.returnedQuantity),
        cancelledQuantity: toNum(item.cancelledQuantity),
    })));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const totals = useMemo(() => rows.reduce((acc, row) => {
        acc.ordered += row.ordered;
        acc.fulfilled += toNum(row.fulfilledQuantity);
        acc.returned += toNum(row.returnedQuantity);
        acc.cancelled += toNum(row.cancelledQuantity);
        return acc;
    }, { ordered: 0, fulfilled: 0, returned: 0, cancelled: 0 }), [rows]);

    const updateCell = (idx, field, value) => {
        setRows((current) => current.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    };

    const lineError = (row) => {
        const sum = toNum(row.fulfilledQuantity) + toNum(row.returnedQuantity) + toNum(row.cancelledQuantity);
        if (sum > row.ordered) return `Sum exceeds ordered (${row.ordered})`;
        if (toNum(row.returnedQuantity) < row.priorReturned) return 'Returned cannot decrease';
        return null;
    };

    const hasErrors = rows.some((r) => lineError(r));

    const submit = async () => {
        if (hasErrors) {
            setError('Fix line errors before submitting');
            return;
        }
        try {
            setBusy(true);
            setError(null);
            await partialDeliver(salesOrder.id, rows.map((r) => ({
                itemId: r.itemId,
                fulfilledQuantity: toNum(r.fulfilledQuantity),
                returnedQuantity: toNum(r.returnedQuantity),
                cancelledQuantity: toNum(r.cancelledQuantity),
            })));
            onDone('Partial delivery recorded');
        } catch (e) {
            setError(e.message || 'Failed to record partial delivery');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={`Partial delivery — ${salesOrder.soNumber}`} size="xl">
            <div className="space-y-4">
                {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}
                <p className="text-sm text-slate-500">
                    Record what the customer accepted per line. Returned quantities restock inventory automatically. Sum of delivered + returned + cancelled must not exceed ordered quantity.
                </p>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                                <th className="py-2 pr-2">Variant</th>
                                <th className="py-2 pr-2">Ordered</th>
                                <th className="py-2 pr-2">Shipped</th>
                                <th className="py-2 pr-2">Delivered</th>
                                <th className="py-2 pr-2">Returned</th>
                                <th className="py-2 pr-2">Cancelled</th>
                                <th className="py-2 pr-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const err = lineError(row);
                                return (
                                    <tr key={row.itemId} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="py-2 pr-2">
                                            <div className="font-semibold">{row.sku}</div>
                                            <div className="text-xs text-slate-500">{row.variantName}</div>
                                        </td>
                                        <td className="py-2 pr-2">{row.ordered}</td>
                                        <td className="py-2 pr-2">{row.shipped}</td>
                                        <td className="py-2 pr-2" style={{ minWidth: 100 }}>
                                            <Input type="number" step="0.001" value={row.fulfilledQuantity} onChange={(e) => updateCell(idx, 'fulfilledQuantity', e.target.value)} />
                                        </td>
                                        <td className="py-2 pr-2" style={{ minWidth: 100 }}>
                                            <Input type="number" step="0.001" value={row.returnedQuantity} onChange={(e) => updateCell(idx, 'returnedQuantity', e.target.value)} />
                                        </td>
                                        <td className="py-2 pr-2" style={{ minWidth: 100 }}>
                                            <Input type="number" step="0.001" value={row.cancelledQuantity} onChange={(e) => updateCell(idx, 'cancelledQuantity', e.target.value)} />
                                        </td>
                                        <td className="py-2 pr-2 text-xs">
                                            {err ? <span className="text-red-600">{err}</span> : <span className="text-slate-400">OK</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="text-xs font-semibold text-slate-500">
                                <td className="py-2 pr-2">Totals</td>
                                <td className="py-2 pr-2">{totals.ordered}</td>
                                <td className="py-2 pr-2" />
                                <td className="py-2 pr-2">{totals.fulfilled}</td>
                                <td className="py-2 pr-2">{totals.returned}</td>
                                <td className="py-2 pr-2">{totals.cancelled}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={busy || hasErrors}>{busy ? 'Saving…' : 'Record delivery'}</Button>
                </div>
            </div>
        </Modal>
    );
};

export default PartialDeliveryModal;

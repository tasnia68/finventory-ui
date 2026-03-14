import React, { useEffect, useState } from 'react';
import { Badge, Button, Input, Modal } from '../../components/common';

const normalizeTenderCounts = (settlementPreview) => {
    const counts = Array.isArray(settlementPreview?.tenderCounts) ? settlementPreview.tenderCounts : [];
    if (counts.length > 0) {
        return counts.map((item) => ({
            paymentMethod: item.paymentMethod,
            expectedAmount: Number(item.expectedAmount || 0),
            declaredAmount: String(item.declaredAmount ?? item.expectedAmount ?? 0),
        }));
    }

    return [{ paymentMethod: 'CASH', expectedAmount: Number(settlementPreview?.expectedCashAmount || 0), declaredAmount: String(settlementPreview?.expectedCashAmount || 0) }];
};

const PosShiftModal = ({ isOpen, mode, terminal, shift, settlementPreview, loading, previewLoading, onClose, onOpenShift, onCloseShift }) => {
    const [openingFloat, setOpeningFloat] = useState('0');
    const [closingNotes, setClosingNotes] = useState('');
    const [tenderCounts, setTenderCounts] = useState([]);

    useEffect(() => {
        if (!isOpen) {
            setOpeningFloat('0');
            setClosingNotes('');
            setTenderCounts([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (mode === 'close' && isOpen) {
            setTenderCounts(normalizeTenderCounts(settlementPreview));
        }
    }, [isOpen, mode, settlementPreview]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (mode === 'open') {
            await onOpenShift({ openingFloat: Number(openingFloat || 0) });
            return;
        }

        await onCloseShift({
            closingNotes,
            tenderCounts: tenderCounts.map((item) => ({
                paymentMethod: item.paymentMethod,
                declaredAmount: Number(item.declaredAmount || 0),
            })),
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'open' ? 'Open Register Shift' : 'Close Register Shift'} size="md">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Counter</p>
                    <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{terminal?.name || 'No counter selected'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{terminal?.warehouseName || 'No warehouse assigned'}</p>
                    {shift?.cashierName ? <p className="mt-1 text-xs text-slate-400">Current cashier: {shift.cashierName}</p> : null}
                </div>

                {mode === 'open' ? (
                    <Input
                        label="Opening Float"
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingFloat}
                        onChange={(event) => setOpeningFloat(event.target.value)}
                    />
                ) : (
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Settlement Snapshot</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Declare the counted tender balances before closing the shift.</p>
                                </div>
                                {previewLoading ? <Badge variant="warning">Loading</Badge> : <Badge variant="info">Ready</Badge>}
                            </div>

                            <div className="mt-4 space-y-3">
                                {tenderCounts.map((item, index) => (
                                    <div key={`${item.paymentMethod}-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.paymentMethod}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Expected {Number(item.expectedAmount || 0).toFixed(2)}</p>
                                        </div>
                                        <Input
                                            label="Declared Amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.declaredAmount}
                                            onChange={(event) => setTenderCounts((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, declaredAmount: event.target.value } : line))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Closing Notes</label>
                            <textarea
                                rows={4}
                                value={closingNotes}
                                onChange={(event) => setClosingNotes(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                placeholder="Drawer count, discrepancy, handover notes"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading} disabled={!terminal?.id}>{mode === 'open' ? 'Open Shift' : 'Close Shift'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PosShiftModal;

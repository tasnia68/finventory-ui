import React, { useEffect, useState } from 'react';
import { Button, Input, Modal } from '../../components/common';

const PosShiftModal = ({ isOpen, mode, terminal, shift, loading, onClose, onOpenShift, onCloseShift }) => {
    const [openingFloat, setOpeningFloat] = useState('0');
    const [closingNotes, setClosingNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setOpeningFloat('0');
            setClosingNotes('');
        }
    }, [isOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (mode === 'open') {
            await onOpenShift({ openingFloat: Number(openingFloat || 0) });
            return;
        }

        await onCloseShift({ closingNotes });
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

import React from 'react';
import { Button, Input, Modal, Select } from '../../components/common';
import { formatCurrency } from './utils';

const PAYMENT_OPTIONS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other Tender' },
];

const TENDER_PRESETS = [5, 10, 20, 50, 100, 200];

const appendTenderValue = (currentValue, nextValue) => {
    const normalizedCurrent = String(currentValue ?? '');
    if (nextValue === 'C') {
        return '';
    }
    if (nextValue === '.') {
        return normalizedCurrent.includes('.') ? normalizedCurrent : `${normalizedCurrent || '0'}.`;
    }
    if (nextValue === '00') {
        return normalizedCurrent ? `${normalizedCurrent}00` : '0';
    }
    return `${normalizedCurrent}${nextValue}`;
};

const PosCheckoutModal = ({ isOpen, onClose, checkout, setCheckout, summary, cart, online, canSyncSale, onSubmit, loading }) => {
    const changeDue = Math.max(0, Number(checkout.tenderedAmount || 0) - Number(summary.total || 0));

    const setTenderedAmount = (value) => {
        setCheckout((current) => ({ ...current, tenderedAmount: value }));
    };

    const applyExactAmount = () => {
        setTenderedAmount(String(Number(summary.total || 0).toFixed(2)));
    };

    const addPresetAmount = (amount) => {
        setTenderedAmount(String(amount.toFixed(2)));
    };

    const handleTenderPad = (value) => {
        setTenderedAmount(appendTenderValue(checkout.tenderedAmount, value));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Complete POS Sale" size="xl">
            <form className="space-y-6" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Select label="Payment Method" value={checkout.paymentMethod} onChange={(event) => setCheckout((current) => ({ ...current, paymentMethod: event.target.value }))} options={PAYMENT_OPTIONS} required />
                            <Input label="Tendered Amount" type="number" min="0" step="0.01" value={checkout.tenderedAmount} onChange={(event) => setTenderedAmount(event.target.value)} />
                            <Input label="Discount Amount" type="number" min="0" step="0.01" value={checkout.discountAmount} onChange={(event) => setCheckout((current) => ({ ...current, discountAmount: event.target.value }))} />
                            <Input label="Tax Rate %" type="number" min="0" step="0.01" value={checkout.taxRate} onChange={(event) => setCheckout((current) => ({ ...current, taxRate: event.target.value }))} />
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Quick Tender</p>
                                <Button size="sm" variant="secondary" onClick={applyExactAmount}>Exact Cash</Button>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                {TENDER_PRESETS.map((amount) => (
                                    <Button key={amount} variant="secondary" onClick={() => addPresetAmount(amount)}>{formatCurrency(amount, checkout.currency)}</Button>
                                ))}
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '00'].map((key) => (
                                    <Button key={key} variant="secondary" className="py-4 text-lg font-bold" onClick={() => handleTenderPad(key)}>{key}</Button>
                                ))}
                            </div>
                            <div className="mt-3">
                                <Button variant="ghost" className="w-full py-3" onClick={() => handleTenderPad('C')}>Clear Tender</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sale Notes</label>
                            <textarea rows={3} value={checkout.notes} onChange={(event) => setCheckout((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Cash drawer note, pickup detail, cashier remark" />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                            <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={checkout.syncMode === 'local'}
                                    onChange={(event) => setCheckout((current) => ({ ...current, syncMode: event.target.checked ? 'local' : 'online' }))}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span>
                                    <span className="block font-semibold text-slate-900 dark:text-white">Store locally for offline or guest checkout</span>
                                    <span className="mt-1 block text-slate-500 dark:text-slate-400">Use this when internet is unavailable. The sale will stay queued locally and then sync into the backend POS ledger when connectivity returns.</span>
                                </span>
                            </label>
                            {!online ? <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300">Device is offline. This sale will be queued locally until sync is available.</p> : null}
                            {online && checkout.syncMode === 'online' && !canSyncSale ? <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300">Choose a POS terminal before posting this sale to the backend.</p> : null}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Receipt Preview</p>
                        <div className="mt-4 space-y-3">
                            {cart.map((line) => (
                                <div key={line.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-slate-800/80">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900 dark:text-white">{line.sku}</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{line.quantity} x {formatCurrency(line.unitPrice, checkout.currency)}</p>
                                    </div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(line.lineTotal, checkout.currency)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 space-y-3 rounded-2xl bg-white p-4 dark:bg-slate-800/80">
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Lines</span><span>{cart.length}</span></div>
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Items</span><span>{summary.itemCount}</span></div>
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{formatCurrency(summary.subtotal, checkout.currency)}</span></div>
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Discount</span><span>{formatCurrency(summary.discountAmount, checkout.currency)}</span></div>
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Tax</span><span>{formatCurrency(summary.taxAmount, checkout.currency)}</span></div>
                            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900 dark:border-slate-700 dark:text-white"><span>Total</span><span>{formatCurrency(summary.total, checkout.currency)}</span></div>
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Tendered</span><span>{formatCurrency(checkout.tenderedAmount || 0, checkout.currency)}</span></div>
                            <div className="flex items-center justify-between text-base font-semibold text-emerald-700 dark:text-emerald-300"><span>Change Due</span><span>{formatCurrency(changeDue, checkout.currency)}</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading}>Complete Sale</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PosCheckoutModal;
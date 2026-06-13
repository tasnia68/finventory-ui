import React from 'react';
import { Badge, Button, Card } from '../../components/common';
import { formatCurrency } from './utils';

const formatExpiry = (date) => {
    if (!date) return null;
    try {
        return new Date(date).toLocaleDateString();
    } catch (_) {
        return date;
    }
};

const PosCartPanel = ({
    cart, summary, currency, customerName, terminalName, warehouseName,
    appliedCouponCodes = [], checkoutDisabled, holdDisabled,
    onQuantityChange, onPriceChange, onRemove, onClear, onCheckout, onHold,
    onBatchChange, onSerialsChange,
}) => {
    return (
        <Card className="sticky top-6 rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Receipt</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Current Sale</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{customerName || 'Walk-in customer'} • {terminalName || 'Select terminal'} • {warehouseName || 'Select warehouse'}</p>
                </div>
                <div className="text-right">
                    <Badge variant={cart.length > 0 ? 'info' : 'default'}>{summary.itemCount} items</Badge>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(summary.total, currency)}</p>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {cart.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Search or scan an item to start the receipt.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-[minmax(0,1.5fr)_74px_108px_108px_40px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            <span>Item</span>
                            <span>Qty</span>
                            <span>Price</span>
                            <span>Total</span>
                            <span />
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {cart.map((line) => {
                                const batches = Array.isArray(line.availableBatches) ? line.availableBatches : [];
                                const expiry = formatExpiry(line.batchExpiryDate);
                                const serialsNeeded = Number(line.quantity || 0);
                                const serialsEntered = Array.isArray(line.serialNumbers) ? line.serialNumbers.length : 0;
                                const serialsOk = !line.serialTracked || serialsEntered === serialsNeeded;
                                return (
                                    <div key={line.id} className="px-4 py-3">
                                        <div className="grid grid-cols-[minmax(0,1.5fr)_74px_108px_108px_40px] items-center gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-slate-900 dark:text-white">{line.sku}</p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{line.description}</p>
                                                {line.onHand !== null && line.onHand !== undefined ? (
                                                    <p className={`mt-1 text-[11px] font-medium ${line.quantity > line.onHand ? 'text-rose-500' : 'text-slate-400'}`}>
                                                        {line.quantity > line.onHand ? `Exceeds stock (${line.onHand})` : `${line.onHand} on hand`}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={line.quantity}
                                                onChange={(event) => onQuantityChange(line.id, event.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unitPrice}
                                                onChange={(event) => onPriceChange(line.id, event.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(line.lineTotal, currency)}</div>
                                            <button onClick={() => onRemove(line.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-700">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                        {line.batchTracked || line.serialTracked ? (
                                            <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                                                {line.batchTracked ? (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Batch (FEFO)</span>
                                                        {batches.length === 0 ? (
                                                            <span className="text-xs font-medium text-rose-600">No available batches</span>
                                                        ) : (
                                                            <select
                                                                value={line.batchId || ''}
                                                                onChange={(e) => onBatchChange && onBatchChange(line.id, e.target.value)}
                                                                className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs dark:border-amber-700 dark:bg-slate-800"
                                                            >
                                                                {batches.map((b) => (
                                                                    <option key={b.id} value={b.id}>
                                                                        {b.batchNumber}{b.expiryDate ? ` · exp ${formatExpiry(b.expiryDate)}` : ''} · {b.availableQuantity} avail
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {expiry ? <span className="text-[11px] text-amber-700 dark:text-amber-300">Expires {expiry}</span> : null}
                                                    </div>
                                                ) : null}
                                                {line.serialTracked ? (
                                                    <div>
                                                        <div className="mb-1 flex items-center justify-between">
                                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Serial numbers</span>
                                                            <span className={`text-[11px] font-medium ${serialsOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                                {serialsEntered} / {serialsNeeded}
                                                            </span>
                                                        </div>
                                                        <textarea
                                                            rows={Math.min(6, Math.max(2, serialsNeeded))}
                                                            value={(line.serialNumbers || []).join('\n')}
                                                            onChange={(e) => onSerialsChange && onSerialsChange(line.id, e.target.value)}
                                                            placeholder={`Scan or paste serial numbers, one per line\nSN-001\nSN-002`}
                                                            className="block w-full rounded-md border border-amber-200 bg-white px-2 py-1 font-mono text-xs dark:border-amber-700 dark:bg-slate-800"
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(summary.subtotal, currency)}</span>
                </div>
                {appliedCouponCodes.length > 0 ? (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Applied Coupons</div>
                        <div className="flex flex-wrap gap-2">
                            {appliedCouponCodes.map((code) => (
                                <Badge key={code} variant="info">{code}</Badge>
                            ))}
                        </div>
                    </div>
                ) : null}
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Discount</span>
                    <span>{formatCurrency(summary.discountAmount, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Tax</span>
                    <span>{formatCurrency(summary.taxAmount, currency)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900 dark:border-slate-700 dark:text-white">
                    <span>Total</span>
                    <span>{formatCurrency(summary.total, currency)}</span>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
                <Button className="w-full" icon="point_of_sale" onClick={onCheckout} disabled={cart.length === 0 || checkoutDisabled}>Checkout</Button>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={onClear} disabled={cart.length === 0}>Clear</Button>
                    <Button variant="secondary" icon="pause_circle" onClick={onHold} disabled={cart.length === 0 || holdDisabled}>Hold</Button>
                </div>
            </div>
            {checkoutDisabled ? <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300">Select a counter and open its shift before posting this sale.</p> : null}
        </Card>
    );
};

export default PosCartPanel;
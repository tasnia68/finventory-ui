import React from 'react';
import { Badge, Button, Card, Input } from '../../components/common';
import { formatCurrency } from './utils';

const PosCartPanel = ({ cart, summary, currency, customerName, terminalName, warehouseName, appliedCouponCodes = [], checkoutDisabled, onQuantityChange, onPriceChange, onRemove, onClear, onCheckout }) => {
    return (
        <Card className="sticky top-6 rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Basket</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Current Sale</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{customerName || 'Walk-in customer'} • {terminalName || 'Select terminal'} • {warehouseName || 'Select warehouse'}</p>
                </div>
                <Badge variant={cart.length > 0 ? 'info' : 'default'}>{summary.itemCount} items</Badge>
            </div>

            <div className="mt-6 space-y-3">
                {cart.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Scan a barcode or add a product from the catalog to begin the sale.
                    </div>
                ) : cart.map((line) => (
                    <div key={line.id} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900 dark:text-white">{line.sku}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{line.description}</p>
                                {line.onHand !== null && line.onHand !== undefined ? (
                                    <p className={`mt-2 text-xs font-medium ${line.quantity > line.onHand ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {line.quantity > line.onHand ? `Requested quantity exceeds on-hand (${line.onHand})` : `${line.onHand} on hand`}
                                    </p>
                                ) : null}
                            </div>
                            <button onClick={() => onRemove(line.id)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-700">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <Input label="Qty" type="number" min="1" step="1" value={line.quantity} onChange={(event) => onQuantityChange(line.id, event.target.value)} />
                            <Input label="Unit Price" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => onPriceChange(line.id, event.target.value)} />
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Line Total</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(line.lineTotal, currency)}</span>
                        </div>
                    </div>
                ))}
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

            <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={onClear} disabled={cart.length === 0}>Clear</Button>
                <Button icon="point_of_sale" onClick={onCheckout} disabled={cart.length === 0 || checkoutDisabled}>Checkout</Button>
            </div>
            {checkoutDisabled ? <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-300">Select a counter and open its shift before posting this sale.</p> : null}
        </Card>
    );
};

export default PosCartPanel;
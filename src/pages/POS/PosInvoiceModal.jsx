import React from 'react';
import { Badge, Button, Modal } from '../../components/common';
import { formatCurrency, formatDateTime, getSaleSyncVariant } from './utils';

const PosInvoiceModal = ({ sale, isOpen, onClose, onPrint }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={sale?.invoiceNumber || 'Invoice'} size="lg">
            {sale ? (
                <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Receipt</p>
                            <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{sale.invoiceNumber}</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(sale.createdAt)} • {sale.cashierName}</p>
                        </div>
                        <Badge variant={getSaleSyncVariant(sale.syncStatus)}>{sale.syncStatus.replaceAll('_', ' ')}</Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</p>
                            <p className="mt-2 font-semibold text-slate-900 dark:text-white">{sale.customerName}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Warehouse: {sale.warehouseName}</p>
                            {Array.isArray(sale.appliedCouponCodes) && sale.appliedCouponCodes.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {sale.appliedCouponCodes.map((code) => <Badge key={code} variant="info">{code}</Badge>)}
                                </div>
                            ) : null}
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Payment</p>
                            <p className="mt-2 font-semibold text-slate-900 dark:text-white">{sale.paymentMethod}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tendered {formatCurrency(sale.tenderedAmount, sale.currency)}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-[1.6fr_0.6fr_0.8fr_0.8fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:border-slate-700">
                            <span>Item</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Price</span>
                            <span className="text-right">Total</span>
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {sale.items.map((item) => (
                                <div key={item.id} className="grid grid-cols-[1.6fr_0.6fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{item.sku}</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                                    </div>
                                    <span className="text-right text-slate-600 dark:text-slate-300">{item.quantity}</span>
                                    <span className="text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.unitPrice, sale.currency)}</span>
                                    <span className="text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(item.lineTotal, sale.currency)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="ml-auto w-full max-w-sm space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{formatCurrency(sale.subtotal, sale.currency)}</span></div>
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Discount</span><span>{formatCurrency(sale.discountAmount, sale.currency)}</span></div>
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400"><span>Tax</span><span>{formatCurrency(sale.taxAmount, sale.currency)}</span></div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900 dark:border-slate-700 dark:text-white"><span>Total</span><span>{formatCurrency(sale.total, sale.currency)}</span></div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <Button variant="secondary" onClick={onClose}>Close</Button>
                        <Button icon="print" onClick={() => onPrint(sale)}>Print Receipt</Button>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
};

export default PosInvoiceModal;
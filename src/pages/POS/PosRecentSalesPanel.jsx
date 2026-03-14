import React from 'react';
import { Badge, Button, Card } from '../../components/common';
import { formatCurrency, formatDateTime, getSaleSyncVariant } from './utils';

const PosRecentSalesPanel = ({ sales, currency, onOpenInvoice, onSyncQueued, syncing, online }) => {
    return (
        <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Recent Activity</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Sales Journal</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Recent POS tickets, sync state, and receipt reprints for the current cashier.</p>
                </div>
                <Button variant="secondary" icon="sync" onClick={onSyncQueued} loading={syncing} disabled={!online}>Sync Offline Sales</Button>
            </div>

            <div className="mt-6 space-y-3">
                {sales.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No POS sales recorded yet for this cashier.
                    </div>
                ) : sales.map((sale) => (
                    <div key={sale.id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-white">{sale.invoiceNumber}</p>
                                <Badge variant={getSaleSyncVariant(sale.syncStatus)}>{sale.syncStatus.replaceAll('_', ' ')}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sale.customerName} • {formatDateTime(sale.createdAt)} • {sale.paymentMethod} • {sale.terminalName || 'POS terminal'}</p>
                            {sale.syncError ? <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">{sale.syncError}</p> : null}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(sale.total, currency)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{sale.itemCount} items</p>
                            </div>
                            <Button variant="secondary" icon="receipt_long" onClick={() => onOpenInvoice(sale)}>Invoice</Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default PosRecentSalesPanel;
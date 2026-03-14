import React from 'react';
import { Badge, Button, Card } from '../../components/common';
import { formatCurrency, getStockTone } from './utils';

const stockBadgeClass = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

const PosProductGrid = ({ products, loading, onAdd }) => {
    if (loading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <Card className="rounded-3xl border-dashed">
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <span className="material-symbols-outlined text-[42px] text-slate-300 dark:text-slate-600">scan_search</span>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No sellable variants found</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try barcode input, SKU search, or a different category filter.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card padding="none" className="overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(120px,0.7fr)_120px_120px_116px] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <span>Item</span>
                <span>Barcode</span>
                <span>Stock</span>
                <span>Unit Price</span>
                <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {products.map((product) => {
                    const stockTone = getStockTone(product.onHand);
                    return (
                        <div key={product.id} className="grid grid-cols-[minmax(0,1.8fr)_minmax(120px,0.7fr)_120px_120px_116px] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/20">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{product.sku}</p>
                                    <Badge size="sm" variant="info">SELLABLE</Badge>
                                </div>
                                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{product.description}</p>
                            </div>
                            <div className="truncate text-sm text-slate-500 dark:text-slate-400">{product.barcode || 'No barcode'}</div>
                            <div>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stockBadgeClass[stockTone]}`}>
                                    {product.onHand === null || product.onHand === undefined ? 'Stock not loaded' : `${product.onHand} on hand`}
                                </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(product.price)}</div>
                            <div className="flex justify-end">
                                <Button size="sm" icon="add" onClick={() => onAdd(product)}>Add</Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default PosProductGrid;
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {products.map((product) => {
                const stockTone = getStockTone(product.onHand);
                return (
                    <Card key={product.id} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{product.sku}</p>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{product.description}</p>
                            </div>
                            <Badge variant="info">POS</Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                            {product.barcode ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                                    Barcode {product.barcode}
                                </span>
                            ) : null}
                            <span className={`rounded-full px-2.5 py-1 font-medium ${stockBadgeClass[stockTone]}`}>
                                {product.onHand === null || product.onHand === undefined ? 'Stock not loaded' : `${product.onHand} on hand`}
                            </span>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Unit Price</p>
                                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(product.price)}</p>
                            </div>
                            <Button icon="add_shopping_cart" onClick={() => onAdd(product)}>Add to Cart</Button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default PosProductGrid;
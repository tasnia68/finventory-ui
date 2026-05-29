import React from 'react';
import { formatCurrency } from '../../Sales/utils';

const ItemsCard = ({ order }) => (
    <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Items</div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                            <th className="py-2 pr-2">Variant</th>
                            <th className="py-2 pr-2">Ord</th>
                            <th className="py-2 pr-2">Ship</th>
                            <th className="py-2 pr-2">Deliv</th>
                            <th className="py-2 pr-2">Retn</th>
                            <th className="py-2 pr-2">Cnc</th>
                            <th className="py-2 pr-2 text-right">Unit</th>
                            <th className="py-2 pr-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.items || []).map((item) => (
                            <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="py-2 pr-2">
                                    <div className="font-semibold">{item.sku || item.productVariantName}</div>
                                    <div className="text-xs text-slate-500">{item.productVariantName}</div>
                                </td>
                                <td className="py-2 pr-2">{item.quantity}</td>
                                <td className="py-2 pr-2">{item.shippedQuantity || 0}</td>
                                <td className="py-2 pr-2">{item.fulfilledQuantity || 0}</td>
                                <td className="py-2 pr-2">{item.returnedQuantity || 0}</td>
                                <td className="py-2 pr-2">{item.cancelledQuantity || 0}</td>
                                <td className="py-2 pr-2 text-right">{formatCurrency(item.unitPrice, order.currency)}</td>
                                <td className="py-2 pr-2 text-right">{formatCurrency(item.totalPrice, order.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

export default ItemsCard;

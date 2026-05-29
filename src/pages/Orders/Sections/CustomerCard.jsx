import React from 'react';
import { formatDate } from '../../Sales/utils';

const KV = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="text-right text-slate-900 dark:text-slate-100">{value ?? '—'}</span>
    </div>
);

const CustomerCard = ({ order }) => (
    <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <KV label="Name" value={order.customerName} />
            <KV label="Warehouse" value={order.warehouseName || '—'} />
            <KV label="Expected delivery" value={formatDate(order.expectedDeliveryDate)} />
            <KV label="Priority" value={order.priority} />
            {order.notes ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                    {order.notes}
                </div>
            ) : null}
            {order.holdReason ? (
                <div className="mt-3 rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                    Hold reason: {order.holdReason}
                </div>
            ) : null}
        </div>
    </div>
);

export default CustomerCard;

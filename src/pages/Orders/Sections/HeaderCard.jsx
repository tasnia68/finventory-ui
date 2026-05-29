import React from 'react';
import { Badge } from '../../../components/common';
import { formatCurrency, formatDateTime, getSalesOrderStatusVariant } from '../../Sales/utils';

const HeaderCard = ({ order }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">{order.soNumber}</span>
                    <Badge variant={getSalesOrderStatusVariant(order.status)}>{order.status}</Badge>
                    {order.holdReason ? <Badge variant="warning" title={order.holdReason}>On hold</Badge> : null}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                    Placed {formatDateTime(order.orderDate)} • {order.salesChannel || 'SALES_ORDER'}
                    {order.externalSource ? ` • ${order.externalSource} #${order.externalOrderRef || order.externalOrderId}` : ''}
                </div>
            </div>
            <div className="shrink-0 text-right">
                <div className="text-xs text-slate-500">Order value</div>
                <div className="text-xl font-bold tabular-nums">{formatCurrency(order.totalAmount, order.currency)}</div>
                {order.codAmount ? <div className="mt-1 text-xs text-slate-500">COD {formatCurrency(order.codAmount, order.currency)}</div> : null}
            </div>
        </div>
    </div>
);

export default HeaderCard;

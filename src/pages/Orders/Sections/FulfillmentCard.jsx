import React from 'react';
import { Badge, Button } from '../../../components/common';

const KV = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="text-right text-slate-900 dark:text-slate-100">{value ?? '—'}</span>
    </div>
);

const FulfillmentCard = ({ order, onSteadfastReturn }) => (
    <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fulfillment</div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <KV label="Delivery zone" value={order.deliveryZone || '—'} />
            <KV
                label="Courier profile"
                value={order.courierProfileId ? <span className="font-mono text-xs">{order.courierProfileId}</span> : '—'}
            />
            {Array.isArray(order.shipments) && order.shipments.length > 0 ? (
                <div className="mt-2 space-y-2">
                    {order.shipments.map((s) => (
                        <div key={s.id} className="rounded border border-slate-200 p-3 text-sm dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-semibold">{s.shipmentNumber}</span>
                                <Badge variant="info">{s.courierDispatchStatus || s.status}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                {s.courierProvider || 'No courier'} {s.trackingNumber ? `• ${s.trackingNumber}` : ''}
                            </div>
                            {s.trackingUrl ? (
                                <a className="text-xs text-blue-600 hover:underline" href={s.trackingUrl} target="_blank" rel="noreferrer">Track →</a>
                            ) : null}
                            {s.courierProvider === 'STEADFAST' && s.courierReference ? (
                                <div className="mt-2">
                                    <Button size="sm" variant="ghost" onClick={() => onSteadfastReturn(s.id)}>Request Steadfast return</Button>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    </div>
);

export default FulfillmentCard;

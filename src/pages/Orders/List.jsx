import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Input } from '../../components/common';
import { getSalesOrders } from '../../services/salesOrderService';
import { formatCurrency, getSalesOrderStatusVariant } from '../Sales/utils';
import { STATUS_TABS, ageLabel, toList } from './constants';

const OrdersList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState('');

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 4000);
    };

    const loadList = async () => {
        try {
            setLoading(true);
            const data = await getSalesOrders({ size: 200, sortBy: 'orderDate', sortDirection: 'desc' });
            setOrders(toList(data));
        } catch (e) {
            showAlert('error', e.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadList(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (statusTab && o.status !== statusTab) return false;
            if (!q) return true;
            return [o.soNumber, o.customerName, o.externalOrderId]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
    }, [orders, search, statusTab]);

    const statusCounts = useMemo(() => {
        const counts = {};
        for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
        return counts;
    }, [orders]);

    return (
        <div className="flex-1 overflow-hidden bg-background-light p-6 dark:bg-background-dark">
            <div className="mx-auto h-full max-w-7xl flex flex-col gap-4">
                {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Orders</h1>
                        <span className="text-sm text-slate-500">{filtered.length} / {orders.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search SO#, customer, external ID"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-72"
                        />
                        <Button variant="secondary" onClick={loadList}>Refresh</Button>
                    </div>
                </div>

                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
                    {(() => {
                        // Always show "All" + the active tab + tabs with non-zero counts.
                        // Hide zero-count tabs behind a "More" dropdown so the strip stays scannable.
                        const visible = STATUS_TABS.filter((tab) => {
                            if (!tab.key) return true; // All
                            if (statusTab === tab.key) return true;
                            return (statusCounts[tab.key] || 0) > 0;
                        });
                        const hidden = STATUS_TABS.filter((tab) => tab.key && !visible.some((v) => v.key === tab.key));
                        return (
                            <>
                                <div className="flex flex-wrap gap-1">
                                    {visible.map((tab) => {
                                        const count = tab.key ? (statusCounts[tab.key] || 0) : orders.length;
                                        const isActive = statusTab === tab.key;
                                        return (
                                            <button
                                                key={tab.key || 'all'}
                                                onClick={() => setStatusTab(tab.key)}
                                                className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                                    isActive
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                }`}
                                            >
                                                {tab.label} <span className="ml-1 text-xs text-slate-400">{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {hidden.length > 0 ? (
                                    <div className="ml-auto">
                                        <select
                                            value=""
                                            onChange={(e) => e.target.value && setStatusTab(e.target.value)}
                                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                        >
                                            <option value="">More ({hidden.length})…</option>
                                            {hidden.map((tab) => <option key={tab.key} value={tab.key}>{tab.label} (0)</option>)}
                                        </select>
                                    </div>
                                ) : null}
                            </>
                        );
                    })()}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="h-full overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-sm text-slate-500">Loading…</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-6 text-sm text-slate-500">No orders match this filter.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((o) => (
                                    <li
                                        key={o.id}
                                        onClick={() => navigate(`/orders/${o.id}`)}
                                        className="cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{o.soNumber}</span>
                                            <Badge variant={getSalesOrderStatusVariant(o.status)}>{o.status}</Badge>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                            <span className="truncate">{o.customerName || '—'}</span>
                                            <span>{ageLabel(o.orderDate)}</span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs">
                                            <span className="text-slate-400">{o.externalSource || o.salesChannel || 'SALES_ORDER'}</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                {formatCurrency(o.totalAmount, o.currency)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdersList;

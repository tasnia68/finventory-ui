import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { getSalesOrders } from '../../services/salesOrderService';
import { formatCurrency, getSalesOrderStatusVariant } from '../Sales/utils';
import { STATUS_TABS, ageLabel, toList } from './constants';

const formatOrderDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

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

    const columns = useMemo(() => ([
        {
            key: 'soNumber',
            header: 'SO #',
            className: 'w-36',
            render: (value) => (
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
            ),
        },
        {
            key: 'customerName',
            header: 'Customer',
            className: 'max-w-[260px]',
            render: (value) => (
                <span className="block truncate text-slate-800 dark:text-slate-100">{value || '—'}</span>
            ),
        },
        {
            key: 'channel',
            header: 'Channel',
            className: 'w-40',
            render: (_, row) => (
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {row.externalSource || row.salesChannel || 'SALES_ORDER'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            className: 'w-32',
            render: (value) => (
                <Badge variant={getSalesOrderStatusVariant(value)}>{value}</Badge>
            ),
        },
        {
            key: 'totalAmount',
            header: 'Total',
            className: 'w-32 text-right',
            render: (value, row) => (
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(value, row.currency)}
                </span>
            ),
        },
        {
            key: 'orderDate',
            header: 'Order date',
            className: 'w-44',
            render: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formatOrderDate(value)}
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">· {ageLabel(value)} ago</span>
                </span>
            ),
        },
    ]), []);

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

                <Card padding="none" className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full overflow-auto">
                        <DataTable
                            columns={columns}
                            data={filtered}
                            loading={loading}
                            emptyMessage="No orders match this filter."
                            onRowClick={(row) => navigate(`/orders/${row.id}`)}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OrdersList;

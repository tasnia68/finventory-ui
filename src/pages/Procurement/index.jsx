import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card, DataTable, MetricCard } from '../../components/common';
import { getProcurementOverview } from '../../services/procurementService';

const formatNumber = (value) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

const QUICK_LINKS = [
    { title: 'Suppliers', path: '/suppliers', icon: 'business', caption: 'Vendor records, documents, terms' },
    { title: 'Purchase Orders', path: '/purchase-orders', icon: 'request_quote', caption: 'Cut and track POs' },
    { title: 'Goods Receipts', path: '/goods-receipts', icon: 'inventory_2', caption: 'Receive deliveries against POs' },
    { title: 'Requisitions', path: '/purchase-requisitions', icon: 'edit_note', caption: 'Internal demand, convert to PO' },
];

const Procurement = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getProcurementOverview();
            setOverview(data?.data || data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message || 'Failed to load procurement overview' });
        } finally {
            setLoading(false);
        }
    };

    const recentReceiptColumns = [
        {
            key: 'grnNumber',
            header: 'GRN',
            render: (value, row) => (
                <div>
                    <div className="font-mono text-sm font-semibold">{value}</div>
                    <div className="text-xs text-slate-500">{row.supplierName || '—'}</div>
                </div>
            ),
        },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : value === 'CANCELLED' ? 'danger' : 'warning'}>{value}</Badge> },
        { key: 'receivedAt', header: 'Received', render: (value) => <span className="text-xs text-slate-500">{formatDateTime(value)}</span> },
        { key: 'value', header: 'Value', render: (value) => <span className="tabular-nums">{formatNumber(value)}</span> },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-6 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Procurement</div>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
                    <p className="mt-1 text-sm text-slate-500">Posted across requisitions, POs, receipts and the GRNI accrual.</p>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MetricCard title="Open requisitions" value={overview?.openRequisitions ?? 0} caption="Submitted or approved, awaiting action" icon="edit_note" tone="amber" />
                    <MetricCard title="Open POs" value={overview?.openPurchaseOrders ?? 0} caption="Pending, approved, issued, or partially received" icon="request_quote" tone="blue" />
                    <MetricCard title="Pending receipts" value={overview?.pendingReceipts ?? 0} caption="POs issued but not yet fully received" icon="inventory_2" tone="rose" />
                    <MetricCard title="GRNI accrual" value={formatNumber(overview?.grniAccrualBalance ?? 0)} caption="Goods received, supplier invoice not yet posted" icon="account_balance" tone="violet" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {QUICK_LINKS.map((link) => (
                        <Link key={link.path} to={link.path} className="block">
                            <Card className="h-full transition-transform duration-150 hover:-translate-y-0.5" title={link.title} subtitle={link.caption}>
                                <span className="material-symbols-outlined rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {link.icon}
                                </span>
                            </Card>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card padding="none" className="overflow-hidden" title="Top suppliers" subtitle="By total PO value (excludes cancelled/rejected)">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(overview?.topSuppliers || []).length === 0 ? (
                                <div className="p-6 text-sm text-slate-500">No supplier data yet.</div>
                            ) : (
                                (overview?.topSuppliers || []).map((s) => (
                                    <div key={s.supplierId} className="flex items-center justify-between px-4 py-3">
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-white">{s.supplierName}</div>
                                            <div className="text-xs text-slate-500">{s.orderCount} order{s.orderCount === 1 ? '' : 's'}</div>
                                        </div>
                                        <div className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {formatNumber(s.totalSpend)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    <Card padding="none" className="overflow-hidden" title="Recent receipts" subtitle="Last 10 GRNs across all suppliers">
                        <DataTable
                            columns={recentReceiptColumns}
                            data={overview?.recentReceipts || []}
                            loading={loading}
                            emptyMessage="No goods receipts on file."
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Procurement;

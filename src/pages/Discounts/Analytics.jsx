import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    DataTable,
    Input,
    MetricCard,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { getDiscountAnalytics } from '../../services/discountService';
import { getRoleNames, toList } from './constants';

const DiscountsAnalytics = () => {
    const { user } = useAuth();
    const roleNames = useMemo(() => getRoleNames(user), [user]);
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState({ from: '', to: '' });
    const [alert, setAlert] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadAnalytics = async () => {
        if (!canManage) return;
        try {
            setLoading(true);
            const data = await getDiscountAnalytics({
                from: range.from || undefined,
                to: range.to || undefined,
            });
            setAnalytics(data);
        } catch (error) {
            setAnalytics(null);
            showAlert('error', error.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discount analytics</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Track redemption performance over time
                    </p>
                </div>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <div className="mb-4 flex flex-wrap items-end gap-3">
                    <Input
                        label="From"
                        type="date"
                        value={range.from}
                        onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                    />
                    <Input
                        label="To"
                        type="date"
                        value={range.to}
                        onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                    />
                    <Button onClick={loadAnalytics} loading={loading}>Apply</Button>
                </div>
                {analytics ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <MetricCard title="Total Applied" value={analytics.totalApplied ?? 0} icon="check_circle" tone="emerald" />
                            <MetricCard title="Total Flagged" value={analytics.totalFlagged ?? 0} icon="flag" tone="amber" />
                            <MetricCard title="Total Discount" value={analytics.totalDiscountAmount ?? 0} icon="payments" tone="blue" />
                        </div>
                        <div className="mt-6">
                            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">Per Discount</h3>
                            <DataTable
                                columns={[
                                    { key: 'discountName', header: 'Name' },
                                    { key: 'appliedCount', header: 'Applied' },
                                    { key: 'totalDiscount', header: 'Total Discount' },
                                    { key: 'uniqueCustomers', header: 'Customers' },
                                ]}
                                data={toList(analytics.perDiscount)}
                                emptyMessage="No usage in range"
                            />
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No analytics data</p>
                )}
            </Card>
        </div>
    );
};

export default DiscountsAnalytics;

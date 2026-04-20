import React, { useEffect, useState, useMemo } from 'react';
import { getStorefrontAnalytics } from '../../services/storefrontService';

const fmt = (v) => (v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00');

const StorefrontAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');

  const { from, to } = useMemo(() => {
    const today = new Date();
    const d = new Date(today);
    d.setDate(d.getDate() - Number(range));
    return { from: d.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }, [range]);

  useEffect(() => {
    setLoading(true);
    getStorefrontAnalytics(from, to)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center py-16">Loading analytics…</div>;
  }

  if (!data) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center py-16">Failed to load analytics data.</div>;
  }

  const maxDailyRev = data.dailyRevenue?.length ? Math.max(...data.dailyRevenue.map((d) => Number(d.revenue) || 0), 1) : 1;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Storefront Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Web order performance overview</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Orders" value={data.totalOrders} />
        <KpiCard label="Total Revenue" value={fmt(data.totalRevenue)} prefix="$" />
        <KpiCard label="Avg Order Value" value={fmt(data.averageOrderValue)} prefix="$" />
        <KpiCard label="New Customers" value={data.newCustomers} />
      </div>

      {/* Daily Revenue Chart */}
      {data.dailyRevenue?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Daily Revenue</h2>
          <div className="flex items-end gap-[2px] h-40">
            {data.dailyRevenue.map((d) => {
              const pct = (Number(d.revenue) / maxDailyRev) * 100;
              return (
                <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t transition-all"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <div className="absolute -top-8 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {d.date}: ${fmt(d.revenue)} ({d.orders} orders)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders by Status */}
        {data.ordersByStatus?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Orders by Status</h2>
            <div className="space-y-2">
              {data.ordersByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{s.status.replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Products */}
        {data.topProducts?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Products</h2>
            <div className="space-y-3">
              {data.topProducts.map((p) => (
                <div key={p.sku} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-900 dark:text-white">{p.productName}</span>
                    <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-gray-900 dark:text-white">${fmt(p.totalRevenue)}</span>
                    <span className="text-gray-400 ml-2 text-xs">×{Number(p.totalQuantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, prefix = '' }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
      {prefix}{value}
    </p>
  </div>
);

export default StorefrontAnalytics;

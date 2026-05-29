import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardStats from '../../components/dashboard/DashboardStats';
import StockTrendsChart from '../../components/dashboard/StockTrendsChart';
import InventoryByCategory from '../../components/dashboard/InventoryByCategory';
import RecentItemsTable from '../../components/dashboard/RecentItemsTable';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCachedSetting, useSettings } from '../../contexts/SettingsContext';
import { Alert, Button, Select } from '../../components/common';
import { getAnalyticsDashboardSummary, getCurrentStockReport, getStockMovementReport } from '../../services/reportingService';
import { getWarehouses } from '../../services/warehouseService';

const PERIOD_OPTIONS = [
  { value: '7', labelKey: 'dashboard.last7Days' },
  { value: '30', labelKey: 'dashboard.last30Days' },
  { value: '90', labelKey: 'dashboard.last90Days' },
];

const toList = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.content && Array.isArray(data.content)) return data.content;
  if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
};

const formatDateParam = (value) => value.toISOString().slice(0, 10);

const buildRange = (period) => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (Number(period) - 1));

  return {
    fromDate: formatDateParam(startDate),
    toDate: formatDateParam(endDate),
  };
};

const getSignedQuantity = (movement) => {
  const quantity = Number(movement?.quantity || 0);
  switch (movement?.type) {
    case 'OUT':
    case 'TRANSFER_OUT':
      return quantity * -1;
    case 'IN':
    case 'TRANSFER_IN':
      return quantity;
    default:
      return quantity;
  }
};

const formatCompactNumber = (value) => {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }
  return `${number.toFixed(0)}`;
};

const formatTaka = (formatCurrency, value, options = {}) => formatCurrency(value, {
  currency: 'BDT',
  ...options,
});

const Dashboard = () => {
  const { user } = useAuth();
  const { formatCurrency, formatNumber, t } = useLanguage();
  const { getSetting } = useSettings();
  const displayName = user?.firstName || user?.email?.split('@')[0] || 'Alex';
  const [filters, setFilters] = useState({ warehouseId: '', period: getCachedSetting('analytics.dashboard.defaultDateRange', '30') });
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stockReport, setStockReport] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const defaultRange = getSetting('analytics.dashboard.defaultDateRange', '30');
    if (defaultRange !== filters.period && filters.period === '30') {
      setFilters((current) => ({ ...current, period: defaultRange }));
    }
  }, [filters.period, getSetting]);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        setWarehouses(toList(await getWarehouses()));
      } catch (warehouseError) {
        console.error('Failed to load warehouses for dashboard filters:', warehouseError);
      }
    };

    loadWarehouses();
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const range = buildRange(filters.period);
        const params = {
          warehouseId: filters.warehouseId || undefined,
          fromDate: range.fromDate,
          toDate: range.toDate,
        };

        const [summaryResponse, stockResponse, movementResponse] = await Promise.all([
          getAnalyticsDashboardSummary(params),
          getCurrentStockReport(params),
          getStockMovementReport(params),
        ]);

        setSummary(summaryResponse || null);
        setStockReport(toList(stockResponse));
        setStockMovements(toList(movementResponse));
      } catch (loadError) {
        console.error('Failed to load dashboard:', loadError);
        setError(loadError.message || t('dashboard.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [filters.period, filters.warehouseId, t]);

  const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({
    value: warehouse.id,
    label: warehouse.name,
  })), [warehouses]);

  const periodOptions = useMemo(() => PERIOD_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  })), [t]);

  const trendData = useMemo(() => {
    const days = Number(filters.period);
    const { fromDate } = buildRange(filters.period);
    const startDate = new Date(`${fromDate}T00:00:00`);
    const buckets = new Map();

    for (let index = 0; index < days; index += 1) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + index);
      const key = formatDateParam(currentDate);
      buckets.set(key, {
        key,
        label: currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: 0,
      });
    }

    stockMovements.forEach((movement) => {
      if (!movement?.movementDate) {
        return;
      }

      const key = formatDateParam(new Date(movement.movementDate));
      if (!buckets.has(key)) {
        return;
      }

      buckets.get(key).value += getSignedQuantity(movement);
    });

    return Array.from(buckets.values());
  }, [filters.period, stockMovements]);

  const topInventory = useMemo(() => {
    const items = [...stockReport]
      .sort((left, right) => Number(right?.totalValue || 0) - Number(left?.totalValue || 0))
      .slice(0, 4);

    const totalTrackedValue = items.reduce((sum, item) => sum + Number(item?.totalValue || 0), 0);

    return items.map((item) => ({
      ...item,
      share: totalTrackedValue > 0 ? (Number(item?.totalValue || 0) / totalTrackedValue) * 100 : 0,
    }));
  }, [stockReport]);

  const recentMovements = useMemo(() => {
    return [...stockMovements]
      .sort((left, right) => new Date(right?.movementDate || 0) - new Date(left?.movementDate || 0))
      .slice(0, 6);
  }, [stockMovements]);

  const netFlow = useMemo(() => trendData.reduce((sum, point) => sum + Number(point.value || 0), 0), [trendData]);

  const summaryHighlights = useMemo(() => [
    {
      label: 'Net stock flow',
      value: loading ? '...' : formatCompactNumber(netFlow),
      tone: netFlow >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300',
    },
    {
      label: 'Tracked SKUs',
      value: loading ? '...' : formatCompactNumber(stockReport.length),
      tone: 'text-slate-900 dark:text-white',
    },
    {
      label: 'Open orders',
      value: loading ? '...' : formatCompactNumber(Number(summary?.openPurchaseOrders || 0) + Number(summary?.openSalesOrders || 0)),
      tone: 'text-slate-900 dark:text-white',
    },
  ], [loading, netFlow, stockReport.length, summary?.openPurchaseOrders, summary?.openSalesOrders]);

  const warehouseLabel = warehouses.find((warehouse) => warehouse.id === filters.warehouseId)?.name || t('dashboard.allWarehouses');
  const rangeLabel = periodOptions.find((option) => option.value === filters.period)?.label || t('dashboard.last30Days');

  const operationalSignals = [
    {
      title: 'Warehouse utilization',
      value: loading ? '...' : `${formatNumber(summary?.averageWarehouseUtilization || 0)}%`,
      caption: 'Space pressure across the active warehouse scope.',
      icon: 'stacked_bar_chart',
    },
    {
      title: 'Fulfillment rate',
      value: loading ? '...' : `${formatNumber(summary?.orderFulfillmentRate || 0)}%`,
      caption: 'Customer demand served without delay in the current window.',
      icon: 'local_shipping',
    },
    {
      title: 'Open purchase orders',
      value: loading ? '...' : formatNumber(summary?.openPurchaseOrders || 0),
      caption: 'Inbound supply still expected into stock.',
      icon: 'inventory',
    },
    {
      title: 'Open sales orders',
      value: loading ? '...' : formatNumber(summary?.openSalesOrders || 0),
      caption: 'Outbound demand still waiting to be fulfilled.',
      icon: 'shopping_cart',
    },
  ];

  const quickActions = [
    { to: '/products/create/simple', label: t('common.addNewItem'), icon: 'add_circle' },
    { to: '/goods-receipts', label: 'Receive stock', icon: 'warehouse' },
    { to: '/sales-orders', label: 'Review demand', icon: 'monitoring' },
    { to: '/analytics/reports', label: 'Open reports', icon: 'insights' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.9fr)]">
            <div className="space-y-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Dashboard
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {t('dashboard.welcomeBack', { name: displayName })}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t('dashboard.todaySummary')}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700">
                    <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                    <span>{action.label}</span>
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {summaryHighlights.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</div>
                    <div className={`mt-1.5 text-xl font-semibold ${item.tone}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Dashboard scope</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Refine warehouse and time window.</p>
                </div>
                <Button icon="sync" loading={loading} onClick={() => setFilters((current) => ({ ...current }))} className="shrink-0">
                  {t('dashboard.refresh')}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Select
                  label={t('dashboard.warehouseScope')}
                  value={filters.warehouseId}
                  onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
                  options={warehouseOptions}
                  placeholder={t('dashboard.allWarehouses')}
                />
                <Select
                  label={t('dashboard.dateRange')}
                  value={filters.period}
                  onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))}
                  options={periodOptions}
                  placeholder={t('dashboard.last30Days')}
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Inventory value</div>
                <div className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {loading ? '...' : formatTaka(formatCurrency, summary?.totalInventoryValue || 0, { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current carrying value for {warehouseLabel} · {rangeLabel}.</div>
              </div>
            </div>
          </div>
        </div>

        {error ? <Alert type="error" message={error} onDismiss={() => setError('')} /> : null}

        <DashboardStats summary={summary} loading={loading} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {operationalSignals.map((signal) => (
            <div key={signal.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{signal.title}</div>
                  <div className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{signal.value}</div>
                </div>
                <span className="material-symbols-outlined rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{signal.icon}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{signal.caption}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StockTrendsChart data={trendData} loading={loading} period={filters.period} />
          <InventoryByCategory summary={summary} items={topInventory} loading={loading} />
        </div>
        <RecentItemsTable movements={recentMovements} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;

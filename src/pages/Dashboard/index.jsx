import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardStats from '../../components/dashboard/DashboardStats';
import StockTrendsChart from '../../components/dashboard/StockTrendsChart';
import InventoryByCategory from '../../components/dashboard/InventoryByCategory';
import RecentItemsTable from '../../components/dashboard/RecentItemsTable';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const displayName = user?.firstName || user?.email?.split('@')[0] || 'Alex';
  const [filters, setFilters] = useState({ warehouseId: '', period: '30' });
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stockReport, setStockReport] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.welcomeBack', { name: displayName })}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.todaySummary')}</p>
          </div>
          <Link to="/products/create/simple" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>{t('common.addNewItem')}</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
            <div className="flex items-end">
              <Button icon="sync" loading={loading} onClick={() => setFilters((current) => ({ ...current }))} className="w-full lg:w-auto">
                {t('dashboard.refresh')}
              </Button>
            </div>
          </div>
        </div>

        {error ? <Alert type="error" message={error} onDismiss={() => setError('')} /> : null}

        <DashboardStats summary={summary} loading={loading} />
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

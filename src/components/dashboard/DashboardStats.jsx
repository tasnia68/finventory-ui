import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const DashboardStats = ({ summary, loading }) => {
  const { formatCurrency, formatDateTime, formatNumber, t } = useLanguage();
  const metricValue = (value, formatter, suffix = '') => {
    if (loading) {
      return '...';
    }

    if (value === undefined || value === null) {
      return '--';
    }

    return `${formatter(value)}${suffix}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-primary text-[64px]">inventory_2</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalOnHand')}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metricValue(summary?.totalOnHandQuantity, formatNumber)}</p>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal">{t('dashboard.stats.onHandCaption')}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-blue-500 text-[64px]">deployed_code</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalAvailable')}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metricValue(summary?.totalAvailableQuantity, formatNumber)}</p>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal">{t('dashboard.stats.availableCaption')}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-mint-600 text-[64px]">payments</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalValue')}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metricValue(summary?.totalInventoryValue, (value) => formatCurrency(value, { maximumFractionDigits: 0 }))}</p>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal">{t('dashboard.stats.valueCaption')}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-orange-500 text-[64px]">notification_important</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.activeAlerts')}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metricValue(summary?.activeStockAlerts, formatNumber)}</p>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal">
            {summary?.generatedAt ? t('dashboard.stats.generatedAt', { value: formatDateTime(summary.generatedAt) }) : t('dashboard.stats.alertsCaption')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;

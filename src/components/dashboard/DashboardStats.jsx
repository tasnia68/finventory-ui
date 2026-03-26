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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[10rem] relative overflow-hidden group">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,_rgba(19,91,236,0.12),_transparent_40%)]" />
        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-primary text-[72px]">inventory_2</span>
        </div>
        <div className="relative">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalOnHand')}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{metricValue(summary?.totalOnHandQuantity, formatNumber)}</p>
        </div>
        <div className="relative flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal leading-5">{t('dashboard.stats.onHandCaption')}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[10rem] relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_40%)]" />
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-blue-500 text-[72px]">deployed_code</span>
        </div>
        <div className="relative">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalAvailable')}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{metricValue(summary?.totalAvailableQuantity, formatNumber)}</p>
        </div>
        <div className="relative flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal leading-5">{t('dashboard.stats.availableCaption')}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[10rem] relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_40%)]" />
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-mint-600 text-[72px]">payments</span>
        </div>
        <div className="relative">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalValue')}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{metricValue(summary?.totalInventoryValue, (value) => formatCurrency(value, { maximumFractionDigits: 0 }))}</p>
        </div>
        <div className="relative flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal leading-5">{t('dashboard.stats.valueCaption')}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[10rem] relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.14),_transparent_40%)]" />
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-orange-500 text-[72px]">notification_important</span>
        </div>
        <div className="relative">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.activeAlerts')}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{metricValue(summary?.activeStockAlerts, formatNumber)}</p>
        </div>
        <div className="relative flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal">
            {summary?.generatedAt ? t('dashboard.stats.generatedAt', { value: formatDateTime(summary.generatedAt) }) : t('dashboard.stats.alertsCaption')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;

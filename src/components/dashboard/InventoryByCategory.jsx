import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const InventoryByCategory = ({ summary, items, loading }) => {
  const { formatCurrency, formatNumber, t } = useLanguage();
  const snapshotItems = [
    { label: t('dashboard.valueMix.turnover'), value: summary?.inventoryTurnover, suffix: '' },
    { label: t('dashboard.valueMix.fulfillmentRate'), value: summary?.orderFulfillmentRate, suffix: '%' },
    { label: t('dashboard.valueMix.utilization'), value: summary?.averageWarehouseUtilization, suffix: '%' },
    { label: t('dashboard.valueMix.openPurchaseOrders'), value: summary?.openPurchaseOrders, suffix: '' },
    { label: t('dashboard.valueMix.openSalesOrders'), value: summary?.openSalesOrders, suffix: '' },
    { label: t('dashboard.valueMix.stockOutIncidents'), value: summary?.stockOutIncidents, suffix: '' },
  ];

  return (
    <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.valueMix.title')}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.valueMix.description')}</p>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
        </div>
      ) : items.length ? (
        <div className="space-y-5">
          {items.map((item, index) => (
            <div key={`${item.productVariantId || item.sku}-${index}`}>
              <div className="flex justify-between gap-3 text-sm font-medium mb-2">
                <div className="min-w-0">
                  <div className="truncate text-slate-700 dark:text-slate-300">{item.productName}</div>
                  <div className="truncate text-xs text-slate-400 dark:text-slate-500">{item.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-900 dark:text-white">{formatCurrency(item.totalValue, { currency: item.currency || 'USD' })}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{formatNumber(item.share)}% {t('dashboard.valueMix.shareOfValue')}</div>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.max(item.share, 6)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t('dashboard.valueMix.empty')}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{t('dashboard.valueMix.summaryTitle')}</div>
        <div className="grid grid-cols-2 gap-3">
          {snapshotItems.map((item) => (
            <div key={item.label}>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
              <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {loading ? '...' : `${formatNumber(item.value)}${item.suffix}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link to="/analytics/reports" className="mt-6 w-full py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center">
        {t('dashboard.valueMix.viewReports')}
      </Link>
    </div>
  );
};

export default InventoryByCategory;

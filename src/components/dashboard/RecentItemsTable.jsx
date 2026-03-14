import React from 'react';
import Badge from '../common/Badge';
import { useLanguage } from '../../contexts/LanguageContext';

const MOVEMENT_VARIANTS = {
  IN: 'success',
  TRANSFER_IN: 'info',
  OUT: 'warning',
  TRANSFER_OUT: 'warning',
  ADJUSTMENT: 'default',
};

const RecentItemsTable = ({ movements, loading }) => {
  const { formatDateTime, formatNumber, t } = useLanguage();

  const getMovementLabel = (type) => {
    switch (type) {
      case 'IN':
        return t('dashboard.recentItems.inbound');
      case 'OUT':
        return t('dashboard.recentItems.outbound');
      case 'ADJUSTMENT':
        return t('dashboard.recentItems.adjustment');
      case 'TRANSFER_IN':
        return t('dashboard.recentItems.transferIn');
      case 'TRANSFER_OUT':
        return t('dashboard.recentItems.transferOut');
      default:
        return type || '--';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.recentItems.title')}</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
        </div>
      ) : movements.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="px-6 py-4">{t('dashboard.recentItems.itemName')}</th>
              <th className="px-6 py-4">{t('dashboard.recentItems.sku')}</th>
              <th className="px-6 py-4">{t('dashboard.recentItems.warehouse')}</th>
              <th className="px-6 py-4">{t('dashboard.recentItems.quantity')}</th>
              <th className="px-6 py-4">{t('dashboard.recentItems.movementType')}</th>
              <th className="px-6 py-4">{t('dashboard.recentItems.movementDate')}</th>
              <th className="px-6 py-4">{t('dashboard.recentItems.reason')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            {movements.map((movement, index) => (
              <tr key={`${movement.movementId || movement.referenceId || movement.sku}-${index}`} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-white">{movement.productName || t('dashboard.recentItems.unnamedProduct')}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{movement.sku || '--'}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{movement.warehouseName || t('dashboard.recentItems.noWarehouse')}</td>
                <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{formatNumber(movement.quantity)}</td>
                <td className="px-6 py-4">
                  <Badge variant={MOVEMENT_VARIANTS[movement.type] || 'default'}>{getMovementLabel(movement.type)}</Badge>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDateTime(movement.movementDate)}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{movement.reason || t('dashboard.recentItems.noReason')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.recentItems.empty')}
        </div>
      )}
    </div>
  );
};

export default RecentItemsTable;

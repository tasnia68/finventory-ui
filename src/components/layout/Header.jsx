import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../common';
import { useSidebar } from './Sidebar';

const ROUTE_META = [
  { match: '/dashboard', titleKey: 'routes.dashboardOverview', sectionKey: 'sections.operations' },
  { match: '/products/create/simple', titleKey: 'routes.createSimpleProduct', sectionKey: 'sections.productCatalog' },
  { match: '/products/create', titleKey: 'routes.createProductTemplate', sectionKey: 'sections.productCatalog' },
  { match: '/products/', titleKey: 'routes.productDetail', sectionKey: 'sections.productCatalog' },
  { match: '/products', titleKey: 'routes.productOperationsHub', sectionKey: 'sections.productCatalog' },
  { match: '/templates', titleKey: 'routes.templateRegister', sectionKey: 'sections.productCatalog' },
  { match: '/categories', titleKey: 'routes.categoryWorkspace', sectionKey: 'sections.productCatalog' },
  { match: '/uoms', titleKey: 'routes.unitGovernance', sectionKey: 'sections.productCatalog' },
  { match: '/attributes', titleKey: 'routes.attributeWorkspace', sectionKey: 'sections.productCatalog' },
  { match: '/attribute-groups', titleKey: 'routes.attributeGroups', sectionKey: 'sections.productCatalog' },
  { match: '/inventory', titleKey: 'routes.stockLevels', sectionKey: 'sections.inventoryCore' },
  { match: '/warehouses', titleKey: 'routes.warehouses', sectionKey: 'sections.inventoryCore' },
  { match: '/transactions', titleKey: 'routes.transactions', sectionKey: 'sections.inventoryCore' },
  { match: '/warehouse-transfers', titleKey: 'routes.warehouseTransfers', sectionKey: 'sections.inventoryCore' },
  { match: '/batches', titleKey: 'routes.batchesLots', sectionKey: 'sections.advancedInventory' },
  { match: '/serials', titleKey: 'routes.serialNumbers', sectionKey: 'sections.advancedInventory' },
  { match: '/reservations', titleKey: 'routes.reservations', sectionKey: 'sections.advancedInventory' },
  { match: '/replenishment', titleKey: 'routes.replenishment', sectionKey: 'sections.advancedInventory' },
  { match: '/cycle-counts', titleKey: 'routes.cycleCounts', sectionKey: 'sections.advancedInventory' },
  { match: '/valuation', titleKey: 'routes.valuation', sectionKey: 'sections.advancedInventory' },
  { match: '/damage-control', titleKey: 'routes.damageControl', sectionKey: 'sections.advancedInventory' },
  { match: '/procurement', titleKey: 'navigation.procurementOverview', sectionKey: 'sections.procurement' },
  { match: '/suppliers', titleKey: 'routes.suppliers', sectionKey: 'sections.procurement' },
  { match: '/purchase-orders', titleKey: 'routes.purchaseOrders', sectionKey: 'sections.procurement' },
  { match: '/goods-receipts', titleKey: 'routes.goodsReceipts', sectionKey: 'sections.procurement' },
  { match: '/purchase-requisitions', titleKey: 'routes.purchaseRequisitions', sectionKey: 'sections.procurement' },
  { match: '/customers', titleKey: 'routes.customers', sectionKey: 'sections.salesFulfillment' },
  { match: '/sales-orders/web', titleKey: 'routes.webOrders', sectionKey: 'sections.salesFulfillment' },
  { match: '/sales-orders', titleKey: 'routes.salesOrders', sectionKey: 'sections.salesFulfillment' },
  { match: '/control-tower', titleKey: 'routes.controlTower', sectionKey: 'sections.salesFulfillment' },
  { match: '/couriers', titleKey: 'navigation.couriers', sectionKey: 'sections.salesFulfillment' },
  { match: '/sales-orders/inbox', titleKey: 'navigation.orderInbox', sectionKey: 'sections.salesFulfillment' },
  { match: '/settings', titleKey: 'navigation.settings', sectionKey: 'sections.administration' },
  { match: '/refunds-exchanges', titleKey: 'routes.refundsExchanges', sectionKey: 'sections.salesFulfillment' },
  { match: '/promotions-pricing', titleKey: 'routes.promotionsPricing', sectionKey: 'sections.salesFulfillment' },
  { match: '/fulfillment', titleKey: 'routes.fulfillmentControl', sectionKey: 'sections.salesFulfillment' },
  { match: '/pos/register', titleKey: 'routes.posRegisterControl', sectionKey: 'sections.pointOfSale' },
  { match: '/pos/settlement', titleKey: 'routes.posSettlement', sectionKey: 'sections.pointOfSale' },
  { match: '/pos/sales', titleKey: 'routes.posSoldHistory', sectionKey: 'sections.pointOfSale' },
  { match: '/pos/counters', titleKey: 'routes.posCounterSetup', sectionKey: 'sections.pointOfSale' },
  { match: '/pos', titleKey: 'routes.posTerminal', sectionKey: 'sections.pointOfSale' },
  { match: '/analytics/overview', titleKey: 'routes.analyticsOverview', sectionKey: 'sections.analytics' },
  { match: '/analytics/reports', titleKey: 'routes.reportStudio', sectionKey: 'sections.analytics' },
  { match: '/analytics/data-exchange', titleKey: 'routes.dataExchange', sectionKey: 'sections.analytics' },
  { match: '/analytics/automation', titleKey: 'routes.automationConsole', sectionKey: 'sections.analytics' },
  { match: '/analytics', titleKey: 'routes.analyticsOverview', sectionKey: 'sections.analytics' },
  { match: '/accounting/accounts', titleKey: 'routes.accountingAccounts', sectionKey: 'sections.accounting' },
  { match: '/accounting/journals', titleKey: 'routes.accountingJournals', sectionKey: 'sections.accounting' },
  { match: '/accounting/entries', titleKey: 'routes.accountingEntries', sectionKey: 'sections.accounting' },
  { match: '/accounting/payables', titleKey: 'routes.accountingPayables', sectionKey: 'sections.accounting' },
  { match: '/accounting/receivables', titleKey: 'routes.accountingReceivables', sectionKey: 'sections.accounting' },
  { match: '/accounting/treasury', titleKey: 'routes.accountingTreasury', sectionKey: 'sections.accounting' },
  { match: '/accounting/statements', titleKey: 'routes.accountingStatements', sectionKey: 'sections.accounting' },
  { match: '/accounting/guide', titleKey: 'routes.accountingGuide', sectionKey: 'sections.accounting' },
  { match: '/accounting', titleKey: 'routes.accountingOverview', sectionKey: 'sections.accounting' },
  { match: '/storefront/theme', titleKey: 'routes.storefrontTheme', sectionKey: 'sections.storefront' },
  { match: '/storefront/pages', titleKey: 'routes.storefrontPages', sectionKey: 'sections.storefront' },
  { match: '/storefront/navigation', titleKey: 'routes.storefrontNavigation', sectionKey: 'sections.storefront' },
  { match: '/storefront/publish', titleKey: 'routes.storefrontPublish', sectionKey: 'sections.storefront' },
  { match: '/storefront', titleKey: 'routes.storefrontOverview', sectionKey: 'sections.storefront' },
  { match: '/plugins/shopify', titleKey: 'routes.pluginsShopify', sectionKey: 'sections.plugins' },
  { match: '/plugins/logs', titleKey: 'routes.pluginsLogs', sectionKey: 'sections.plugins' },
  { match: '/plugins', titleKey: 'routes.pluginsOverview', sectionKey: 'sections.plugins' },
  { match: '/orders', titleKey: 'routes.salesOrders', sectionKey: 'sections.salesFulfillment' },
  { match: '/users', titleKey: 'routes.users', sectionKey: 'sections.userManagement' },
  { match: '/roles', titleKey: 'routes.roles', sectionKey: 'sections.userManagement' },
  { match: '/profile', titleKey: 'routes.profile', sectionKey: 'sections.account' },
];

const getRouteMeta = (pathname) => {
  return ROUTE_META.find((item) => pathname.startsWith(item.match)) || {
    titleKey: 'routes.workspace',
    sectionKey: 'sections.logistra',
  };
};

const Header = () => {
  const { toggleTheme, theme } = useContext(ThemeContext);
  const { logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { toggle } = useSidebar();
  const routeMeta = getRouteMeta(location.pathname);

  return (
    <header className="flex-shrink-0 border-b border-slate-200 bg-white/90 px-8 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={toggle}
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={t('common.navigation')}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="hidden min-w-0 md:flex md:flex-col">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {t(routeMeta.sectionKey)}
            </p>
            <h2 className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">{t(routeMeta.titleKey)}</h2>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 md:flex-none">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
          </div>
          <input className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 leading-5 text-slate-900 placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800/80 dark:text-white sm:text-sm" placeholder={t('shell.searchPlaceholder')} type="text" />
        </div>
        <LanguageSwitcher compact />
        <button
          onClick={toggleTheme}
          className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={t('common.themeToggle')}
        >
          <span className="material-symbols-outlined">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        <button className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" title={t('shell.notifications')}>
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="hidden sm:inline">{t('common.logout')}</span>
        </button>
      </div>
      </div>
    </header>
  );
};

export default Header;

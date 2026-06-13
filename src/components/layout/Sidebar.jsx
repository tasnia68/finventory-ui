import React, { useState, useContext, useEffect, createContext } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { PERMISSIONS } from '../../constants/permissions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontModule } from '../../hooks/useStorefrontModule';

const SidebarContext = createContext({ isOpen: true, toggle: () => {}, close: () => {} });
export const useSidebar = () => useContext(SidebarContext);

const MENU_ITEMS = [
  {
    titleKey: 'navigation.dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    permission: PERMISSIONS.MENU_DASHBOARD,
  },
  {
    titleKey: 'navigation.ordersGroup',
    icon: 'receipt_long',
    permission: PERMISSIONS.MENU_SALES,
    submenu: [
      { titleKey: 'navigation.salesOrders', path: '/sales-orders' },
      { titleKey: 'navigation.orders', path: '/orders' },
      { titleKey: 'navigation.webOrders', path: '/sales-orders/web', requiresStorefrontModule: true },
      { titleKey: 'navigation.orderInbox', path: '/sales-orders/inbox' },
    ],
  },
  {
    titleKey: 'navigation.courierGroup',
    icon: 'local_shipping',
    permission: PERMISSIONS.MENU_SALES,
    submenu: [
      { titleKey: 'navigation.courierProfiles', path: '/couriers' },
      { titleKey: 'navigation.controlTower', path: '/control-tower' },
      { titleKey: 'navigation.courierSettings', path: '/settings?section=integrations' },
    ],
  },
  {
    titleKey: 'navigation.userManagement',
    icon: 'group',
    permission: PERMISSIONS.MENU_USER_MANAGEMENT,
    submenu: [
      { titleKey: 'navigation.users', path: '/users' },
      { titleKey: 'navigation.roles', path: '/roles' },
    ]
  },
  {
    titleKey: 'navigation.productCatalog',
    icon: 'category',
    permission: PERMISSIONS.MENU_CATALOG,
    submenu: [
      { titleKey: 'navigation.templates', path: '/products' },
      { titleKey: 'navigation.categories', path: '/categories' },
      { titleKey: 'navigation.unitsOfMeasure', path: '/uoms' },
      { titleKey: 'navigation.attributes', path: '/attributes' },
      { titleKey: 'navigation.attributeGroups', path: '/attribute-groups' },
    ]
  },
  {
    titleKey: 'navigation.inventoryCore',
    icon: 'inventory_2',
    permission: PERMISSIONS.MENU_INVENTORY_CORE,
    submenu: [
      { titleKey: 'navigation.stockLevels', path: '/inventory' },
      { titleKey: 'navigation.warehouses', path: '/warehouses' },
      { titleKey: 'navigation.transactions', path: '/transactions' },
      { titleKey: 'navigation.warehouseTransfers', path: '/warehouse-transfers' },
    ]
  },
  {
    titleKey: 'navigation.advancedInventory',
    icon: 'domain_verification',
    permission: PERMISSIONS.MENU_ADVANCED_INVENTORY,
    submenu: [
      { titleKey: 'navigation.batchesLots', path: '/batches' },
      { titleKey: 'navigation.serialNumbers', path: '/serials' },
      { titleKey: 'navigation.reservations', path: '/reservations' },
      { titleKey: 'navigation.replenishment', path: '/replenishment' },
      { titleKey: 'navigation.cycleCounts', path: '/cycle-counts' },
      { titleKey: 'navigation.valuation', path: '/valuation' },
      { titleKey: 'navigation.damageControl', path: '/damage-control' },
      { titleKey: 'navigation.damageControlIncidents', path: '/damage-control/incidents' },
      { titleKey: 'navigation.damageControlReceiving', path: '/damage-control/receiving' },
      { titleKey: 'navigation.damageControlClaims', path: '/damage-control/claims' },
    ]
  },
  {
    titleKey: 'navigation.procurement',
    icon: 'local_shipping',
    permission: PERMISSIONS.MENU_PROCUREMENT,
    submenu: [
      { titleKey: 'navigation.procurementOverview', path: '/procurement' },
      { titleKey: 'navigation.suppliers', path: '/suppliers' },
      { titleKey: 'navigation.purchaseOrders', path: '/purchase-orders' },
      { titleKey: 'navigation.goodsReceipts', path: '/goods-receipts' },
      { titleKey: 'navigation.purchaseRequisitions', path: '/purchase-requisitions' },
    ]
  },
  {
    titleKey: 'navigation.sales',
    icon: 'shopping_cart',
    permission: PERMISSIONS.MENU_SALES,
    submenu: [
      { titleKey: 'navigation.customers', path: '/customers' },
      { titleKey: 'navigation.refundsExchanges', path: '/refunds-exchanges' },
      { titleKey: 'navigation.discounts', path: '/discounts' },
      { titleKey: 'navigation.discountsCodes', path: '/discounts/codes' },
      { titleKey: 'navigation.discountsAnalytics', path: '/discounts/analytics' },
      { titleKey: 'navigation.discountsPreview', path: '/discounts/preview' },
      { titleKey: 'navigation.giftCards', path: '/gift-cards' },
      { titleKey: 'navigation.referrals', path: '/referrals' },
      { titleKey: 'navigation.referralCodes', path: '/referrals/codes' },
      { titleKey: 'navigation.fulfillment', path: '/fulfillment' },
      { titleKey: 'navigation.fulfillmentPicking', path: '/fulfillment/picking' },
      { titleKey: 'navigation.fulfillmentShipments', path: '/fulfillment/shipments' },
      { titleKey: 'navigation.fulfillmentExceptions', path: '/fulfillment/exceptions' },
      { titleKey: 'navigation.fulfillmentReturns', path: '/fulfillment/returns' },
    ]
  },
  {
    titleKey: 'navigation.pointOfSale',
    icon: 'point_of_sale',
    permission: PERMISSIONS.MENU_SALES,
    submenu: [
      { titleKey: 'navigation.sellScreen', path: '/pos' },
      { titleKey: 'navigation.registerControl', path: '/pos/register' },
      { titleKey: 'navigation.posSettlement', path: '/pos/settlement' },
      { titleKey: 'navigation.soldHistory', path: '/pos/sales' },
      { titleKey: 'navigation.counterSetup', path: '/pos/counters' },
    ]
  },
  {
    titleKey: 'navigation.analytics',
    icon: 'bar_chart',
    permission: PERMISSIONS.MENU_ANALYTICS,
    submenu: [
      { titleKey: 'navigation.overview', path: '/analytics/overview' },
      { titleKey: 'navigation.reports', path: '/analytics/reports' },
      { titleKey: 'navigation.dataExchange', path: '/analytics/data-exchange' },
      { titleKey: 'navigation.automation', path: '/analytics/automation' },
    ]
  },
  {
    titleKey: 'navigation.accounting',
    icon: 'account_balance',
    permission: PERMISSIONS.MENU_ACCOUNTING,
    submenu: [
      { titleKey: 'navigation.accountingOverview', path: '/accounting' },
      { titleKey: 'navigation.accountingSetup', path: '/accounting/setup' },
      { titleKey: 'navigation.accountingAccounts', path: '/accounting/accounts' },
      { titleKey: 'navigation.accountingJournals', path: '/accounting/journals' },
      { titleKey: 'navigation.accountingEntries', path: '/accounting/entries' },
      { titleKey: 'navigation.accountingPending', path: '/accounting/pending' },
      { titleKey: 'navigation.accountingPayables', path: '/accounting/payables' },
      { titleKey: 'navigation.accountingReceivables', path: '/accounting/receivables' },
      { titleKey: 'navigation.accountingTreasury', path: '/accounting/treasury' },
      { titleKey: 'navigation.accountingStatements', path: '/accounting/statements' },
      { titleKey: 'navigation.accountingSettings', path: '/accounting/settings' },
      { titleKey: 'navigation.accountingAudit', path: '/accounting/audit' },
      { titleKey: 'navigation.accountingGuide', path: '/accounting/guide' },
    ]
  },
  {
    titleKey: 'navigation.payroll',
    icon: 'payments',
    permission: PERMISSIONS.MENU_PAYROLL,
    submenu: [
      { titleKey: 'navigation.payrollOverview', path: '/payroll' },
      { titleKey: 'navigation.payrollEmployees', path: '/payroll/employees' },
      { titleKey: 'navigation.payrollAttendance', path: '/payroll/attendance' },
      { titleKey: 'navigation.payrollStructures', path: '/payroll/salary-structures' },
      { titleKey: 'navigation.payrollRuns', path: '/payroll/runs' },
      { titleKey: 'navigation.payrollPayslips', path: '/payroll/payslips' },
      { titleKey: 'navigation.payrollSettings', path: '/payroll/settings' },
    ]
  },
  {
    titleKey: 'navigation.storefront',
    icon: 'storefront',
    permission: PERMISSIONS.MENU_ANALYTICS,
    requiresStorefrontModule: true,
    submenu: [
      { titleKey: 'navigation.storefrontOverview', path: '/storefront' },
      { titleKey: 'navigation.storefrontThemes', path: '/storefront/themes' },
      { titleKey: 'navigation.storefrontTheme', path: '/storefront/theme' },
      { titleKey: 'navigation.storefrontPages', path: '/storefront/pages' },
      { titleKey: 'navigation.storefrontPagesManager', path: '/storefront/pages-manager' },
      { titleKey: 'navigation.storefrontNavigation', path: '/storefront/menus' },
      { titleKey: 'navigation.storefrontCustomers', path: '/storefront/customers' },
      { titleKey: 'navigation.storefrontAnalytics', path: '/storefront/analytics' },
      { titleKey: 'navigation.storefrontPublish', path: '/storefront/publish' },
    ]
  },
  {
    titleKey: 'navigation.plugins',
    icon: 'extension',
    permission: PERMISSIONS.MENU_ANALYTICS,
    submenu: [
      { titleKey: 'navigation.pluginsOverview', path: '/plugins' },
      { titleKey: 'navigation.pluginsShopify', path: '/plugins/shopify' },
      { titleKey: 'navigation.pluginsLogs', path: '/plugins/logs' },
    ]
  },
  {
    titleKey: 'navigation.tenantControl',
    path: '/super-admin/tenants',
    icon: 'admin_panel_settings',
    superAdminOnly: true,
  },
  {
    titleKey: 'navigation.superAdminVirtualTryOn',
    path: '/super-admin/virtual-try-on',
    icon: 'auto_awesome',
    superAdminOnly: true,
  },
  {
    titleKey: 'navigation.settings',
    path: '/settings',
    icon: 'settings',
    permission: PERMISSIONS.MENU_SETTINGS,
  }
];

const SidebarItem = ({ item, isExpanded, onToggle, hasPermission, storefrontEnabled, isSuperAdmin }) => {
  const location = useLocation();
  const { t } = useLanguage();

  if (item.superAdminOnly && !isSuperAdmin) {
    return null;
  }

  // If item requests permission and user doesn't have it, don't render
  if (item.permission && !hasPermission(item.permission)) {
    return null;
  }

  if (item.requiresStorefrontModule && !storefrontEnabled) {
    return null;
  }

  const isActive = item.path ? location.pathname.startsWith(item.path) : item.submenu?.some(sub => location.pathname.startsWith(sub.path));

  // Auto-expand if child is active, but respect manual toggle if provided (optional refinement)
  // For simplicity, we'll let the parent control expansion or local state.
  // Actually, keeping it simple: if isActive, we might want to default to open, but let's use the props.

  if (item.submenu) {
    const visibleSubmenu = item.submenu.filter((subItem) => !subItem.requiresStorefrontModule || storefrontEnabled);
    if (!visibleSubmenu.length) {
      return null;
    }

    return (
      <div className="mb-2">
        <button
          onClick={onToggle}
          className={`group flex w-full items-center justify-between rounded-2xl px-3 py-3 transition-colors ${isActive
            ? 'bg-slate-100 text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
        >
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined rounded-xl p-2 text-[20px] ${isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 group-hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-white'}`}>
              {item.icon}
            </span>
            <span className="text-sm font-medium whitespace-nowrap">{t(item.titleKey)}</span>
          </div>
          <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-2 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-6 flex flex-col gap-1 border-l border-slate-200 pl-4 dark:border-slate-700">
            {visibleSubmenu.map((subItem, index) => (
              <NavLink
                key={index}
                to={subItem.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                {t(subItem.titleKey)}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `group mb-2 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined rounded-xl p-2 text-[20px] ${isActive ? 'bg-primary/10' : 'bg-slate-100 text-slate-500 group-hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-white'}`}>
            {item.icon}
          </span>
          <span className="text-sm font-medium whitespace-nowrap">{t(item.titleKey)}</span>
        </>
      )}
    </NavLink>
  );
};

const SidebarContent = () => {
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const { theme } = useContext(ThemeContext);
  const { t } = useLanguage();
  const { storefrontEnabled } = useStorefrontModule();
  const { close } = useSidebar();
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    close();
  }, [location.pathname]);

  const toggleMenu = (titleKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [titleKey]: !prev[titleKey]
    }));
  };

  return (
    <>
      <div className="p-5">
        <div className="relative mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_45%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.16),_transparent_30%)]" />
          <div className="relative flex items-start gap-3">
            <div className="h-10 flex items-center">
            <img 
              src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'logistra-nightmode.svg' : 'logistra.svg'}`}
              alt="Logistra" 
              className="h-8"
            />
            </div>
          <div className="flex flex-col">
            <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">Logistra</p>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t('shell.brandTagline')}</p>
            </div>
          </div>
        </div>

        <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {t('common.navigation')}
        </div>
        <nav className="flex flex-col gap-1">
          {MENU_ITEMS.map((item, index) => (
            <SidebarItem
              key={index}
              item={item}
              isExpanded={expandedMenus[item.titleKey]}
              onToggle={() => toggleMenu(item.titleKey)}
              hasPermission={hasPermission}
              storefrontEnabled={storefrontEnabled}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || t('common.profileFallbackName'))}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email || t('common.profileFallbackEmail')}
            </p>
          </div>
        </Link>
      </div>
    </>
  );
};

const Sidebar = () => {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={close}
        />
      )}
      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-80 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export { SidebarContext };
export default Sidebar;

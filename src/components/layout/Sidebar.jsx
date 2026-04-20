import React, { useState, useContext, useEffect, createContext, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { PERMISSIONS } from '../../constants/permissions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontModule } from '../../hooks/useStorefrontModule';

const SidebarContext = createContext({
  isDesktop: true,
  isOpen: false,
  isCollapsed: false,
  toggle: () => {},
  close: () => {},
});
export const useSidebar = () => useContext(SidebarContext);

const MENU_ITEMS = [
  {
    titleKey: 'navigation.dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    permission: PERMISSIONS.MENU_DASHBOARD,
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
    ]
  },
  {
    titleKey: 'navigation.procurement',
    icon: 'local_shipping',
    permission: PERMISSIONS.MENU_PROCUREMENT,
    submenu: [
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
      { titleKey: 'navigation.salesOrders', path: '/sales-orders' },
      { titleKey: 'navigation.webOrders', path: '/sales-orders/web', requiresStorefrontModule: true },
      { titleKey: 'navigation.controlTower', path: '/control-tower' },
      { titleKey: 'navigation.refundsExchanges', path: '/refunds-exchanges' },
      { titleKey: 'navigation.promotionsPricing', path: '/promotions-pricing' },
      { titleKey: 'navigation.fulfillment', path: '/fulfillment' },
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
      { titleKey: 'navigation.accountingAccounts', path: '/accounting/accounts' },
      { titleKey: 'navigation.accountingJournals', path: '/accounting/journals' },
      { titleKey: 'navigation.accountingEntries', path: '/accounting/entries' },
      { titleKey: 'navigation.accountingPayables', path: '/accounting/payables' },
      { titleKey: 'navigation.accountingReceivables', path: '/accounting/receivables' },
      { titleKey: 'navigation.accountingTreasury', path: '/accounting/treasury' },
      { titleKey: 'navigation.accountingStatements', path: '/accounting/statements' },
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
    titleKey: 'navigation.settings',
    path: '/settings',
    icon: 'settings',
    permission: PERMISSIONS.MENU_SETTINGS,
  }
];

const SidebarItem = ({
  item,
  isExpanded,
  onToggle,
  hasPermission,
  storefrontEnabled,
  isSuperAdmin,
  collapsed,
  isMobile,
  activeFlyoutKey,
  pinnedFlyoutKey,
  onFlyoutPreview,
  onFlyoutClose,
  onFlyoutPin,
}) => {
  const location = useLocation();
  const { t } = useLanguage();
  const openTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);

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
  const isCollapsedDesktop = collapsed && !isMobile;
  const isFlyoutVisible = activeFlyoutKey === item.titleKey;
  const isFlyoutPinned = pinnedFlyoutKey === item.titleKey;

  const clearFlyoutTimers = () => {
    if (openTimeoutRef.current) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearFlyoutTimers(), []);

  const scheduleFlyoutOpen = () => {
    if (!isCollapsedDesktop || !item.submenu) {
      return;
    }
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openTimeoutRef.current) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    // Open instantly on hover – no delay
    onFlyoutPreview(item.titleKey);
  };

  const scheduleFlyoutClose = () => {
    if (!isCollapsedDesktop || !item.submenu || isFlyoutPinned) {
      return;
    }
    if (openTimeoutRef.current) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      onFlyoutClose(item.titleKey);
      closeTimeoutRef.current = null;
    }, 220);
  };

  const handleFlyoutPinToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearFlyoutTimers();
    onFlyoutPin(item.titleKey);
  };

  // Auto-expand if child is active, but respect manual toggle if provided (optional refinement)
  // For simplicity, we'll let the parent control expansion or local state.
  // Actually, keeping it simple: if isActive, we might want to default to open, but let's use the props.

  if (item.submenu) {
    const visibleSubmenu = item.submenu.filter((subItem) => !subItem.requiresStorefrontModule || storefrontEnabled);
    if (!visibleSubmenu.length) {
      return null;
    }

    if (isCollapsedDesktop) {
      return (
        <div
          className="relative mb-2 flex justify-center"
          onMouseEnter={scheduleFlyoutOpen}
          onMouseLeave={scheduleFlyoutClose}
        >
          <button
            type="button"
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isActive
              ? 'bg-slate-100 text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            aria-label={t(item.titleKey)}
            title={t(item.titleKey)}
            aria-expanded={isFlyoutVisible}
            onFocus={scheduleFlyoutOpen}
            onBlur={scheduleFlyoutClose}
            onClick={handleFlyoutPinToggle}
          >
            <span className={`material-symbols-outlined rounded-xl p-2 text-[20px] ${isActive || isFlyoutVisible ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>
              {item.icon}
            </span>
          </button>

          <div className={`absolute left-full top-1/2 z-50 ml-3 w-72 -translate-y-1/2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xl ring-1 ring-black/5 transition-all duration-150 ease-out dark:border-slate-700/80 dark:bg-slate-900 dark:ring-white/5 ${isFlyoutVisible ? 'pointer-events-auto visible translate-x-0 scale-100 opacity-100' : 'pointer-events-none invisible translate-x-1 scale-[0.97] opacity-0'}`}
            onMouseEnter={scheduleFlyoutOpen}
            onMouseLeave={scheduleFlyoutClose}
          >
            <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900" />
            <div className="relative mb-1.5 flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">{t(item.titleKey)}</span>
              <button
                type="button"
                onClick={handleFlyoutPinToggle}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isFlyoutPinned
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                }`}
                aria-label={isFlyoutPinned ? 'Unpin menu' : 'Pin menu'}
                title={isFlyoutPinned ? 'Unpin menu' : 'Pin menu'}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isFlyoutPinned ? 'keep_off' : 'push_pin'}
                </span>
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {visibleSubmenu.map((subItem, index) => (
                <NavLink
                  key={index}
                  to={subItem.path}
                  className={({ isActive: subActive }) =>
                    `group/link flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${subActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive: subActive }) => (
                    <>
                      <span className={`h-1 w-1 rounded-full flex-shrink-0 ${subActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className="flex-1">{t(subItem.titleKey)}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-2">
        <button
          type="button"
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

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-2 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
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

  if (isCollapsedDesktop) {
    return (
      <div className="group relative mb-2 flex justify-center">
        <NavLink
          to={item.path}
          aria-label={t(item.titleKey)}
          title={t(item.titleKey)}
          className={({ isActive: linkActive }) =>
            `flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${linkActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`
          }
        >
          {({ isActive: linkActive }) => (
            <span className={`material-symbols-outlined rounded-xl p-2 text-[20px] ${linkActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 group-hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-white'}`}>
              {item.icon}
            </span>
          )}
        </NavLink>
        <span className="pointer-events-none invisible absolute left-full top-1/2 z-40 ml-3 -translate-y-1/2 translate-x-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 opacity-0 shadow-lg ring-1 ring-black/5 transition-all duration-100 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-x-0 group-focus-within:opacity-100 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/5">
          {t(item.titleKey)}
        </span>
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

const SidebarContent = ({ collapsed = false, isMobile = false }) => {
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const { theme } = useContext(ThemeContext);
  const { t } = useLanguage();
  const { storefrontEnabled } = useStorefrontModule();
  const { close } = useSidebar();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [hoveredFlyoutKey, setHoveredFlyoutKey] = useState(null);
  const [pinnedFlyoutKey, setPinnedFlyoutKey] = useState(null);
  const sidebarRootRef = useRef(null);
  const location = useLocation();

  const activeFlyoutKey = pinnedFlyoutKey || hoveredFlyoutKey;

  // Close drawer on route change
  useEffect(() => {
    setHoveredFlyoutKey(null);
    setPinnedFlyoutKey(null);
    if (isMobile) {
      close();
    }
  }, [close, isMobile, location.pathname]);

  useEffect(() => {
    if (!collapsed || isMobile) {
      setHoveredFlyoutKey(null);
      setPinnedFlyoutKey(null);
    }
  }, [collapsed, isMobile]);

  useEffect(() => {
    if (!pinnedFlyoutKey || isMobile) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (sidebarRootRef.current && !sidebarRootRef.current.contains(event.target)) {
        setPinnedFlyoutKey(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setPinnedFlyoutKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobile, pinnedFlyoutKey]);

  const toggleMenu = (titleKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [titleKey]: !prev[titleKey]
    }));
  };

  const previewFlyout = (titleKey) => {
    if (!collapsed || isMobile) {
      return;
    }
    setHoveredFlyoutKey(titleKey);
  };

  const closeFlyout = (titleKey) => {
    if (!collapsed || isMobile || pinnedFlyoutKey === titleKey) {
      return;
    }
    setHoveredFlyoutKey((current) => (current === titleKey ? null : current));
  };

  const togglePinnedFlyout = (titleKey) => {
    if (!collapsed || isMobile) {
      return;
    }
    setPinnedFlyoutKey((current) => (current === titleKey ? null : titleKey));
    setHoveredFlyoutKey(titleKey);
  };

  return (
    <div ref={sidebarRootRef} className={`flex h-full flex-col justify-between ${collapsed && !isMobile ? 'overflow-visible' : 'overflow-y-auto'}`}>
      <div className={collapsed ? 'p-3' : 'p-5'}>
        <div className={`relative mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${collapsed ? 'p-3' : 'p-5'}`}>
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_45%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.16),_transparent_30%)]" />
          <div className={`relative flex items-start ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-10 items-center">
            <img 
              src={theme === 'dark' ? '/logistra-nightmode.svg' : '/logistra.svg'} 
              alt="Logistra" 
              className="h-8"
            />
            </div>
          {!collapsed && (
          <div className="flex flex-col">
            <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">Logistra</p>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t('shell.brandTagline')}</p>
            </div>
          )}
          </div>
        </div>

        {!collapsed && (
          <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t('common.navigation')}
          </div>
        )}
        <nav className={`flex flex-col gap-1 overflow-visible ${collapsed ? 'items-center' : ''}`}>
          {MENU_ITEMS.map((item, index) => (
            <SidebarItem
              key={index}
              item={item}
              isExpanded={expandedMenus[item.titleKey]}
              onToggle={() => toggleMenu(item.titleKey)}
              hasPermission={hasPermission}
              storefrontEnabled={storefrontEnabled}
              isSuperAdmin={isSuperAdmin}
              collapsed={collapsed}
              isMobile={isMobile}
              activeFlyoutKey={activeFlyoutKey}
              pinnedFlyoutKey={pinnedFlyoutKey}
              onFlyoutPreview={previewFlyout}
              onFlyoutClose={closeFlyout}
              onFlyoutPin={togglePinnedFlyout}
            />
          ))}
        </nav>
      </div>

      <div className={`border-t border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60 ${collapsed ? 'p-3' : 'p-4'}`}>
        <Link to="/profile" title={collapsed ? t('routes.profile') : undefined} className={`flex rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 ${collapsed ? 'justify-center p-3' : 'items-center gap-3 p-3'}`}>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
          </div>
          {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || t('common.profileFallbackName'))}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email || t('common.profileFallbackEmail')}
            </p>
          </div>
          )}
        </Link>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { isDesktop, isOpen, isCollapsed, close } = useSidebar();

  return (
    <>
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={`hidden h-screen flex-col justify-between border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:flex ${isCollapsed ? 'w-24 overflow-visible' : 'w-80'}`}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-80 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent isMobile />
      </aside>
    </>
  );
};

export { SidebarContext };
export default Sidebar;

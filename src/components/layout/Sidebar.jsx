import React, { useState, useContext } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { PERMISSIONS } from '../../constants/permissions';

const MENU_ITEMS = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    permission: PERMISSIONS.MENU_DASHBOARD,
  },
  {
    title: 'User Management',
    icon: 'group',
    permission: PERMISSIONS.MENU_USER_MANAGEMENT,
    submenu: [
      { title: 'Users', path: '/users' },
      { title: 'Roles', path: '/roles' },
    ]
  },
  {
    title: 'Product Catalog',
    icon: 'category',
    permission: PERMISSIONS.MENU_CATALOG,
    submenu: [
      { title: 'Templates', path: '/products' },
      { title: 'Categories', path: '/categories' },
      { title: 'Units of Measure', path: '/uoms' },
      { title: 'Attributes', path: '/attributes' },
      { title: 'Attribute Groups', path: '/attribute-groups' },
    ]
  },
  {
    title: 'Inventory Core',
    icon: 'inventory_2',
    permission: PERMISSIONS.MENU_INVENTORY_CORE,
    submenu: [
      { title: 'Stock Levels', path: '/inventory' }, // Mapped old /inventory here
      { title: 'Warehouses', path: '/warehouses' },
      { title: 'Transactions', path: '/transactions' },
      { title: 'Warehouse Transfers', path: '/warehouse-transfers' },
    ]
  },
  {
    title: 'Advanced Inventory',
    icon: 'domain_verification',
    permission: PERMISSIONS.MENU_ADVANCED_INVENTORY,
    submenu: [
      { title: 'Batches & Lots', path: '/batches' },
      { title: 'Serial Numbers', path: '/serials' },
      { title: 'Reservations', path: '/reservations' },
      { title: 'Replenishment', path: '/replenishment' },
      { title: 'Cycle Counts', path: '/cycle-counts' },
      { title: 'Valuation', path: '/valuation' },
    ]
  },
  {
    title: 'Procurement',
    icon: 'local_shipping',
    permission: PERMISSIONS.MENU_PROCUREMENT,
    submenu: [
      { title: 'Suppliers', path: '/suppliers' },
      { title: 'Purchase Orders', path: '/purchase-orders' },
      { title: 'Purchase Requisitions', path: '/purchase-requisitions' },
    ]
  },
  {
    title: 'Sales & POS',
    icon: 'point_of_sale',
    permission: PERMISSIONS.MENU_SALES,
    submenu: [
      { title: 'POS Terminal', path: '/pos' },
      { title: 'Sales Orders', path: '/orders' }, // Mapped old /orders here
    ]
  },
  {
    title: 'Analytics',
    path: '/analytics',
    icon: 'bar_chart',
    permission: PERMISSIONS.MENU_ANALYTICS,
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: 'settings',
    permission: PERMISSIONS.MENU_SETTINGS,
  }
];

const SidebarItem = ({ item, isExpanded, onToggle, hasPermission }) => {
  const location = useLocation();

  // If item requests permission and user doesn't have it, don't render
  if (item.permission && !hasPermission(item.permission)) {
    return null;
  }

  const isActive = item.path ? location.pathname.startsWith(item.path) : item.submenu?.some(sub => location.pathname.startsWith(sub.path));

  // Auto-expand if child is active, but respect manual toggle if provided (optional refinement)
  // For simplicity, we'll let the parent control expansion or local state.
  // Actually, keeping it simple: if isActive, we might want to default to open, but let's use the props.

  if (item.submenu) {
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
            <span className="text-sm font-medium whitespace-nowrap">{item.title}</span>
          </div>
          <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-2 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-6 flex flex-col gap-1 border-l border-slate-200 pl-4 dark:border-slate-700">
            {item.submenu.map((subItem, index) => (
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
                {subItem.title}
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
          <span className="text-sm font-medium whitespace-nowrap">{item.title}</span>
        </>
      )}
    </NavLink>
  );
};

const Sidebar = () => {
  const { user, hasPermission } = useAuth();
  const { theme } = useContext(ThemeContext);
  // State to track expanded menus. Keyed by item title.
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (title) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="sticky top-0 flex h-screen w-80 flex-shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="p-5">
        <div className="relative mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_45%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.16),_transparent_30%)]" />
          <div className="relative flex items-start gap-3">
            <div className="h-10 flex items-center">
            <img 
              src={theme === 'dark' ? '/logistra-nightmode.svg' : '/logistra.svg'} 
              alt="Logistra" 
              className="h-8"
            />
          </div>
          <div className="flex flex-col">
            <p className="text-base font-bold leading-tight text-slate-900 dark:text-white">Logistra</p>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Catalog and inventory workspace.</p>
            </div>
          </div>
        </div>

        <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Navigation
        </div>
        <nav className="flex flex-col gap-1">
          {MENU_ITEMS.map((item, index) => (
            <SidebarItem
              key={index}
              item={item}
              isExpanded={expandedMenus[item.title]}
              onToggle={() => toggleMenu(item.title)}
              hasPermission={hasPermission}
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
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || 'User')}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

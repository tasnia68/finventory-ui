import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const ROUTE_META = [
  { match: '/dashboard', title: 'Dashboard Overview', section: 'Operations' },
  { match: '/products/create/simple', title: 'Create Simple Product', section: 'Product Catalog' },
  { match: '/products/create', title: 'Create Product Template', section: 'Product Catalog' },
  { match: '/products/', title: 'Product Detail', section: 'Product Catalog' },
  { match: '/products', title: 'Product Operations Hub', section: 'Product Catalog' },
  { match: '/templates', title: 'Template Register', section: 'Product Catalog' },
  { match: '/categories', title: 'Category Workspace', section: 'Product Catalog' },
  { match: '/uoms', title: 'Unit Governance', section: 'Product Catalog' },
  { match: '/attributes', title: 'Attribute Workspace', section: 'Product Catalog' },
  { match: '/attribute-groups', title: 'Attribute Groups', section: 'Product Catalog' },
  { match: '/inventory', title: 'Stock Levels', section: 'Inventory Core' },
  { match: '/warehouses', title: 'Warehouses', section: 'Inventory Core' },
  { match: '/transactions', title: 'Transactions', section: 'Inventory Core' },
  { match: '/warehouse-transfers', title: 'Warehouse Transfers', section: 'Inventory Core' },
  { match: '/batches', title: 'Batches & Lots', section: 'Advanced Inventory' },
  { match: '/serials', title: 'Serial Numbers', section: 'Advanced Inventory' },
  { match: '/reservations', title: 'Reservations', section: 'Advanced Inventory' },
  { match: '/replenishment', title: 'Replenishment', section: 'Advanced Inventory' },
  { match: '/cycle-counts', title: 'Cycle Counts', section: 'Advanced Inventory' },
  { match: '/valuation', title: 'Valuation', section: 'Advanced Inventory' },
  { match: '/suppliers', title: 'Suppliers', section: 'Procurement' },
  { match: '/purchase-orders', title: 'Purchase Orders', section: 'Procurement' },
  { match: '/goods-receipts', title: 'Goods Receipts', section: 'Procurement' },
  { match: '/purchase-requisitions', title: 'Purchase Requisitions', section: 'Procurement' },
  { match: '/customers', title: 'Customers', section: 'Sales & Fulfillment' },
  { match: '/sales-orders', title: 'Sales Orders', section: 'Sales & Fulfillment' },
  { match: '/fulfillment', title: 'Fulfillment Control', section: 'Sales & Fulfillment' },
  { match: '/pos/register', title: 'POS Register Control', section: 'Point of Sale' },
  { match: '/pos/sales', title: 'POS Sold History', section: 'Point of Sale' },
  { match: '/pos/counters', title: 'POS Counter Setup', section: 'Point of Sale' },
  { match: '/pos', title: 'POS Terminal', section: 'Point of Sale' },
  { match: '/orders', title: 'Sales Orders', section: 'Sales & Fulfillment' },
  { match: '/users', title: 'Users', section: 'User Management' },
  { match: '/roles', title: 'Roles', section: 'User Management' },
  { match: '/profile', title: 'Profile', section: 'Account' },
];

const getRouteMeta = (pathname) => {
  return ROUTE_META.find((item) => pathname.startsWith(item.match)) || {
    title: 'Workspace',
    section: 'Logistra',
  };
};

const Header = () => {
  const { toggleTheme, theme } = useContext(ThemeContext);
  const { logout } = useAuth();
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);

  return (
    <header className="flex-shrink-0 border-b border-slate-200 bg-white/90 px-8 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-6">
        <div className="hidden min-w-0 md:flex md:flex-col">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {routeMeta.section}
          </p>
          <h2 className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">{routeMeta.title}</h2>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 md:flex-none">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
          </div>
          <input className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 leading-5 text-slate-900 placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800/80 dark:text-white sm:text-sm" placeholder="Search SKU, product, or category..." type="text" />
        </div>
        <button
          onClick={toggleTheme}
          className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Toggle Theme"
        >
          <span className="material-symbols-outlined">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        <button className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
      </div>
    </header>
  );
};

export default Header;

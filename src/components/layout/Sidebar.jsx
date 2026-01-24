import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MENU_ITEMS = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
  },
  {
    title: 'User Management',
    icon: 'group',
    submenu: [
      { title: 'Users', path: '/users' },
      { title: 'Roles', path: '/roles' },
    ]
  },
  {
    title: 'Product Catalog',
    icon: 'category',
    submenu: [
      { title: 'Products', path: '/products' },
      { title: 'Categories', path: '/categories' },
      { title: 'Attributes', path: '/attributes' },
      { title: 'Templates', path: '/templates' },
    ]
  },
  {
    title: 'Inventory Core',
    icon: 'inventory_2',
    submenu: [
      { title: 'Stock Levels', path: '/inventory' }, // Mapped old /inventory here
      { title: 'Warehouses', path: '/warehouses' },
      { title: 'Transactions', path: '/transactions' },
    ]
  },
  {
    title: 'Advanced Inventory',
    icon: 'domain_verification',
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
    submenu: [
      { title: 'Suppliers', path: '/suppliers' },
      { title: 'Purchase Orders', path: '/purchase-orders' },
    ]
  },
  {
    title: 'Sales & POS',
    icon: 'point_of_sale',
    submenu: [
      { title: 'POS Terminal', path: '/pos' },
      { title: 'Sales Orders', path: '/orders' }, // Mapped old /orders here
    ]
  },
  {
    title: 'Analytics',
    path: '/analytics',
    icon: 'bar_chart',
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: 'settings',
  }
];

const SidebarItem = ({ item, isExpanded, onToggle }) => {
  const location = useLocation();
  const isActive = item.path ? location.pathname.startsWith(item.path) : item.submenu?.some(sub => location.pathname.startsWith(sub.path));

  // Auto-expand if child is active, but respect manual toggle if provided (optional refinement)
  // For simplicity, we'll let the parent control expansion or local state.
  // Actually, keeping it simple: if isActive, we might want to default to open, but let's use the props.

  if (item.submenu) {
    return (
      <div className="mb-1">
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${isActive
            ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>
              {item.icon}
            </span>
            <span className="text-sm whitespace-nowrap">{item.title}</span>
          </div>
          <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col gap-1 pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-4">
            {item.submenu.map((subItem, index) => (
              <NavLink
                key={index}
                to={subItem.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group mb-1 ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>
            {item.icon}
          </span>
          <span className="text-sm whitespace-nowrap">{item.title}</span>
        </>
      )}
    </NavLink>
  );
};

const Sidebar = () => {
  const { user } = useAuth();
  // State to track expanded menus. Keyed by item title.
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (title) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-primary dark:to-blue-600 rounded-xl size-10 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-900/10 dark:shadow-primary/20">
            M
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Mint & Slate</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Enterprise</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {MENU_ITEMS.map((item, index) => (
            <SidebarItem
              key={index}
              item={item}
              isExpanded={expandedMenus[item.title]}
              onToggle={() => toggleMenu(item.title)}
            />
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <Link to="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
          <div className="bg-primary/10 rounded-full size-9 flex items-center justify-center text-primary font-bold text-sm">
            {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || 'User')}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

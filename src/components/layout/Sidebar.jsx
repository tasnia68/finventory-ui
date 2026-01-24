import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive
      ? 'bg-primary/10 text-primary'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
    }`;

  const iconClass = ({ isActive }) =>
    `material-symbols-outlined text-[20px] ${isActive
      ? 'text-primary'
      : 'group-hover:text-slate-900 dark:group-hover:text-white'
    }`;

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-center bg-no-repeat bg-cover rounded-lg size-10 bg-slate-900 dark:bg-primary flex items-center justify-center text-white font-black text-xl">
            M
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal">Mint & Slate</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Inventory</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <NavLink to="/dashboard" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>dashboard</span>
                <span className="text-sm font-medium">Dashboard</span>
              </>
            )}
          </NavLink>
          <NavLink to="/inventory" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>inventory_2</span>
                <span className="text-sm font-medium">Inventory</span>
              </>
            )}
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>shopping_cart</span>
                <span className="text-sm font-medium">Orders</span>
              </>
            )}
          </NavLink>
          <NavLink to="/users" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>group</span>
                <span className="text-sm font-medium">Users</span>
              </>
            )}
          </NavLink>
          <NavLink to="/roles" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>badge</span>
                <span className="text-sm font-medium">Roles</span>
              </>
            )}
          </NavLink>
          <NavLink to="/analytics" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>bar_chart</span>
                <span className="text-sm font-medium">Analytics</span>
              </>
            )}
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? '' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>settings</span>
                <span className="text-sm font-medium">Settings</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
      <div className="p-6 border-t border-slate-200 dark:border-slate-800">
        <Link to="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
          <div className="bg-primary/10 rounded-full size-10 flex items-center justify-center text-primary font-bold">
            {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
          </div>
          <div className="flex flex-col">
            <p className="text-slate-900 dark:text-white text-sm font-semibold">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || 'User')}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-[120px]">
              {user?.email || ''}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

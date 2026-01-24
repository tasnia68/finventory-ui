import React, { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

const Header = () => {
  const { toggleTheme, theme } = useContext(ThemeContext);

  return (
    <header className="flex-shrink-0 px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white hidden md:block">Dashboard Overview</h2>
      <div className="flex items-center gap-4 flex-1 md:flex-none justify-end">
        {/* SearchBar */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
          </div>
          <input className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm" placeholder="Search SKU, product, or category..." type="text"/>
        </div>
        <button
          onClick={toggleTheme}
          className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;

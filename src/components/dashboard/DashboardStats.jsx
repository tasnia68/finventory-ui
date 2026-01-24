import React from 'react';

const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Items */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-primary text-[64px]">inventory_2</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Items</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">12,450</p>
        </div>
        <div className="flex items-center gap-1 text-mint-600 text-sm font-medium">
          <span className="material-symbols-outlined text-[16px]">trending_up</span>
          <span>+5.2%</span>
          <span className="text-slate-400 font-normal ml-1">vs last month</span>
        </div>
      </div>
      {/* Low Stock */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-orange-500 text-[64px]">warning</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Low Stock Alerts</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">14</p>
        </div>
        <div className="flex items-center gap-1 text-orange-600 text-sm font-medium">
          <span className="bg-orange-100 dark:bg-orange-900/30 px-1.5 rounded text-xs py-0.5">Needs Attention</span>
        </div>
      </div>
      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-blue-500 text-[64px]">shopping_bag</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Recent Orders</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">86</p>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
          <span className="text-slate-400 font-normal">Pending fulfillment</span>
        </div>
      </div>
      {/* Total Value */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-mint-600 text-[64px]">payments</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Value</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">$1.2M</p>
        </div>
        <div className="flex items-center gap-1 text-mint-600 text-sm font-medium">
          <span className="material-symbols-outlined text-[16px]">trending_up</span>
          <span>+8%</span>
          <span className="text-slate-400 font-normal ml-1">growth</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;

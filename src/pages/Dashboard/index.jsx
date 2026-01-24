import React from 'react';
import DashboardStats from '../../components/dashboard/DashboardStats';
import StockTrendsChart from '../../components/dashboard/StockTrendsChart';
import InventoryByCategory from '../../components/dashboard/InventoryByCategory';
import RecentItemsTable from '../../components/dashboard/RecentItemsTable';

const Dashboard = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back, Alex</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your inventory today.</p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add New Item</span>
          </button>
        </div>
        <DashboardStats />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StockTrendsChart />
          <InventoryByCategory />
        </div>
        <RecentItemsTable />
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';

const InventoryByCategory = () => {
  return (
    <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Inventory by Category</h3>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-slate-700 dark:text-slate-300">Electronics</span>
            <span className="text-slate-900 dark:text-white">45%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-slate-700 dark:text-slate-300">Furniture</span>
            <span className="text-slate-900 dark:text-white">24%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-mint-500 h-2.5 rounded-full" style={{ width: '24%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-slate-700 dark:text-slate-300">Clothing</span>
            <span className="text-slate-900 dark:text-white">18%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-slate-500 h-2.5 rounded-full" style={{ width: '18%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-slate-700 dark:text-slate-300">Accessories</span>
            <span className="text-slate-900 dark:text-white">13%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-orange-400 h-2.5 rounded-full" style={{ width: '13%' }}></div>
          </div>
        </div>
      </div>
      <button className="mt-auto w-full py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            View Full Report
                         </button>
    </div>
  );
};

export default InventoryByCategory;

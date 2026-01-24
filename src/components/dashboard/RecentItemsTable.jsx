import React from 'react';

const RecentItemsTable = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Inventory Items</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                Filter
                            </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">download</span>
                                Export
                            </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="px-6 py-4">Item Name</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md bg-slate-200 dark:bg-slate-700 flex-shrink-0 bg-cover bg-center" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA5HjlW9NdAG0ty4H-GztEyHxPzxvAy2EpERXxyoyD0gI40IDpYONJ1j6D2Dril6KUSn6EX_zK0k8emc7i2rfb7u5UTZqYzVsk_M7dzy46VOQdi4Ta8F6PsNtcIJwZBZjrOcAN0SyVXDUI5QTlh7nsNSWuEVGBUAvxbxXiGLixDMP4eYm3pkCrrTwFY324eO-fjRW-FYxrnF2XmVfXTr6iDTA4Ib-PoHOMrd9s39yAnnYYPAbQkzKpauKgoZQPhDL6c3_xvhXByKE4")'}}></div>
                  <span className="font-medium text-slate-900 dark:text-white">Wireless Headphones</span>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">WH-1002-BLK</td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Electronics</td>
              <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">$249.00</td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">124</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-mint-100 text-mint-700 dark:bg-mint-900/30 dark:text-mint-400 border border-mint-200 dark:border-mint-800">
                                            In Stock
                                        </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-md bg-slate-200 dark:bg-slate-700 flex-shrink-0 bg-cover bg-center" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD4_7yl1N6-8NT1GBjadJ0_Wd1NHXfV-_89AlRe9nR9n65ZcGr7zsVX-VLOWUnz-GLqPhSlQoJtKCeI-Jir2Xw5Ps0u_9z9QRF6vBgIWwW7OdxTfft3I6Jep640wO-hptqif6UzI1OZsabuggkBFqYXBoSjs5Lkr2OOa6G8JFHTOR4W6fuLaSxfbO3kl4A-K4KQhMVfjvbh5I54sXfInBrAMARQARj8i9tTQNb316trn3RnbA6t_JvpOFdW1dOwx6Hu1T5e_yYrwiY")'}}></div>
                        <span className="font-medium text-slate-900 dark:text-white">Ergo Chair Pro</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">EC-883-GRY</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Furniture</td>
                <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">$399.00</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">8</td>
                <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                        Low Stock
                    </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentItemsTable;

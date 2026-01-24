import React from 'react';

const Sidebar = () => {
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
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary" href="#">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm font-semibold">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group" href="#">
            <span className="material-symbols-outlined text-[20px] group-hover:text-slate-900 dark:group-hover:text-white">inventory_2</span>
            <span className="text-sm font-medium">Inventory</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group" href="#">
            <span className="material-symbols-outlined text-[20px] group-hover:text-slate-900 dark:group-hover:text-white">shopping_cart</span>
            <span className="text-sm font-medium">Orders</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group" href="#">
            <span className="material-symbols-outlined text-[20px] group-hover:text-slate-900 dark:group-hover:text-white">bar_chart</span>
            <span className="text-sm font-medium">Analytics</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group" href="#">
            <span className="material-symbols-outlined text-[20px] group-hover:text-slate-900 dark:group-hover:text-white">settings</span>
            <span className="text-sm font-medium">Settings</span>
          </a>
        </nav>
      </div>
      <div className="p-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <div className="bg-center bg-no-repeat bg-cover rounded-full size-10" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDcmg4BmJ5Tgcpoo9ZmI_EHfJ6DDk4htojPJQxfZCRfig_NiNCiX2-N5tX4avgvu7aiortVzla2Qd25-v_0MsYGyOwRk8M26Ws-fqprUpAakWzvnjTISm4yPGvaGB9t2ASVw5DoQQwMffuNAsAVLPafhtFyTVPvmJ3IXQEPrHNe3Qucn4zLMvjBkV5ICC2hYmpzznjx05ui36X1K6eC7IdWQcUjBi4KdMe5bEB51krG4Xg90AXy0-sC0M8dYkxKOGikRnUTDvROMd4")'}}></div>
          <div className="flex flex-col">
            <p className="text-slate-900 dark:text-white text-sm font-semibold">Alex Morgan</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

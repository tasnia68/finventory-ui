import React from 'react';

const StockTrendsChart = () => {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Stock Trends</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Inventory movement over the last 30 days</p>
        </div>
        <select className="bg-slate-50 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-0 cursor-pointer py-1 px-3 font-medium">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>This Year</option>
        </select>
      </div>
      <div className="flex-1 w-full min-h-[250px] relative">
        {/* Custom CSS Chart Implementation using SVG */}
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
          <defs>
            <linearGradient id="gradientPrimary" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#135bec" stopOpacity="0.2"></stop>
              <stop offset="100%" stopColor="#135bec" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          {/* Grid lines */}
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="800" y1="250" y2="250"></line>
          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="190" y2="190"></line>
          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="130" y2="130"></line>
          <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="70" y2="70"></line>
          {/* Area */}
          <path d="M0,200 Q100,180 200,120 T400,100 T600,160 T800,80 L800,300 L0,300 Z" fill="url(#gradientPrimary)"></path>
          {/* Line */}
          <path d="M0,200 Q100,180 200,120 T400,100 T600,160 T800,80" fill="none" stroke="#135bec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
          {/* Points */}
          <circle cx="200" cy="120" fill="#ffffff" r="4" stroke="#135bec" strokeWidth="2"></circle>
          <circle cx="400" cy="100" fill="#ffffff" r="4" stroke="#135bec" strokeWidth="2"></circle>
          <circle cx="600" cy="160" fill="#ffffff" r="4" stroke="#135bec" strokeWidth="2"></circle>
          <circle cx="800" cy="80" fill="#ffffff" r="4" stroke="#135bec" strokeWidth="2"></circle>
        </svg>
        {/* X Axis Labels (Simulated) */}
        <div className="flex justify-between text-xs text-slate-400 mt-2 px-2">
          <span>Nov 01</span>
          <span>Nov 05</span>
          <span>Nov 10</span>
          <span>Nov 15</span>
          <span>Nov 20</span>
          <span>Nov 25</span>
          <span>Nov 30</span>
        </div>
      </div>
    </div>
  );
};

export default StockTrendsChart;

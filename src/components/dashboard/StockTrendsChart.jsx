import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const MAX_CHART_HEIGHT = 170;
const CHART_BOTTOM = 220;
const CHART_WIDTH = 800;

const buildPath = (points) => {
  if (!points.length) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
};

const StockTrendsChart = ({ data, loading }) => {
  const { formatNumber, t } = useLanguage();
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = Math.max(...safeData.map((item) => Math.abs(item.value)), 1);
  const step = safeData.length > 1 ? CHART_WIDTH / (safeData.length - 1) : CHART_WIDTH;
  const points = safeData.map((item, index) => ({
    ...item,
    x: Number((index * step).toFixed(2)),
    y: Number((CHART_BOTTOM - ((item.value + maxValue) / (maxValue * 2)) * MAX_CHART_HEIGHT).toFixed(2)),
  }));
  const linePath = buildPath(points);

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.trends.title')}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('dashboard.trends.description')}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {t('dashboard.trends.netFlow')}
        </div>
      </div>
      <div className="flex-1 w-full min-h-[250px] relative">
        {loading ? (
          <div className="flex h-full min-h-[250px] items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
          </div>
        ) : safeData.some((item) => item.value !== 0) ? (
          <>
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 260">
              <defs>
                <linearGradient id="dashboardTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#135bec" stopOpacity="0.24"></stop>
                  <stop offset="100%" stopColor="#135bec" stopOpacity="0.02"></stop>
                </linearGradient>
              </defs>
              <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="800" y1="220" y2="220"></line>
              <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="135" y2="135"></line>
              <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="50" y2="50"></line>
              <path d={`${linePath} L800,260 L0,260 Z`} fill="url(#dashboardTrend)"></path>
              <path d={linePath} fill="none" stroke="#135bec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
              {points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 6)) === 0 || index === points.length - 1).map((point) => (
                <g key={point.key}>
                  <circle cx={point.x} cy={point.y} fill="#ffffff" r="4" stroke="#135bec" strokeWidth="2"></circle>
                  <text x={point.x} y={Math.max(18, point.y - 10)} textAnchor="middle" fill="#64748b" fontSize="12">
                    {formatNumber(point.value)}
                  </text>
                </g>
              ))}
            </svg>
            <div className="flex justify-between text-xs text-slate-400 mt-2 px-2 gap-2">
              {points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 5)) === 0 || index === points.length - 1).map((point) => (
                <span key={point.key} className="truncate">{point.label}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[250px] items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t('dashboard.trends.empty')}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockTrendsChart;

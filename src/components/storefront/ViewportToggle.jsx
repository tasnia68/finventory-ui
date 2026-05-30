import React from 'react';

const OPTIONS = [
  { id: 'mobile', label: 'Mobile', width: 375 },
  { id: 'tablet', label: 'Tablet', width: 820 },
  { id: 'desktop', label: 'Desktop', width: 0 },
];

const ViewportToggle = ({ value, onChange }) => (
  <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
    {OPTIONS.map((option) => {
      const active = value === option.id;
      return (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id, option.width)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
            active
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

ViewportToggle.OPTIONS = OPTIONS;
export default ViewportToggle;

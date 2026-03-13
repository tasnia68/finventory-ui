import React, { useState } from 'react';

const InfoTip = ({ text, className = '' }) => {
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        aria-label="Show field information"
      >
        <span className="material-symbols-outlined text-[18px]">info</span>
      </button>

      {open && (
        <span className="absolute z-20 w-64 -translate-x-1/2 left-1/2 top-7 rounded-lg bg-slate-900 text-white text-xs leading-5 p-3 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
};

export default InfoTip;
import React from 'react';

const Field = ({ label, children, className = '' }) => (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {children}
    </label>
);

export default Field;

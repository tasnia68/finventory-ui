import React from 'react';

const ProcurementHero = ({ eyebrow, title, description, actions, accent = 'from-sky-500/15 via-transparent to-emerald-500/10' }) => {
    return (
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-r ${accent}`} />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-3">
                    <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                        {eyebrow}
                    </span>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                </div>
                {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:items-end">{actions}</div> : null}
            </div>
        </div>
    );
};

export default ProcurementHero;
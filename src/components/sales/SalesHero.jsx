import React from 'react';

const SalesHero = ({ eyebrow, title, description, actions, accent = 'from-rose-500/15 via-transparent to-sky-500/10' }) => {
    return (
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-r ${accent}`} />
            <div className="relative flex flex-col gap-6">
                <div className="max-w-3xl space-y-3">
                    <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                        {eyebrow}
                    </span>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white xl:text-[2rem]">{title}</h1>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                </div>
                {actions ? <div className="flex w-full flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">{actions}</div> : null}
            </div>
        </div>
    );
};

export default SalesHero;
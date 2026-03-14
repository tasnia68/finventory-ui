import React from 'react';
import InfoTip from '../common/InfoTip';

const CatalogHero = ({ eyebrow = 'Catalog Control', title, description, info, actions, badgeTone = 'slate' }) => {
    const badgeClasses = {
        slate: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
        blue: 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white',
        amber: 'bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950',
    };

    return (
        <div className="relative rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_40%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.16),_transparent_30%)]" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex max-w-3xl flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClasses[badgeTone] || badgeClasses.slate}`}>
                            {eyebrow}
                        </span>
                        {info ? <InfoTip text={info} /> : null}
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                </div>
                {actions ? <div className="relative z-20 flex w-full flex-col gap-3 lg:w-auto lg:min-w-[420px] xl:items-end">{actions}</div> : null}
            </div>
        </div>
    );
};

export default CatalogHero;
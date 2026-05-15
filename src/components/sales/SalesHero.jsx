import React from 'react';

// Compact, professional ERP-style page header.
// Used to be a gradient marketing-hero block; replaced with a tight one-row
// layout (eyebrow + title + actions inline) so pages dive into their data.
const SalesHero = ({ eyebrow, title, description, actions }) => {
    return (
        <div className="border-b border-slate-200 bg-white pb-4 dark:border-slate-700 dark:bg-transparent">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    {eyebrow ? (
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {eyebrow}
                        </div>
                    ) : null}
                    <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
                    {description ? (
                        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    ) : null}
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
        </div>
    );
};

export default SalesHero;

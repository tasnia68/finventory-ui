import React from 'react';
import Card from './Card';
import InfoTip from './InfoTip';

const TONE_STYLES = {
    blue: {
        iconWrap: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
        accent: 'from-blue-500/20 to-cyan-500/10',
    },
    emerald: {
        iconWrap: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
        accent: 'from-emerald-500/20 to-lime-500/10',
    },
    amber: {
        iconWrap: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
        accent: 'from-amber-500/20 to-orange-500/10',
    },
    rose: {
        iconWrap: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
        accent: 'from-rose-500/20 to-pink-500/10',
    },
    violet: {
        iconWrap: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
        accent: 'from-violet-500/20 to-fuchsia-500/10',
    },
    slate: {
        iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
        accent: 'from-slate-500/20 to-slate-400/10',
    },
};

const MetricCard = ({
    title,
    value,
    icon,
    caption,
    info,
    tone = 'blue',
    className = '',
}) => {
    const styles = TONE_STYLES[tone] || TONE_STYLES.blue;

    return (
        <Card className={`relative overflow-hidden ${className}`}>
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${styles.accent}`} />
            <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            {title}
                        </p>
                        {info ? <InfoTip text={info} /> : null}
                    </div>
                    <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        {value}
                    </div>
                    {caption ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{caption}</p>
                    ) : null}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                </div>
            </div>
        </Card>
    );
};

export default MetricCard;
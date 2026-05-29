import React from 'react';
import { Button } from '../../../components/common';
import { ACTION_META } from '../constants';

const ActionsCard = ({ transitions, busy, onAction }) => (
    <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {transitions.length === 0 ? (
                <div className="text-sm text-slate-500">No further actions available for this state.</div>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transitions.map((target) => {
                        const meta = ACTION_META[target] || { label: target, hint: '' };
                        const variant = meta.variant === 'danger' ? 'ghost' : (meta.variant || 'primary');
                        return (
                            <li key={target} className="flex items-start justify-between gap-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{meta.label}</div>
                                    <div className="text-xs text-slate-500">{meta.hint}</div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={variant}
                                    disabled={busy}
                                    className={meta.variant === 'danger' ? 'text-red-600' : ''}
                                    onClick={() => onAction(target)}
                                >
                                    {meta.variant === 'danger' ? meta.label : 'Apply'}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    </div>
);

export default ActionsCard;

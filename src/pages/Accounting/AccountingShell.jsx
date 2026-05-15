import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { label: 'Overview',    path: '/accounting' },
  { label: 'Accounts',    path: '/accounting/accounts' },
  { label: 'Journals',    path: '/accounting/journals' },
  { label: 'Entries',     path: '/accounting/entries' },
  { label: 'Payables',    path: '/accounting/payables' },
  { label: 'Receivables', path: '/accounting/receivables' },
  { label: 'Treasury',    path: '/accounting/treasury' },
  { label: 'Statements',  path: '/accounting/statements' },
  { label: 'Guide',       path: '/accounting/guide' },
];

export const AccountingHeader = ({ title, subtitle, actions }) => (
  <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="mx-auto max-w-7xl px-8 pt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accounting</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <nav className="-mb-px mt-6 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/accounting'}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  </div>
);

export const AccountingPage = ({ title, subtitle, actions, children }) => (
  <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
    <AccountingHeader title={title} subtitle={subtitle} actions={actions} />
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-6">{children}</div>
  </div>
);

export const Stat = ({ label, value, hint, accent = 'slate' }) => (
  <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`text-xl font-bold tabular-nums text-${accent}-900 dark:text-white`}>{value}</div>
    {hint ? <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
  </div>
);

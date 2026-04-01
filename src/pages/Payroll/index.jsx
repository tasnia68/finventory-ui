import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, DataTable, MetricCard } from '../../components/common';
import { getPayrollOverview } from '../../services/payrollService';
import { formatMoney, formatNumber } from './shared';

const PayrollOverview = () => {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setOverview(await getPayrollOverview());
      } catch (error) {
        setAlert({ type: 'error', message: error.message || 'Failed to load payroll overview' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => ({
    employeeCount: overview?.employeeCount || 0,
    departmentCount: overview?.departmentCount || 0,
    structureCount: overview?.structureCount || 0,
    draftRuns: overview?.draftRuns || 0,
    approvedRuns: overview?.approvedRuns || 0,
    paidRuns: overview?.paidRuns || 0,
    totalApprovedNetPay: overview?.totalApprovedNetPay || 0,
  }), [overview]);

  const runColumns = [
    { key: 'runNumber', header: 'Run' },
    { key: 'title', header: 'Title' },
    { key: 'payFrequency', header: 'Cycle' },
    { key: 'status', header: 'Status' },
    { key: 'periodStart', header: 'Start' },
    { key: 'periodEnd', header: 'End' },
    { key: 'items', header: 'Employees', render: (value) => value?.length || 0 },
  ];

  const quickLinks = [
    { title: 'Employees', description: 'Create payroll profiles on top of existing users.', path: '/payroll/employees', icon: 'badge' },
    { title: 'Attendance & Adjustments', description: 'Manual and CSV-import variable payroll inputs.', path: '/payroll/attendance', icon: 'fact_check' },
    { title: 'Salary Structures', description: 'Bangladesh-oriented earnings, deductions, and assignments.', path: '/payroll/salary-structures', icon: 'account_tree' },
    { title: 'Payroll Runs', description: 'Draft, approve, and mark payroll cycles paid.', path: '/payroll/runs', icon: 'payments' },
    { title: 'Payslips', description: 'Review generated payslips by employee and cycle.', path: '/payroll/payslips', icon: 'receipt_long' },
    { title: 'Settings', description: 'Configure payroll account mappings and workday defaults.', path: '/payroll/settings', icon: 'settings' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.16),_transparent_30%)]" />
          <div className="relative space-y-3">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
              Payroll + HR Basics
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Weekly and monthly payroll with attendance inputs and accounting posting.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              This workspace reuses existing users as employees, layers salary structures and adjustments on top,
              and posts a payroll journal on approval.
            </p>
          </div>
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Employees" value={metrics.employeeCount} caption="Payroll-enabled users" icon="badge" tone="emerald" />
          <MetricCard title="Departments" value={metrics.departmentCount} caption="Department masters ready for assignment" icon="apartment" tone="blue" />
          <MetricCard title="Structures" value={metrics.structureCount} caption="Salary structures available for assignment" icon="account_tree" tone="violet" />
          <MetricCard title="Approved Net Pay" value={formatMoney(metrics.totalApprovedNetPay)} caption="Approved and paid cycles combined" icon="payments" tone="amber" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Draft Runs" value={metrics.draftRuns} caption="Awaiting review or approval" icon="draft_orders" tone="orange" />
          <MetricCard title="Approved Runs" value={metrics.approvedRuns} caption="Posted to accounting, awaiting payment" icon="task_alt" tone="teal" />
          <MetricCard title="Paid Runs" value={metrics.paidRuns} caption="Cycles completed and marked paid" icon="done_all" tone="rose" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.path} to={item.path} className="block">
              <Card className="h-full transition-transform duration-200 hover:-translate-y-1" title={item.title} subtitle={item.description}>
                <span className="material-symbols-outlined rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {item.icon}
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <Card
          padding="none"
          className="overflow-hidden"
          title="Recent Payroll Runs"
          subtitle={`Showing ${formatNumber(overview?.recentRuns?.length || 0, 0)} recent cycles`}
        >
          <DataTable
            columns={runColumns}
            data={overview?.recentRuns || []}
            loading={loading}
            emptyMessage="No payroll runs have been created yet."
          />
        </Card>
      </div>
    </div>
  );
};

export default PayrollOverview;

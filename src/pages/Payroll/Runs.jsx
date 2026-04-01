import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import {
  approvePayrollRun,
  createPayrollRun,
  getPayrollEmployees,
  getPayrollRun,
  getPayrollRuns,
  markPayrollRunPaid,
  updatePayrollRunItem,
} from '../../services/payrollService';
import { formatMoney, formatNumber } from './shared';

const emptyForm = {
  title: '',
  payFrequency: 'MONTHLY',
  periodStart: '',
  periodEnd: '',
  currency: 'BDT',
};

const Runs = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [runs, setRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    absentDays: '',
    leaveDays: '',
    overtimeHours: '',
    manualAllowance: '',
    manualDeduction: '',
    notes: '',
  });
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const activeRunId = selectedRun?.id;
      const activeItemId = selectedItem?.id;
      const [runList, employeeList] = await Promise.all([
        getPayrollRuns(),
        getPayrollEmployees(),
      ]);
      setRuns(runList || []);
      setEmployees(employeeList || []);
      const latestSelectedRun = activeRunId ? (runList || []).find((entry) => entry.id === activeRunId) || null : null;
      const latestSelectedItem = activeItemId && latestSelectedRun
        ? (latestSelectedRun.items || []).find((entry) => entry.id === activeItemId) || null
        : null;
      setSelectedRun(latestSelectedRun);
      setSelectedItem(latestSelectedItem);
      if (latestSelectedItem) {
        setItemForm({
          absentDays: String(latestSelectedItem.absentDays ?? '0'),
          leaveDays: String(latestSelectedItem.leaveDays ?? '0'),
          overtimeHours: String(latestSelectedItem.overtimeHours ?? '0'),
          manualAllowance: String(latestSelectedItem.manualAllowance ?? '0'),
          manualDeduction: String(latestSelectedItem.manualDeduction ?? '0'),
          notes: latestSelectedItem.notes || '',
        });
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load payroll runs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredEmployees = useMemo(
    () => employees.filter((employee) => employee.payFrequency === form.payFrequency),
    [employees, form.payFrequency],
  );

  const startEditItem = (item) => {
    setSelectedItem(item);
    setItemForm({
      absentDays: String(item?.absentDays ?? '0'),
      leaveDays: String(item?.leaveDays ?? '0'),
      overtimeHours: String(item?.overtimeHours ?? '0'),
      manualAllowance: String(item?.manualAllowance ?? '0'),
      manualDeduction: String(item?.manualDeduction ?? '0'),
      notes: item?.notes || '',
    });
  };

  const openRun = async (run) => {
    try {
      setSubmitting(true);
      const detail = await getPayrollRun(run.id);
      setSelectedRun(detail);
      setSelectedItem(null);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load payroll run detail' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const created = await createPayrollRun({
        ...form,
        periodStart: form.periodStart || null,
        periodEnd: form.periodEnd || null,
        employeePayrollProfileIds: selectedEmployees,
      });
      setForm(emptyForm);
      setSelectedEmployees([]);
      setSelectedRun(created);
      setSelectedItem(null);
      setAlert({ type: 'success', message: 'Payroll run created.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create payroll run' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (runId) => {
    try {
      setSubmitting(true);
      await approvePayrollRun(runId, {});
      setAlert({ type: 'success', message: 'Payroll run approved and journal posted.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to approve payroll run' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (runId) => {
    try {
      setSubmitting(true);
      await markPayrollRunPaid(runId, { paymentDate: new Date().toISOString().slice(0, 10) });
      setAlert({ type: 'success', message: 'Payroll run marked paid.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to mark payroll run paid' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedRun || !selectedItem) {
      return;
    }
    try {
      setSubmitting(true);
      const updated = await updatePayrollRunItem(selectedRun.id, selectedItem.id, {
        absentDays: itemForm.absentDays,
        leaveDays: itemForm.leaveDays,
        overtimeHours: itemForm.overtimeHours,
        manualAllowance: itemForm.manualAllowance,
        manualDeduction: itemForm.manualDeduction,
        notes: itemForm.notes,
      });
      setSelectedRun(updated);
      const refreshedItem = (updated.items || []).find((entry) => entry.id === selectedItem.id) || null;
      setSelectedItem(refreshedItem);
      if (refreshedItem) {
        startEditItem(refreshedItem);
      }
      setAlert({ type: 'success', message: 'Payroll run item updated.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to update payroll run item' });
    } finally {
      setSubmitting(false);
    }
  };

  const runColumns = [
    { key: 'runNumber', header: 'Run' },
    { key: 'title', header: 'Title' },
    { key: 'payFrequency', header: 'Cycle' },
    { key: 'periodStart', header: 'Start' },
    { key: 'periodEnd', header: 'End' },
    { key: 'status', header: 'Status', render: (value) => <Badge variant={value === 'PAID' ? 'success' : value === 'APPROVED' ? 'warning' : 'default'}>{value}</Badge> },
    { key: 'items', header: 'Employees', render: (value) => value?.length || 0 },
    {
      key: 'netPay',
      header: 'Net Pay',
      render: (_, row) => formatMoney((row.items || []).reduce((sum, item) => sum + Number(item.netPay || 0), 0), row.currency),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => openRun(row)}>View</Button>
          <Button size="sm" disabled={submitting || row.status !== 'DRAFT'} onClick={() => handleApprove(row.id)}>Approve</Button>
          <Button size="sm" variant="secondary" disabled={submitting || row.status !== 'APPROVED'} onClick={() => handlePay(row.id)}>Mark paid</Button>
        </div>
      ),
    },
  ];

  const itemColumns = [
    { key: 'employeeCode', header: 'Employee' },
    { key: 'totalEarnings', header: 'Earnings', render: (value, row) => formatMoney(value, row.currency) },
    { key: 'totalDeductions', header: 'Deductions', render: (value, row) => formatMoney(value, row.currency) },
    { key: 'statutoryDeductions', header: 'Statutory', render: (value, row) => formatMoney(value, row.currency) },
    { key: 'netPay', header: 'Net', render: (value, row) => formatMoney(value, row.currency) },
    { key: 'absentDays', header: 'Absent', render: (value) => formatNumber(value, 3) },
    { key: 'overtimeHours', header: 'OT', render: (value) => formatNumber(value, 3) },
  ];

  const runNetPay = useMemo(
    () => (selectedRun?.items || []).reduce((sum, item) => sum + Number(item.netPay || 0), 0),
    [selectedRun],
  );

  const runTotalDeductions = useMemo(
    () => (selectedRun?.items || []).reduce((sum, item) => sum + Number(item.totalDeductions || 0), 0),
    [selectedRun],
  );

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <Card title="Create Payroll Run" subtitle="Generate a draft run from active employee assignments and attendance inputs">
            <div className="space-y-3">
              <Input label="Run title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="March 2026 Monthly Payroll" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cycle
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.payFrequency} onChange={(event) => setForm((current) => ({ ...current, payFrequency: event.target.value }))}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </label>
                <Input label="Currency" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input type="date" label="Period start" value={form.periodStart} onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))} />
                <Input type="date" label="Period end" value={form.periodEnd} onChange={(event) => setForm((current) => ({ ...current, periodEnd: event.target.value }))} />
              </div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Employees
                <select
                  multiple
                  className="mt-1 h-48 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  value={selectedEmployees}
                  onChange={(event) => setSelectedEmployees(Array.from(event.target.selectedOptions).map((option) => option.value))}
                >
                  {filteredEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeCode} · {employee.userEmail}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leave the list empty to include all active employees for the selected cycle.
              </p>
              <Button className="w-full" loading={submitting} onClick={handleCreate}>
                Create draft payroll run
              </Button>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden" title="Payroll Runs" subtitle="Draft, approve, and complete payroll cycles">
            <DataTable columns={runColumns} data={runs} loading={loading} emptyMessage="No payroll runs created yet." />
          </Card>
        </div>

        {selectedRun ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <Card padding="none" className="overflow-hidden" title={`Run detail · ${selectedRun.runNumber}`} subtitle={`${selectedRun.title} · ${selectedRun.status}`}>
              <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employees</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{selectedRun.items?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total deductions</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatMoney(runTotalDeductions, selectedRun.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Net payable</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatMoney(runNetPay, selectedRun.currency)}</p>
                </div>
              </div>
              <DataTable columns={itemColumns} data={selectedRun.items || []} loading={false} emptyMessage="No payroll items on this run." onRowClick={startEditItem} />
            </Card>

            <Card
              title={selectedItem ? `Edit ${selectedItem.employeeCode}` : 'Run Item Editor'}
              subtitle={selectedItem ? 'Adjust this employee line before approving the payroll run' : 'Select a draft payroll line to adjust absence, OT, allowances, and notes'}
            >
              {selectedItem ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedItem.employeeName || selectedItem.employeeCode}</p>
                    <p className="mt-1">{selectedItem.employeeCode}</p>
                    <p className="mt-2">Current net pay: <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(selectedItem.netPay, selectedItem.currency)}</span></p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <Input type="number" step="0.001" label="Absent days" value={itemForm.absentDays} onChange={(event) => setItemForm((current) => ({ ...current, absentDays: event.target.value }))} disabled={selectedRun.status !== 'DRAFT'} />
                    <Input type="number" step="0.001" label="Leave days" value={itemForm.leaveDays} onChange={(event) => setItemForm((current) => ({ ...current, leaveDays: event.target.value }))} disabled={selectedRun.status !== 'DRAFT'} />
                    <Input type="number" step="0.001" label="Overtime hours" value={itemForm.overtimeHours} onChange={(event) => setItemForm((current) => ({ ...current, overtimeHours: event.target.value }))} disabled={selectedRun.status !== 'DRAFT'} />
                    <Input type="number" step="0.01" label="Manual allowance" value={itemForm.manualAllowance} onChange={(event) => setItemForm((current) => ({ ...current, manualAllowance: event.target.value }))} disabled={selectedRun.status !== 'DRAFT'} />
                    <Input type="number" step="0.01" label="Manual deduction" value={itemForm.manualDeduction} onChange={(event) => setItemForm((current) => ({ ...current, manualDeduction: event.target.value }))} disabled={selectedRun.status !== 'DRAFT'} />
                  </div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Notes
                    <textarea
                      className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      value={itemForm.notes}
                      onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))}
                      disabled={selectedRun.status !== 'DRAFT'}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Earnings</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatMoney(selectedItem.totalEarnings, selectedItem.currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Deductions</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatMoney(selectedItem.totalDeductions, selectedItem.currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Statutory</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatMoney(selectedItem.statutoryDeductions, selectedItem.currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Working days</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatNumber(selectedItem.workingDays, 3)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex-1" loading={submitting} disabled={selectedRun.status !== 'DRAFT'} onClick={handleSaveItem}>
                      Save recalculation
                    </Button>
                    <Button
                      className="flex-1"
                      variant="secondary"
                      onClick={() => {
                        setSelectedItem(null);
                        setItemForm({
                          absentDays: '',
                          leaveDays: '',
                          overtimeHours: '',
                          manualAllowance: '',
                          manualDeduction: '',
                          notes: '',
                        });
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Select a row from the payroll run detail table to edit that employee’s draft payroll line.
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Runs;

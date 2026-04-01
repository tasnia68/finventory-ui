import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DataTable, Input } from '../../components/common';
import {
  createAttendanceAdjustment,
  deleteAttendanceAdjustment,
  getAttendanceAdjustments,
  getPayrollEmployees,
  importAttendanceAdjustments,
  updateAttendanceAdjustment,
} from '../../services/payrollService';
import { formatMoney, formatNumber } from './shared';

const emptyForm = {
  employeePayrollProfileId: '',
  periodStart: '',
  periodEnd: '',
  attendanceDate: '',
  sourceType: 'MANUAL',
  sourceReference: '',
  deviceIdentifier: '',
  absentDays: '',
  leaveDays: '',
  overtimeHours: '',
  manualAllowance: '',
  manualDeduction: '',
  notes: '',
};

const Attendance = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const [employeeList, adjustmentList] = await Promise.all([
        getPayrollEmployees(),
        getAttendanceAdjustments(),
      ]);
      setEmployees(employeeList || []);
      setAdjustments(adjustmentList || []);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load attendance adjustments' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        employeePayrollProfileId: form.employeePayrollProfileId || null,
        periodStart: form.periodStart || null,
        periodEnd: form.periodEnd || null,
        attendanceDate: form.attendanceDate || null,
        absentDays: form.absentDays || 0,
        leaveDays: form.leaveDays || 0,
        overtimeHours: form.overtimeHours || 0,
        manualAllowance: form.manualAllowance || 0,
        manualDeduction: form.manualDeduction || 0,
      };
      if (editingAdjustmentId) {
        await updateAttendanceAdjustment(editingAdjustmentId, payload);
      } else {
        await createAttendanceAdjustment(payload);
      }
      setForm(emptyForm);
      setEditingAdjustmentId(null);
      setAlert({ type: 'success', message: 'Attendance adjustment saved.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to save attendance adjustment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      setSubmitting(true);
      await importAttendanceAdjustments(file);
      setAlert({ type: 'success', message: 'Attendance CSV imported.' });
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to import attendance CSV' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'employeeCode', header: 'Employee' },
    { key: 'periodStart', header: 'Start' },
    { key: 'periodEnd', header: 'End' },
    { key: 'sourceType', header: 'Source' },
    { key: 'absentDays', header: 'Absent', render: (value) => formatNumber(value, 3) },
    { key: 'leaveDays', header: 'Leave', render: (value) => formatNumber(value, 3) },
    { key: 'overtimeHours', header: 'OT Hours', render: (value) => formatNumber(value, 3) },
    { key: 'manualAllowance', header: 'Allowance', render: (value) => formatMoney(value) },
    { key: 'manualDeduction', header: 'Deduction', render: (value) => formatMoney(value) },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            deleteAttendanceAdjustment(row.id)
              .then(() => {
                setAlert({ type: 'success', message: 'Attendance adjustment deleted.' });
                return load();
              })
              .catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to delete attendance adjustment' }));
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const startEdit = (adjustment) => {
    setEditingAdjustmentId(adjustment.id);
    setForm({
      employeePayrollProfileId: adjustment.employeePayrollProfileId || '',
      periodStart: adjustment.periodStart || '',
      periodEnd: adjustment.periodEnd || '',
      attendanceDate: adjustment.attendanceDate || '',
      sourceType: adjustment.sourceType || 'MANUAL',
      sourceReference: adjustment.sourceReference || '',
      deviceIdentifier: adjustment.deviceIdentifier || '',
      absentDays: adjustment.absentDays || '',
      leaveDays: adjustment.leaveDays || '',
      overtimeHours: adjustment.overtimeHours || '',
      manualAllowance: adjustment.manualAllowance || '',
      manualDeduction: adjustment.manualDeduction || '',
      notes: adjustment.notes || '',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]">
          <Card title={editingAdjustmentId ? 'Edit Attendance & Adjustment Input' : 'Attendance & Adjustment Input'} subtitle="Manual variable input with CSV import compatibility for future biometric sources">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Employee
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.employeePayrollProfileId} onChange={(event) => setForm((current) => ({ ...current, employeePayrollProfileId: event.target.value }))}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.userEmail}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input type="date" label="Period start" value={form.periodStart} onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))} />
                <Input type="date" label="Period end" value={form.periodEnd} onChange={(event) => setForm((current) => ({ ...current, periodEnd: event.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input type="date" label="Attendance date" value={form.attendanceDate} onChange={(event) => setForm((current) => ({ ...current, attendanceDate: event.target.value }))} />
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Source
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}>
                    <option value="MANUAL">Manual</option>
                    <option value="CSV_IMPORT">CSV Import</option>
                    <option value="BIOMETRIC">Biometric</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Source reference" value={form.sourceReference} onChange={(event) => setForm((current) => ({ ...current, sourceReference: event.target.value }))} />
                <Input label="Device identifier" value={form.deviceIdentifier} onChange={(event) => setForm((current) => ({ ...current, deviceIdentifier: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.001" label="Absent days" value={form.absentDays} onChange={(event) => setForm((current) => ({ ...current, absentDays: event.target.value }))} />
                <Input type="number" step="0.001" label="Leave days" value={form.leaveDays} onChange={(event) => setForm((current) => ({ ...current, leaveDays: event.target.value }))} />
                <Input type="number" step="0.001" label="Overtime hours" value={form.overtimeHours} onChange={(event) => setForm((current) => ({ ...current, overtimeHours: event.target.value }))} />
                <Input type="number" step="0.01" label="Allowance" value={form.manualAllowance} onChange={(event) => setForm((current) => ({ ...current, manualAllowance: event.target.value }))} />
                <Input type="number" step="0.01" label="Deduction" value={form.manualDeduction} onChange={(event) => setForm((current) => ({ ...current, manualDeduction: event.target.value }))} />
                <Input label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" loading={submitting} onClick={handleSave}>
                  {editingAdjustmentId ? 'Update adjustment' : 'Save adjustment'}
                </Button>
                {editingAdjustmentId ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setEditingAdjustmentId(null);
                      setForm(emptyForm);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  CSV columns: `userEmail,periodStart,periodEnd,attendanceDate,sourceReference,deviceIdentifier,absentDays,leaveDays,overtimeHours,manualAllowance,manualDeduction,notes`
                </p>
                <input ref={fileRef} type="file" accept=".csv" className="block w-full text-sm text-slate-700 dark:text-slate-200" />
                <Button variant="secondary" className="w-full" loading={submitting} onClick={handleImport}>
                  Import CSV
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden" title="Attendance & Adjustment Log" subtitle="Source-ready variable payroll inputs by employee and period">
            <DataTable columns={columns} data={adjustments} loading={loading} emptyMessage="No attendance adjustments recorded yet." onRowClick={startEdit} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Attendance;

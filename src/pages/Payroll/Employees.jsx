import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, DataTable, Input } from '../../components/common';
import {
  archivePayrollEmployee,
  assignSalaryStructure,
  createPayrollDepartment,
  createPayrollDesignation,
  deletePayrollDepartment,
  deletePayrollDesignation,
  createPayrollEmployee,
  getPayrollDepartments,
  getPayrollDesignations,
  getPayrollEmployees,
  getPayrollUserOptions,
  getSalaryStructures,
  updatePayrollEmployee,
} from '../../services/payrollService';
import { fullName } from './shared';

const emptyForm = {
  userId: '',
  employeeCode: '',
  departmentId: '',
  designationId: '',
  payFrequency: 'MONTHLY',
  joinDate: '',
  active: true,
  notes: '',
};

const Employees = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [structures, setStructures] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [assignmentByEmployee, setAssignmentByEmployee] = useState({});
  const [departmentName, setDepartmentName] = useState('');
  const [designationName, setDesignationName] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [userList, employeeList, departmentList, designationList, structureList] = await Promise.all([
        getPayrollUserOptions(),
        getPayrollEmployees(),
        getPayrollDepartments(),
        getPayrollDesignations(),
        getSalaryStructures(),
      ]);
      setUsers(userList || []);
      setEmployees(employeeList || []);
      setDepartments(departmentList || []);
      setDesignations(designationList || []);
      setStructures(structureList || []);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load payroll employees' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const availableUsers = useMemo(() => {
    const usedIds = new Set(employees.map((employee) => employee.userId));
    return users.filter((user) => !usedIds.has(user.id));
  }, [employees, users]);

  const handleSaveEmployee = async () => {
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        userId: form.userId || null,
        departmentId: form.departmentId || null,
        designationId: form.designationId || null,
        joinDate: form.joinDate || null,
      };
      if (editingEmployeeId) {
        await updatePayrollEmployee(editingEmployeeId, payload);
      } else {
        await createPayrollEmployee(payload);
      }
      setForm(emptyForm);
      setEditingEmployeeId(null);
      setAlert({ type: 'success', message: 'Payroll employee created.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to save payroll employee' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!departmentName.trim()) return;
    try {
      setSubmitting(true);
      await createPayrollDepartment({ name: departmentName.trim(), active: true });
      setDepartmentName('');
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create department' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDesignation = async () => {
    if (!designationName.trim()) return;
    try {
      setSubmitting(true);
      await createPayrollDesignation({ name: designationName.trim(), active: true });
      setDesignationName('');
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create designation' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (employeeId) => {
    const structureId = assignmentByEmployee[employeeId];
    if (!structureId) return;
    try {
      setSubmitting(true);
      await assignSalaryStructure({
        employeePayrollProfileId: employeeId,
        salaryStructureId: structureId,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
      setAlert({ type: 'success', message: 'Salary structure assigned.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to assign salary structure' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'employeeCode',
      header: 'Employee',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{row.employeeCode}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{fullName(row)}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{row.userEmail}</div>
        </div>
      ),
    },
    { key: 'departmentName', header: 'Department' },
    { key: 'designationName', header: 'Designation' },
    { key: 'payFrequency', header: 'Cycle' },
    { key: 'activeSalaryStructureName', header: 'Salary Structure', render: (value) => value || 'Unassigned' },
    {
      key: 'actions',
      header: 'Assign Structure',
      render: (_, row) => (
        <div className="flex min-w-[14rem] items-center gap-2">
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            value={assignmentByEmployee[row.id] || ''}
            onChange={(event) => setAssignmentByEmployee((current) => ({ ...current, [row.id]: event.target.value }))}
          >
            <option value="">Select structure</option>
            {structures.map((structure) => (
              <option key={structure.id} value={structure.id}>
                {structure.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => handleAssign(row.id)} disabled={submitting || !assignmentByEmployee[row.id]}>
            Assign
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              archivePayrollEmployee(row.id)
                .then(() => {
                  setAlert({ type: 'success', message: 'Payroll employee archived.' });
                  return load();
                })
                .catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to archive payroll employee' }));
            }}
          >
            Archive
          </Button>
        </div>
      ),
    },
  ];

  const startEdit = (employee) => {
    setEditingEmployeeId(employee.id);
    setForm({
      userId: employee.userId || '',
      employeeCode: employee.employeeCode || '',
      departmentId: employee.departmentId || '',
      designationId: employee.designationId || '',
      payFrequency: employee.payFrequency || 'MONTHLY',
      joinDate: employee.joinDate || '',
      active: employee.active !== false,
      notes: employee.notes || '',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]">
          <Card title={editingEmployeeId ? 'Edit Payroll Employee' : 'Add Payroll Employee'} subtitle="Link an existing user to payroll, then assign a salary structure">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                User
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}>
                  <option value="">Select user</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Employee code" value={form.employeeCode} onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))} placeholder="EMP-1001" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Department
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.departmentId} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}>
                    <option value="">Optional</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Designation
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.designationId} onChange={(event) => setForm((current) => ({ ...current, designationId: event.target.value }))}>
                    <option value="">Optional</option>
                    {designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pay cycle
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.payFrequency} onChange={(event) => setForm((current) => ({ ...current, payFrequency: event.target.value }))}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </label>
                <Input type="date" label="Join date" value={form.joinDate} onChange={(event) => setForm((current) => ({ ...current, joinDate: event.target.value }))} />
              </div>
              <Input label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Shift, team, or payroll notes" />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Active employee
              </label>
              <div className="flex gap-3">
                <Button className="flex-1" loading={submitting} onClick={handleSaveEmployee}>
                  {editingEmployeeId ? 'Update payroll employee' : 'Create payroll employee'}
                </Button>
                {editingEmployeeId ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setEditingEmployeeId(null);
                      setForm(emptyForm);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden" title="Employee Payroll Profiles" subtitle="Existing user identities extended with payroll data">
            <DataTable columns={columns} data={employees} loading={loading} emptyMessage="No payroll employees created yet." onRowClick={startEdit} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Departments" subtitle="Simple payroll department masters">
            <div className="flex gap-3">
              <Input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="Operations" />
              <Button onClick={handleCreateDepartment} loading={submitting}>Add</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => deletePayrollDepartment(department.id).then(load).catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to delete department' }))}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 transition hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {department.name} ×
                </button>
              ))}
            </div>
          </Card>

          <Card title="Designations" subtitle="Job title masters for payroll profiles">
            <div className="flex gap-3">
              <Input value={designationName} onChange={(event) => setDesignationName(event.target.value)} placeholder="Senior Executive" />
              <Button onClick={handleCreateDesignation} loading={submitting}>Add</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {designations.map((designation) => (
                <button
                  key={designation.id}
                  type="button"
                  onClick={() => deletePayrollDesignation(designation.id).then(load).catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to delete designation' }))}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 transition hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {designation.name} ×
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Employees;

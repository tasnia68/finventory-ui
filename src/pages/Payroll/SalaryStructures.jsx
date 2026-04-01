import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, DataTable, Input } from '../../components/common';
import {
  createPayrollComponent,
  createSalaryStructure,
  deletePayrollComponent,
  deleteSalaryStructure,
  getPayrollComponents,
  getSalaryStructures,
  updatePayrollComponent,
  updateSalaryStructure,
} from '../../services/payrollService';
import { emptyStructureComponent, formatMoney } from './shared';

const SalaryStructures = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [components, setComponents] = useState([]);
  const [structures, setStructures] = useState([]);
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [editingStructureId, setEditingStructureId] = useState(null);
  const [componentForm, setComponentForm] = useState({
    code: '',
    name: '',
    componentType: 'EARNING',
    valueType: 'FIXED',
    defaultAmount: '',
    defaultRate: '',
    statutory: false,
  });
  const [structureForm, setStructureForm] = useState({
    name: '',
    description: '',
    payFrequency: 'MONTHLY',
    components: [emptyStructureComponent()],
  });

  const load = async () => {
    try {
      setLoading(true);
      const [componentList, structureList] = await Promise.all([
        getPayrollComponents(),
        getSalaryStructures(),
      ]);
      setComponents(componentList || []);
      setStructures(structureList || []);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load salary structures' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveComponent = async () => {
    try {
      setSubmitting(true);
      const payload = {
        ...componentForm,
        defaultAmount: componentForm.defaultAmount || 0,
        defaultRate: componentForm.defaultRate || 0,
      };
      if (editingComponentId) {
        await updatePayrollComponent(editingComponentId, payload);
      } else {
        await createPayrollComponent(payload);
      }
      setComponentForm({
        code: '',
        name: '',
        componentType: 'EARNING',
        valueType: 'FIXED',
        defaultAmount: '',
        defaultRate: '',
        statutory: false,
      });
      setEditingComponentId(null);
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to save payroll component' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStructure = async () => {
    try {
      setSubmitting(true);
      const payload = {
        ...structureForm,
        components: structureForm.components
          .filter((component) => component.payrollComponentId)
          .map((component, index) => ({
            payrollComponentId: component.payrollComponentId,
            amount: component.amount || 0,
            rate: component.rate || 0,
            sortOrder: index,
          })),
      };
      if (editingStructureId) {
        await updateSalaryStructure(editingStructureId, payload);
      } else {
        await createSalaryStructure(payload);
      }
      setStructureForm({
        name: '',
        description: '',
        payFrequency: 'MONTHLY',
        components: [emptyStructureComponent()],
      });
      setEditingStructureId(null);
      setAlert({ type: 'success', message: 'Salary structure created.' });
      await load();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to save salary structure' });
    } finally {
      setSubmitting(false);
    }
  };

  const structureColumns = [
    { key: 'name', header: 'Structure' },
    { key: 'payFrequency', header: 'Cycle' },
    { key: 'components', header: 'Components', render: (value) => value?.length || 0 },
    {
      key: 'componentsSummary',
      header: 'Component Summary',
      render: (_, row) => (
        <div className="space-y-1">
          {(row.components || []).slice(0, 4).map((component) => (
            <div key={component.id || component.payrollComponentId} className="text-xs text-slate-600 dark:text-slate-300">
              {component.payrollComponentName} · {component.valueType === 'PERCENTAGE' ? `${component.rate}%` : formatMoney(component.amount)}
            </div>
          ))}
        </div>
      ),
    },
  ];

  const startEditComponent = (component) => {
    setEditingComponentId(component.id);
    setComponentForm({
      code: component.code || '',
      name: component.name || '',
      componentType: component.componentType || 'EARNING',
      valueType: component.valueType || 'FIXED',
      defaultAmount: component.defaultAmount || '',
      defaultRate: component.defaultRate || '',
      statutory: component.statutory || false,
    });
  };

  const startEditStructure = (structure) => {
    setEditingStructureId(structure.id);
    setStructureForm({
      name: structure.name || '',
      description: structure.description || '',
      payFrequency: structure.payFrequency || 'MONTHLY',
      components: (structure.components || []).map((component) => ({
        payrollComponentId: component.payrollComponentId || '',
        amount: component.amount || '',
        rate: component.rate || '',
        sortOrder: component.sortOrder || 0,
      })),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title={editingComponentId ? 'Edit Payroll Component' : 'Payroll Components'} subtitle="Bangladesh defaults are auto-seeded; add tenant-specific components here">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Code" value={componentForm.code} onChange={(event) => setComponentForm((current) => ({ ...current, code: event.target.value }))} placeholder="SHIFT_ALLOWANCE" />
                <Input label="Name" value={componentForm.name} onChange={(event) => setComponentForm((current) => ({ ...current, name: event.target.value }))} placeholder="Shift Allowance" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Component type
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={componentForm.componentType} onChange={(event) => setComponentForm((current) => ({ ...current, componentType: event.target.value }))}>
                    <option value="EARNING">Earning</option>
                    <option value="DEDUCTION">Deduction</option>
                    <option value="STATUTORY">Statutory</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Value type
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={componentForm.valueType} onChange={(event) => setComponentForm((current) => ({ ...current, valueType: event.target.value }))}>
                    <option value="FIXED">Fixed</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.01" label="Default amount" value={componentForm.defaultAmount} onChange={(event) => setComponentForm((current) => ({ ...current, defaultAmount: event.target.value }))} />
                <Input type="number" step="0.01" label="Default rate %" value={componentForm.defaultRate} onChange={(event) => setComponentForm((current) => ({ ...current, defaultRate: event.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={componentForm.statutory} onChange={(event) => setComponentForm((current) => ({ ...current, statutory: event.target.checked }))} />
                Mark as statutory
              </label>
              <div className="flex gap-3">
                <Button className="flex-1" loading={submitting} onClick={handleSaveComponent}>
                  {editingComponentId ? 'Update component' : 'Add component'}
                </Button>
                {editingComponentId ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setEditingComponentId(null);
                      setComponentForm({
                        code: '',
                        name: '',
                        componentType: 'EARNING',
                        valueType: 'FIXED',
                        defaultAmount: '',
                        defaultRate: '',
                        statutory: false,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              <DataTable
                columns={[
                  { key: 'code', header: 'Code' },
                  { key: 'name', header: 'Name' },
                  { key: 'componentType', header: 'Type' },
                  { key: 'valueType', header: 'Value Type' },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (_, row) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          deletePayrollComponent(row.id)
                            .then(() => {
                              setAlert({ type: 'success', message: 'Payroll component deleted.' });
                              return load();
                            })
                            .catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to delete payroll component' }));
                        }}
                      >
                        Delete
                      </Button>
                    ),
                  },
                ]}
                data={components}
                loading={loading}
                emptyMessage="No components available."
                onRowClick={startEditComponent}
              />
            </div>
          </Card>

          <Card title={editingStructureId ? 'Edit Salary Structure' : 'Salary Structures'} subtitle="Compose recurring earnings, deductions, and statutory components into reusable structures">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Structure name" value={structureForm.name} onChange={(event) => setStructureForm((current) => ({ ...current, name: event.target.value }))} placeholder="Staff Monthly Standard" />
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pay frequency
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={structureForm.payFrequency} onChange={(event) => setStructureForm((current) => ({ ...current, payFrequency: event.target.value }))}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </label>
              </div>
              <Input label="Description" value={structureForm.description} onChange={(event) => setStructureForm((current) => ({ ...current, description: event.target.value }))} placeholder="Default monthly structure for Bangladesh office staff" />
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                {structureForm.components.map((component, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[minmax(0,1fr)_7rem_7rem_auto]">
                    <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={component.payrollComponentId} onChange={(event) => setStructureForm((current) => ({ ...current, components: current.components.map((item, itemIndex) => itemIndex === index ? { ...item, payrollComponentId: event.target.value } : item) }))}>
                      <option value="">Select component</option>
                      {components.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                    </select>
                    <Input type="number" step="0.01" value={component.amount} onChange={(event) => setStructureForm((current) => ({ ...current, components: current.components.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item) }))} placeholder="Amount" />
                    <Input type="number" step="0.01" value={component.rate} onChange={(event) => setStructureForm((current) => ({ ...current, components: current.components.map((item, itemIndex) => itemIndex === index ? { ...item, rate: event.target.value } : item) }))} placeholder="Rate %" />
                    <Button variant="ghost" onClick={() => setStructureForm((current) => ({ ...current, components: current.components.filter((_, itemIndex) => itemIndex !== index) }))}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" className="w-full" onClick={() => setStructureForm((current) => ({ ...current, components: [...current.components, emptyStructureComponent()] }))}>
                  Add component row
                </Button>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" loading={submitting} onClick={handleSaveStructure}>
                  {editingStructureId ? 'Update salary structure' : 'Create salary structure'}
                </Button>
                {editingStructureId ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setEditingStructureId(null);
                      setStructureForm({
                        name: '',
                        description: '',
                        payFrequency: 'MONTHLY',
                        components: [emptyStructureComponent()],
                      });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <Card padding="none" className="overflow-hidden" title="Saved Salary Structures" subtitle="Reusable recurring salary definitions ready for assignment">
          <DataTable
            columns={[
              ...structureColumns,
              {
                key: 'actions',
                header: 'Actions',
                render: (_, row) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteSalaryStructure(row.id)
                        .then(() => {
                          setAlert({ type: 'success', message: 'Salary structure deleted.' });
                          return load();
                        })
                        .catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to delete salary structure' }));
                    }}
                  >
                    Delete
                  </Button>
                ),
              },
            ]}
            data={structures}
            loading={loading}
            emptyMessage="No salary structures created yet."
            onRowClick={startEditStructure}
          />
        </Card>
      </div>
    </div>
  );
};

export default SalaryStructures;

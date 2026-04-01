import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input } from '../../components/common';
import { getAccounts } from '../../services/accountingService';
import { getPayrollSettings, savePayrollSettings } from '../../services/payrollService';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    salaryExpenseAccountId: '',
    allowanceExpenseAccountId: '',
    deductionLiabilityAccountId: '',
    payrollPayableAccountId: '',
    cashClearingAccountId: '',
    monthlyWorkDays: 30,
    weeklyWorkDays: 7,
    defaultCurrency: 'BDT',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [settings, accountList] = await Promise.all([
          getPayrollSettings(),
          getAccounts(),
        ]);
        setAccounts(accountList || []);
        setForm({
          salaryExpenseAccountId: settings?.salaryExpenseAccountId || '',
          allowanceExpenseAccountId: settings?.allowanceExpenseAccountId || '',
          deductionLiabilityAccountId: settings?.deductionLiabilityAccountId || '',
          payrollPayableAccountId: settings?.payrollPayableAccountId || '',
          cashClearingAccountId: settings?.cashClearingAccountId || '',
          monthlyWorkDays: settings?.monthlyWorkDays || 30,
          weeklyWorkDays: settings?.weeklyWorkDays || 7,
          defaultCurrency: settings?.defaultCurrency || 'BDT',
        });
      } catch (error) {
        setAlert({ type: 'error', message: error.message || 'Failed to load payroll settings' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const accountOptions = accounts.filter((account) => account.active);

  const handleSave = async () => {
    try {
      setSubmitting(true);
      await savePayrollSettings({
        ...form,
        salaryExpenseAccountId: form.salaryExpenseAccountId || null,
        allowanceExpenseAccountId: form.allowanceExpenseAccountId || null,
        deductionLiabilityAccountId: form.deductionLiabilityAccountId || null,
        payrollPayableAccountId: form.payrollPayableAccountId || null,
        cashClearingAccountId: form.cashClearingAccountId || null,
      });
      setAlert({ type: 'success', message: 'Payroll settings updated.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to save payroll settings' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}
        <Card title="Payroll Settings" subtitle="Approval posts a payroll journal using these mappings">
          {loading ? (
            <div className="py-8 text-sm text-slate-500 dark:text-slate-400">Loading payroll settings...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ['salaryExpenseAccountId', 'Salary expense account'],
                ['allowanceExpenseAccountId', 'Allowance expense account'],
                ['deductionLiabilityAccountId', 'Deduction liability account'],
                ['payrollPayableAccountId', 'Payroll payable account'],
                ['cashClearingAccountId', 'Cash clearing account (optional)'],
              ].map(([field, label]) => (
                <label key={field} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {label}
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}>
                    <option value="">Select account</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountCode} · {account.accountName}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <Input type="number" label="Monthly work days" value={form.monthlyWorkDays} onChange={(event) => setForm((current) => ({ ...current, monthlyWorkDays: Number(event.target.value) }))} />
              <Input type="number" label="Weekly work days" value={form.weeklyWorkDays} onChange={(event) => setForm((current) => ({ ...current, weeklyWorkDays: Number(event.target.value) }))} />
              <Input label="Default currency" value={form.defaultCurrency} onChange={(event) => setForm((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))} />
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button loading={submitting} onClick={handleSave}>
              Save settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

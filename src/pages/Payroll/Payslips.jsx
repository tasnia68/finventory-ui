import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, DataTable, Input, Modal } from '../../components/common';
import { getPayrollPayslip, getPayrollPayslips } from '../../services/payrollService';
import { formatMoney } from './shared';

const Payslips = () => {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setPayslips(await getPayrollPayslips());
      } catch (error) {
        setAlert({ type: 'error', message: error.message || 'Failed to load payslips' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredPayslips = payslips.filter((payslip) => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return [
      payslip.payslipNumber,
      payslip.employeeCode,
      payslip.employeeName,
      payslip.payrollRunNumber,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });

  const openPayslip = async (payslip) => {
    try {
      setDetailLoading(true);
      const detail = await getPayrollPayslip(payslip.id);
      setSelectedPayslip(detail);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load payslip detail' });
    } finally {
      setDetailLoading(false);
    }
  };

  const printPayslip = () => {
    if (!selectedPayslip) {
      return;
    }
    const popup = window.open('', '_blank', 'width=960,height=720');
    if (!popup) {
      setAlert({ type: 'error', message: 'Popup blocked. Please allow popups to print payslips.' });
      return;
    }
    popup.document.write(`
      <html>
        <head>
          <title>${selectedPayslip.payslipNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1, h2, h3, p { margin: 0 0 12px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
            .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
            .value { font-size: 18px; font-weight: 700; }
            .line { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Payslip</h1>
          <p><strong>${selectedPayslip.payslipNumber}</strong></p>
          <p>${selectedPayslip.employeeName || selectedPayslip.employeeCode}</p>
          <p>${selectedPayslip.periodStart} to ${selectedPayslip.periodEnd}</p>
          <div class="grid">
            <div class="card"><div class="label">Gross pay</div><div class="value">${formatMoney(selectedPayslip.grossPay, selectedPayslip.currency)}</div></div>
            <div class="card"><div class="label">Net pay</div><div class="value">${formatMoney(selectedPayslip.netPay, selectedPayslip.currency)}</div></div>
            <div class="card"><div class="label">Total earnings</div><div class="value">${formatMoney(selectedPayslip.totalEarnings, selectedPayslip.currency)}</div></div>
            <div class="card"><div class="label">Total deductions</div><div class="value">${formatMoney(selectedPayslip.totalDeductions, selectedPayslip.currency)}</div></div>
          </div>
          <div class="line"><span>Statutory deductions</span><strong>${formatMoney(selectedPayslip.statutoryDeductions, selectedPayslip.currency)}</strong></div>
          <div class="line"><span>Payroll run</span><strong>${selectedPayslip.payrollRunNumber}</strong></div>
          <div class="line"><span>Generated at</span><strong>${selectedPayslip.generatedAt || '-'}</strong></div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const columns = [
    { key: 'payslipNumber', header: 'Payslip' },
    { key: 'employeeCode', header: 'Employee' },
    { key: 'payrollRunNumber', header: 'Run' },
    { key: 'periodStart', header: 'Start' },
    { key: 'periodEnd', header: 'End' },
    { key: 'grossPay', header: 'Gross', render: (value, row) => formatMoney(value, row.currency) },
    { key: 'totalDeductions', header: 'Deductions', render: (value, row) => formatMoney(value, row.currency) },
    { key: 'netPay', header: 'Net', render: (value, row) => formatMoney(value, row.currency) },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Payslips" subtitle="Generated per employee and payroll run. Open a payslip to review and print an export-ready summary.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Generated</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{payslips.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Published</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{payslips.filter((entry) => entry.published).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:col-span-2">
              <Input label="Search payslips" placeholder="Search by payslip, employee, or run number" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <DataTable columns={columns} data={filteredPayslips} loading={loading} emptyMessage="No payslips generated yet." onRowClick={openPayslip} />
        </Card>

        <Modal isOpen={Boolean(selectedPayslip)} onClose={() => setSelectedPayslip(null)} title={selectedPayslip ? `Payslip · ${selectedPayslip.payslipNumber}` : 'Payslip'} size="xl">
          {detailLoading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">Loading payslip detail…</div>
          ) : selectedPayslip ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Employee</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedPayslip.employeeName || selectedPayslip.employeeCode}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedPayslip.employeeCode} · {selectedPayslip.periodStart} to {selectedPayslip.periodEnd}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={printPayslip}>Print / Export</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gross pay</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{formatMoney(selectedPayslip.grossPay, selectedPayslip.currency)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total earnings</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{formatMoney(selectedPayslip.totalEarnings, selectedPayslip.currency)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total deductions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{formatMoney(selectedPayslip.totalDeductions, selectedPayslip.currency)}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-4 dark:bg-primary/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Net pay</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{formatMoney(selectedPayslip.netPay, selectedPayslip.currency)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Payslip Summary" subtitle="Export-ready payroll values for this employee">
                  <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                      <span>Payroll run</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedPayslip.payrollRunNumber}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                      <span>Generated at</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedPayslip.generatedAt || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                      <span>Published</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedPayslip.published ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Statutory deductions</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatMoney(selectedPayslip.statutoryDeductions, selectedPayslip.currency)}</span>
                    </div>
                  </div>
                </Card>

                <Card title="Calculation Breakdown" subtitle="Current output snapshot used for payroll review">
                  <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                      <span>Gross pay</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatMoney(selectedPayslip.grossPay, selectedPayslip.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                      <span>Total earnings</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatMoney(selectedPayslip.totalEarnings, selectedPayslip.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                      <span>Total deductions</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatMoney(selectedPayslip.totalDeductions, selectedPayslip.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Net pay</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(selectedPayslip.netPay, selectedPayslip.currency)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
};

export default Payslips;

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { AccountingPage } from './AccountingShell';
import {
  createAccountsReceivableInvoice,
  getAccountsReceivableAging,
  getAccountsReceivableInvoices,
  getTaxRates,
  recordAccountsReceivablePayment,
} from '../../services/accountingService';
import { getCustomers } from '../../services/customerService';
import { getSalesOrders } from '../../services/salesOrderService';
import { emptyPayment, formatNumber, toList } from './shared';

const Receivables = () => {
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [arInvoices, setArInvoices] = useState([]);
  const [arAging, setArAging] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [arPaymentForms, setArPaymentForms] = useState({});
  const [agingDrilldown, setAgingDrilldown] = useState(null);
  const [arForm, setArForm] = useState({
    customerId: '',
    salesOrderId: '',
    customerInvoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    currency: 'USD',
    totalAmount: '',
    taxRateId: '',
    notes: '',
  });

  const loadReceivables = async () => {
    try {
      setLoading(true);
      const [customersResponse, salesOrdersResponse, taxRatesResponse, arInvoicesResponse, arAgingResponse] = await Promise.all([
        getCustomers(),
        getSalesOrders({ page: 0, size: 100 }),
        getTaxRates(),
        getAccountsReceivableInvoices(),
        getAccountsReceivableAging(),
      ]);
      setCustomers(toList(customersResponse));
      setSalesOrders(toList(salesOrdersResponse));
      setTaxRates(toList(taxRatesResponse).filter((taxRate) => taxRate.active !== false));
      setArInvoices(toList(arInvoicesResponse));
      setArAging(toList(arAgingResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load receivables workspace' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  const activeCustomers = useMemo(() => customers.filter((customer) => customer.isActive !== false), [customers]);

  const invoiceBucket = (invoice) => {
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date();
    const ageDays = Math.floor((new Date() - dueDate) / 86400000);
    if (ageDays <= 0) return 'current';
    if (ageDays <= 30) return 'days1To30';
    if (ageDays <= 60) return 'days31To60';
    if (ageDays <= 90) return 'days61To90';
    return 'over90';
  };

  const drilldownInvoices = useMemo(() => {
    if (!agingDrilldown) return [];
    return arInvoices.filter((invoice) => (
      invoice.customerId === agingDrilldown.partyId
      && Number(invoice.balanceDue || 0) > 0
      && invoiceBucket(invoice) === agingDrilldown.bucket
    ));
  }, [agingDrilldown, arInvoices]);

  const agingBucketButton = (row, bucket, value) => (
    <button
      type="button"
      className="font-semibold text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
      disabled={Number(value || 0) <= 0}
      onClick={() => setAgingDrilldown({ partyId: row.partyId, partyName: row.partyName, bucket })}
    >
      {formatNumber(value)}
    </button>
  );

  const handleSalesOrderChange = (salesOrderId) => {
    const salesOrder = salesOrders.find((entry) => entry.id === salesOrderId);
    setArForm((current) => ({
      ...current,
      salesOrderId,
      customerId: salesOrder?.customerId || current.customerId,
      currency: salesOrder?.currency || current.currency,
      totalAmount: salesOrder?.totalAmount ?? current.totalAmount,
    }));
  };

  const handleCreateArInvoice = async () => {
    try {
      setSubmitting(true);
      await createAccountsReceivableInvoice({
        customerId: arForm.customerId || null,
        salesOrderId: arForm.salesOrderId || null,
        customerInvoiceNumber: arForm.customerInvoiceNumber || null,
        invoiceDate: arForm.invoiceDate || null,
        dueDate: arForm.dueDate || null,
        currency: arForm.currency,
        totalAmount: arForm.totalAmount === '' ? null : Number(arForm.totalAmount),
        taxRateId: arForm.taxRateId || null,
        notes: arForm.notes || null,
      });
      setArForm({
        customerId: '',
        salesOrderId: '',
        customerInvoiceNumber: '',
        invoiceDate: '',
        dueDate: '',
        currency: 'USD',
        totalAmount: '',
        taxRateId: '',
        notes: '',
      });
      setAlert({ type: 'success', message: 'Accounts receivable invoice created.' });
      await loadReceivables();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create accounts receivable invoice' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordArPayment = async (invoiceId) => {
    const payment = arPaymentForms[invoiceId] || emptyPayment();
    try {
      setSubmitting(true);
      await recordAccountsReceivablePayment(invoiceId, {
        amount: payment.amount === '' ? 0 : Number(payment.amount),
        paymentDate: payment.paymentDate || null,
        paymentMethod: payment.paymentMethod || null,
        paymentReference: payment.paymentReference || null,
        notes: payment.notes || null,
      });
      setArPaymentForms((current) => ({ ...current, [invoiceId]: emptyPayment() }));
      setAlert({ type: 'success', message: 'Accounts receivable payment recorded.' });
      await loadReceivables();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to record accounts receivable payment' });
    } finally {
      setSubmitting(false);
    }
  };

  const arColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.customerName} · {row.salesOrderNumber || 'Direct AR'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={value === 'PAID' ? 'success' : value === 'PARTIALLY_PAID' ? 'warning' : 'default'}>{value}</Badge>,
    },
    { key: 'dueDate', header: 'Due', render: (value) => value || '—' },
    { key: 'totalAmount', header: 'Total', render: (value) => formatNumber(value) },
    {
      key: 'taxAmount',
      header: 'Tax',
      render: (value, row) => (
        <div>
          <div>{formatNumber(value)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.taxRateCode || 'No tax'}</div>
        </div>
      ),
    },
    { key: 'balanceDue', header: 'Balance', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (_, row) => {
        const payment = arPaymentForms[row.id] || emptyPayment();
        return (
          <div className="grid min-w-[22rem] grid-cols-1 gap-2 md:grid-cols-4">
            <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" type="number" step="0.000001" value={payment.amount} onChange={(event) => setArPaymentForms((current) => ({ ...current, [row.id]: { ...payment, amount: event.target.value } }))} placeholder="Amount" />
            <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" type="date" value={payment.paymentDate} onChange={(event) => setArPaymentForms((current) => ({ ...current, [row.id]: { ...payment, paymentDate: event.target.value } }))} />
            <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" type="text" value={payment.paymentMethod} onChange={(event) => setArPaymentForms((current) => ({ ...current, [row.id]: { ...payment, paymentMethod: event.target.value } }))} placeholder="Method" />
            <Button size="sm" variant="secondary" disabled={submitting || Number(row.balanceDue || 0) <= 0} onClick={() => handleRecordArPayment(row.id)}>Record</Button>
          </div>
        );
      },
    },
  ];

  const agingColumns = [
    { key: 'partyName', header: 'Party' },
    { key: 'invoiceCount', header: 'Invoices' },
    { key: 'totalOpenAmount', header: 'Open', render: (value) => formatNumber(value) },
    { key: 'currentAmount', header: 'Current', render: (value, row) => agingBucketButton(row, 'current', value) },
    { key: 'days1To30Amount', header: '1-30', render: (value, row) => agingBucketButton(row, 'days1To30', value) },
    { key: 'days31To60Amount', header: '31-60', render: (value, row) => agingBucketButton(row, 'days31To60', value) },
    { key: 'days61To90Amount', header: '61-90', render: (value, row) => agingBucketButton(row, 'days61To90', value) },
    { key: 'over90Amount', header: '90+', render: (value, row) => agingBucketButton(row, 'over90', value) },
  ];

  const drilldownColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.customerInvoiceNumber || row.salesOrderNumber || 'Direct AR'}</div>
        </div>
      ),
    },
    { key: 'dueDate', header: 'Due' },
    { key: 'totalAmount', header: 'Total', render: (value) => formatNumber(value) },
    { key: 'balanceDue', header: 'Balance', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
    {
      key: 'payments',
      header: 'Payments',
      render: (_, row) => `${row.payments?.length || 0} receipt(s)`,
    },
  ];

  return (
    <AccountingPage title="Receivables" subtitle="Customer invoices, receipts, and AR aging.">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]">
          <Card title="Create AR Invoice" subtitle="Register a customer invoice and tie it to a sales order when available">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Customer
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={arForm.customerId} onChange={(event) => setArForm((current) => ({ ...current, customerId: event.target.value }))}>
                  <option value="">Select customer</option>
                  {activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Sales order
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={arForm.salesOrderId} onChange={(event) => handleSalesOrderChange(event.target.value)}>
                  <option value="">Direct AR invoice</option>
                  {salesOrders.map((salesOrder) => <option key={salesOrder.id} value={salesOrder.id}>{salesOrder.orderNumber} · {salesOrder.customerName || salesOrder.customerId}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Customer invoice #" value={arForm.customerInvoiceNumber} onChange={(event) => setArForm((current) => ({ ...current, customerInvoiceNumber: event.target.value }))} placeholder="AR-INV-001" />
                <Input label="Currency" value={arForm.currency} onChange={(event) => setArForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} placeholder="USD" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input type="date" label="Invoice date" value={arForm.invoiceDate} onChange={(event) => setArForm((current) => ({ ...current, invoiceDate: event.target.value }))} />
                <Input type="date" label="Due date" value={arForm.dueDate} onChange={(event) => setArForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </div>
              <Input type="number" step="0.000001" label="Total amount" value={arForm.totalAmount} onChange={(event) => setArForm((current) => ({ ...current, totalAmount: event.target.value }))} placeholder="0.00" />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tax rate
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={arForm.taxRateId} onChange={(event) => setArForm((current) => ({ ...current, taxRateId: event.target.value }))}>
                  <option value="">No tax</option>
                  {taxRates.map((taxRate) => (
                    <option key={taxRate.id} value={taxRate.id}>
                      {taxRate.code} · {taxRate.name} ({Number(taxRate.rate || 0) * 100}%)
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Notes" value={arForm.notes} onChange={(event) => setArForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional AR notes" />
              <Button className="w-full" icon="request_quote" loading={submitting} onClick={handleCreateArInvoice}>Create AR invoice</Button>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card padding="none" className="overflow-hidden" title="Accounts Receivable" subtitle="Customer invoices, receipts, and receivable balances">
              <DataTable columns={arColumns} data={arInvoices} loading={loading} emptyMessage="No accounts receivable invoices created yet." />
            </Card>

            <Card padding="none" className="overflow-hidden" title="AR Aging" subtitle="Customer exposure bucketed by due date">
              <DataTable columns={agingColumns} data={arAging} loading={loading} emptyMessage="No unpaid AR balances are available yet." />
            </Card>

            {agingDrilldown ? (
              <Card
                padding="none"
                className="overflow-hidden"
                title={`${agingDrilldown.partyName} · ${agingDrilldown.bucket}`}
                subtitle="Open customer invoices in the selected aging bucket"
                action={<Button size="sm" variant="ghost" onClick={() => setAgingDrilldown(null)}>Close</Button>}
              >
                <DataTable columns={drilldownColumns} data={drilldownInvoices} loading={loading} emptyMessage="No invoices in this bucket." />
              </Card>
            ) : null}
          </div>
        </div>
    </AccountingPage>
  );
};

export default Receivables;

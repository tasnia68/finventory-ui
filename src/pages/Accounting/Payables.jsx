import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import {
  createAccountsPayableInvoice,
  getAccountsPayableAging,
  getAccountsPayableInvoices,
  recordAccountsPayablePayment,
} from '../../services/accountingService';
import { getPurchaseOrders } from '../../services/purchaseOrderService';
import { getSuppliers } from '../../services/supplierService';
import { emptyPayment, formatNumber, toList } from './shared';

const agingColumns = [
  { key: 'partyName', header: 'Party' },
  { key: 'invoiceCount', header: 'Invoices' },
  { key: 'totalOpenAmount', header: 'Open', render: (value) => formatNumber(value) },
  { key: 'currentAmount', header: 'Current', render: (value) => formatNumber(value) },
  { key: 'days1To30Amount', header: '1-30', render: (value) => formatNumber(value) },
  { key: 'days31To60Amount', header: '31-60', render: (value) => formatNumber(value) },
  { key: 'days61To90Amount', header: '61-90', render: (value) => formatNumber(value) },
  { key: 'over90Amount', header: '90+', render: (value) => formatNumber(value) },
];

const Payables = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [apInvoices, setApInvoices] = useState([]);
  const [apAging, setApAging] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [apPaymentForms, setApPaymentForms] = useState({});
  const [apForm, setApForm] = useState({
    supplierId: '',
    purchaseOrderId: '',
    supplierInvoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    currency: 'USD',
    totalAmount: '',
    notes: '',
  });

  const loadPayables = async () => {
    try {
      setLoading(true);
      const [suppliersResponse, purchaseOrdersResponse, apInvoicesResponse, apAgingResponse] = await Promise.all([
        getSuppliers(),
        getPurchaseOrders({ page: 0, size: 100 }),
        getAccountsPayableInvoices(),
        getAccountsPayableAging(),
      ]);
      setSuppliers(toList(suppliersResponse));
      setPurchaseOrders(toList(purchaseOrdersResponse));
      setApInvoices(toList(apInvoicesResponse));
      setApAging(toList(apAgingResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load payables workspace' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayables();
  }, []);

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.isActive !== false), [suppliers]);

  const handlePurchaseOrderChange = (purchaseOrderId) => {
    const purchaseOrder = purchaseOrders.find((entry) => entry.id === purchaseOrderId);
    setApForm((current) => ({
      ...current,
      purchaseOrderId,
      supplierId: purchaseOrder?.supplierId || current.supplierId,
      currency: purchaseOrder?.currency || current.currency,
      totalAmount: purchaseOrder?.totalAmount ?? current.totalAmount,
    }));
  };

  const handleCreateApInvoice = async () => {
    try {
      setSubmitting(true);
      await createAccountsPayableInvoice({
        supplierId: apForm.supplierId || null,
        purchaseOrderId: apForm.purchaseOrderId || null,
        supplierInvoiceNumber: apForm.supplierInvoiceNumber || null,
        invoiceDate: apForm.invoiceDate || null,
        dueDate: apForm.dueDate || null,
        currency: apForm.currency,
        totalAmount: apForm.totalAmount === '' ? null : Number(apForm.totalAmount),
        notes: apForm.notes || null,
      });
      setApForm({
        supplierId: '',
        purchaseOrderId: '',
        supplierInvoiceNumber: '',
        invoiceDate: '',
        dueDate: '',
        currency: 'USD',
        totalAmount: '',
        notes: '',
      });
      setAlert({ type: 'success', message: 'Accounts payable invoice created.' });
      await loadPayables();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create accounts payable invoice' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordApPayment = async (invoiceId) => {
    const payment = apPaymentForms[invoiceId] || emptyPayment();
    try {
      setSubmitting(true);
      await recordAccountsPayablePayment(invoiceId, {
        amount: payment.amount === '' ? 0 : Number(payment.amount),
        paymentDate: payment.paymentDate || null,
        paymentMethod: payment.paymentMethod || null,
        paymentReference: payment.paymentReference || null,
        notes: payment.notes || null,
      });
      setApPaymentForms((current) => ({ ...current, [invoiceId]: emptyPayment() }));
      setAlert({ type: 'success', message: 'Accounts payable payment recorded.' });
      await loadPayables();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to record accounts payable payment' });
    } finally {
      setSubmitting(false);
    }
  };

  const apColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.supplierName} · {row.purchaseOrderNumber || 'Direct AP'}</div>
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
    { key: 'balanceDue', header: 'Balance', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
    {
      key: 'payment',
      header: 'Payment',
      render: (_, row) => {
        const payment = apPaymentForms[row.id] || emptyPayment();
        return (
          <div className="grid min-w-[22rem] grid-cols-1 gap-2 md:grid-cols-4">
            <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" type="number" step="0.000001" value={payment.amount} onChange={(event) => setApPaymentForms((current) => ({ ...current, [row.id]: { ...payment, amount: event.target.value } }))} placeholder="Amount" />
            <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" type="date" value={payment.paymentDate} onChange={(event) => setApPaymentForms((current) => ({ ...current, [row.id]: { ...payment, paymentDate: event.target.value } }))} />
            <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" type="text" value={payment.paymentMethod} onChange={(event) => setApPaymentForms((current) => ({ ...current, [row.id]: { ...payment, paymentMethod: event.target.value } }))} placeholder="Method" />
            <Button size="sm" variant="secondary" disabled={submitting || Number(row.balanceDue || 0) <= 0} onClick={() => handleRecordApPayment(row.id)}>Record</Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]">
          <Card title="Create AP Invoice" subtitle="Register a supplier invoice and tie it to a PO when available">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Supplier
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={apForm.supplierId} onChange={(event) => setApForm((current) => ({ ...current, supplierId: event.target.value }))}>
                  <option value="">Select supplier</option>
                  {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Purchase order
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={apForm.purchaseOrderId} onChange={(event) => handlePurchaseOrderChange(event.target.value)}>
                  <option value="">Direct AP invoice</option>
                  {purchaseOrders.map((purchaseOrder) => <option key={purchaseOrder.id} value={purchaseOrder.id}>{purchaseOrder.orderNumber} · {purchaseOrder.supplierName || purchaseOrder.supplierId}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Supplier invoice #" value={apForm.supplierInvoiceNumber} onChange={(event) => setApForm((current) => ({ ...current, supplierInvoiceNumber: event.target.value }))} placeholder="SUP-INV-001" />
                <Input label="Currency" value={apForm.currency} onChange={(event) => setApForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} placeholder="USD" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input type="date" label="Invoice date" value={apForm.invoiceDate} onChange={(event) => setApForm((current) => ({ ...current, invoiceDate: event.target.value }))} />
                <Input type="date" label="Due date" value={apForm.dueDate} onChange={(event) => setApForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </div>
              <Input type="number" step="0.000001" label="Total amount" value={apForm.totalAmount} onChange={(event) => setApForm((current) => ({ ...current, totalAmount: event.target.value }))} placeholder="0.00" />
              <Input label="Notes" value={apForm.notes} onChange={(event) => setApForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional AP notes" />
              <Button className="w-full" icon="request_quote" loading={submitting} onClick={handleCreateApInvoice}>Create AP invoice</Button>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card padding="none" className="overflow-hidden" title="Accounts Payable" subtitle="Supplier bills, settlements, and payable balances">
              <DataTable columns={apColumns} data={apInvoices} loading={loading} emptyMessage="No accounts payable invoices created yet." />
            </Card>

            <Card padding="none" className="overflow-hidden" title="AP Aging" subtitle="Supplier exposure bucketed by due date">
              <DataTable columns={agingColumns} data={apAging} loading={loading} emptyMessage="No unpaid AP balances are available yet." />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payables;

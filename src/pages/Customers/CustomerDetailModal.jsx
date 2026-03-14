import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, Modal, ProductVariantLookup, Select } from '../../components/common';
import {
    adjustCustomerCredit,
    createCustomerPriceList,
    deleteCustomerPriceList,
    getCustomerCreditTransactions,
    getCustomerOrderHistory,
    getCustomerPriceLists,
} from '../../services/customerService';
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    getCreditTransactionVariant,
    getCustomerStatusVariant,
    getSalesOrderStatusVariant,
    toList,
} from '../Sales/utils';

const CREDIT_TYPES = ['CHARGE', 'PAYMENT', 'ADJUSTMENT'].map((value) => ({ value, label: value }));

const initialPriceForm = { variant: null, price: '', currency: 'USD', effectiveFrom: '', effectiveTo: '', notes: '' };
const initialCreditForm = { type: 'CHARGE', amount: '', referenceNumber: '', notes: '' };

const CustomerDetailModal = ({ customer, isOpen, onClose, onRefresh, onEdit }) => {
    const [priceLists, setPriceLists] = useState([]);
    const [creditTransactions, setCreditTransactions] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [priceForm, setPriceForm] = useState(initialPriceForm);
    const [creditForm, setCreditForm] = useState(initialCreditForm);
    const [savingPrice, setSavingPrice] = useState(false);
    const [savingCredit, setSavingCredit] = useState(false);

    useEffect(() => {
        if (isOpen && customer?.id) {
            loadDetail();
        }
    }, [isOpen, customer?.id]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 4000);
    };

    const loadDetail = async () => {
        try {
            setLoading(true);
            const [priceListData, creditData, orderData] = await Promise.all([
                getCustomerPriceLists(customer.id),
                getCustomerCreditTransactions(customer.id, { size: 10 }),
                getCustomerOrderHistory(customer.id, { size: 10 }),
            ]);
            setPriceLists(toList(priceListData));
            setCreditTransactions(toList(creditData));
            setOrders(toList(orderData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load customer detail');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePriceList = async (event) => {
        event.preventDefault();
        if (!priceForm.variant) return;
        try {
            setSavingPrice(true);
            await createCustomerPriceList(customer.id, {
                productVariantId: priceForm.variant.id,
                price: Number(priceForm.price),
                currency: priceForm.currency || 'USD',
                effectiveFrom: priceForm.effectiveFrom || null,
                effectiveTo: priceForm.effectiveTo || null,
                notes: priceForm.notes || null,
            });
            setPriceForm(initialPriceForm);
            showAlert('success', 'Customer price list added');
            loadDetail();
        } catch (error) {
            showAlert('error', error.message || 'Failed to add price list');
        } finally {
            setSavingPrice(false);
        }
    };

    const handleDeletePriceList = async (priceListId) => {
        try {
            await deleteCustomerPriceList(customer.id, priceListId);
            showAlert('success', 'Customer price list removed');
            loadDetail();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete price list');
        }
    };

    const handleAdjustCredit = async (event) => {
        event.preventDefault();
        try {
            setSavingCredit(true);
            await adjustCustomerCredit(customer.id, {
                type: creditForm.type,
                amount: Number(creditForm.amount),
                referenceNumber: creditForm.referenceNumber || null,
                notes: creditForm.notes || null,
            });
            setCreditForm(initialCreditForm);
            showAlert('success', 'Customer credit updated');
            onRefresh();
            loadDetail();
        } catch (error) {
            showAlert('error', error.message || 'Failed to adjust credit');
        } finally {
            setSavingCredit(false);
        }
    };

    if (!customer) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer.name} size="xl">
            <div className="space-y-6">
                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{customer.name}</h3>
                            <Badge variant={getCustomerStatusVariant(customer.status)}>{customer.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{customer.contactName || 'No account owner'} • {customer.email || 'No email'} • {customer.phoneNumber || 'No phone'}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{customer.address || 'No billing or delivery address recorded.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => onEdit(customer)}>Edit Customer</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Credit Limit</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(customer.creditLimit)}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Outstanding</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(customer.outstandingBalance)}</div>
                    </Card>
                    <Card>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Available Credit</p>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(customer.availableCredit)}</div>
                    </Card>
                </div>

                <Card title="Customer Price Lists" subtitle="Commercial overrides for specific variants">
                    <form className="mb-5 grid grid-cols-1 gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 lg:grid-cols-6" onSubmit={handleCreatePriceList}>
                        <ProductVariantLookup className="lg:col-span-2" selectedVariant={priceForm.variant} onSelect={(variant) => setPriceForm((current) => ({ ...current, variant }))} />
                        <Input label="Price" type="number" min="0" step="0.01" value={priceForm.price} onChange={(event) => setPriceForm((current) => ({ ...current, price: event.target.value }))} />
                        <Input label="Currency" value={priceForm.currency} onChange={(event) => setPriceForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
                        <Input label="Effective From" type="date" value={priceForm.effectiveFrom} onChange={(event) => setPriceForm((current) => ({ ...current, effectiveFrom: event.target.value }))} />
                        <Input label="Effective To" type="date" value={priceForm.effectiveTo} onChange={(event) => setPriceForm((current) => ({ ...current, effectiveTo: event.target.value }))} />
                        <div className="lg:col-span-6 flex items-end justify-between gap-4">
                            <Input className="flex-1" label="Notes" value={priceForm.notes} onChange={(event) => setPriceForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional commercial guidance" />
                            <Button type="submit" loading={savingPrice} disabled={!priceForm.variant || !priceForm.price}>Add Price</Button>
                        </div>
                    </form>

                    <DataTable
                        loading={loading}
                        emptyMessage="No customer price lists recorded."
                        columns={[
                            { key: 'sku', header: 'Variant' },
                            { key: 'price', header: 'Price', render: (value, row) => formatCurrency(value, row.currency) },
                            { key: 'effectiveFrom', header: 'Effective', render: (value, row) => `${formatDate(value)} to ${formatDate(row.effectiveTo)}` },
                            { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
                            { key: 'actions', header: '', render: (_, row) => <Button size="sm" variant="ghost" onClick={() => handleDeletePriceList(row.id)}>Remove</Button> },
                        ]}
                        data={priceLists}
                    />
                </Card>

                <Card title="Credit Control" subtitle="Register commercial exposure adjustments">
                    <form className="grid grid-cols-1 gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 lg:grid-cols-5" onSubmit={handleAdjustCredit}>
                        <Select label="Type" value={creditForm.type} onChange={(event) => setCreditForm((current) => ({ ...current, type: event.target.value }))} options={CREDIT_TYPES} />
                        <Input label="Amount" type="number" min="0" step="0.01" value={creditForm.amount} onChange={(event) => setCreditForm((current) => ({ ...current, amount: event.target.value }))} />
                        <Input label="Reference" value={creditForm.referenceNumber} onChange={(event) => setCreditForm((current) => ({ ...current, referenceNumber: event.target.value }))} />
                        <Input className="lg:col-span-2" label="Notes" value={creditForm.notes} onChange={(event) => setCreditForm((current) => ({ ...current, notes: event.target.value }))} />
                        <div className="lg:col-span-5 flex justify-end">
                            <Button type="submit" loading={savingCredit} disabled={!creditForm.amount}>Post Credit Entry</Button>
                        </div>
                    </form>

                    <DataTable
                        loading={loading}
                        emptyMessage="No credit transactions available."
                        columns={[
                            { key: 'transactionDate', header: 'Timestamp', render: (value) => formatDateTime(value) },
                            { key: 'type', header: 'Type', render: (value) => <Badge variant={getCreditTransactionVariant(value)}>{value}</Badge> },
                            { key: 'amount', header: 'Amount', render: (value) => formatCurrency(value) },
                            { key: 'balanceAfter', header: 'Balance After', render: (value) => formatCurrency(value) },
                            { key: 'referenceNumber', header: 'Reference', render: (value) => value || '-' },
                        ]}
                        data={creditTransactions}
                    />
                </Card>

                <Card title="Order History" subtitle="Latest orders and current commercial disposition">
                    <DataTable
                        loading={loading}
                        emptyMessage="No orders placed by this customer yet."
                        columns={[
                            { key: 'soNumber', header: 'Sales Order' },
                            { key: 'orderDate', header: 'Order Date', render: (value) => formatDateTime(value) },
                            { key: 'status', header: 'Status', render: (value) => <Badge variant={getSalesOrderStatusVariant(value)}>{value}</Badge> },
                            { key: 'warehouseName', header: 'Warehouse', render: (value) => value || '-' },
                            { key: 'totalAmount', header: 'Value', render: (value, row) => formatCurrency(value, row.currency) },
                        ]}
                        data={orders}
                    />
                </Card>
            </div>
        </Modal>
    );
};

export default CustomerDetailModal;
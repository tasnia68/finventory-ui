import React, { useEffect, useMemo, useState } from 'react';
import {
    getStockTransactions,
    createStockTransaction,
    confirmStockTransaction,
    cancelStockTransaction,
    submitStockTransactionForApproval,
    approveStockTransaction,
    rejectStockTransaction,
    reverseStockTransaction,
} from '../../services/stockTransactionService';
import { getWarehouses } from '../../services/warehouseService';
import { searchStockItems } from '../../services/stockService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, Select } from '../../components/common';

const TRANSACTION_TYPES = [
    { value: 'INBOUND', label: 'Inbound' },
    { value: 'OUTBOUND', label: 'Outbound' },
    { value: 'TRANSFER', label: 'Transfer' },
    { value: 'ADJUSTMENT', label: 'Adjustment' },
];

const TRANSACTION_STATUSES = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REJECTED', label: 'Rejected' },
];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const badgeVariantForStatus = (status) => {
    if (status === 'COMPLETED') return 'success';
    if (status === 'PENDING_APPROVAL') return 'warning';
    if (status === 'CANCELLED' || status === 'REJECTED') return 'danger';
    if (status === 'APPROVED') return 'info';
    return 'default';
};

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ search: '', type: '', status: '' });
    const [itemQuery, setItemQuery] = useState('');
    const [itemResults, setItemResults] = useState([]);
    const [itemLoading, setItemLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'TRANSFER',
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        reference: '',
        notes: '',
        items: [{ productVariantId: '', quantity: '', unitCost: '' }],
    });

    useEffect(() => {
        fetchTransactions();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        let active = true;
        if (!itemQuery || itemQuery.trim().length < 2) {
            setItemResults([]);
            setItemLoading(false);
            return undefined;
        }

        setItemLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const data = await searchStockItems(itemQuery.trim());
                if (active) setItemResults(toList(data));
            } catch (error) {
                if (active) setItemResults([]);
            } finally {
                if (active) setItemLoading(false);
            }
        }, 350);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [itemQuery]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await getStockTransactions();
            setTransactions(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'TRANSFER',
            sourceWarehouseId: '',
            destinationWarehouseId: '',
            reference: '',
            notes: '',
            items: [{ productVariantId: '', quantity: '', unitCost: '' }],
        });
        setItemQuery('');
        setItemResults([]);
    };

    const runAction = async (callback, successMessage, failureMessage) => {
        try {
            await callback();
            showAlert('success', successMessage);
            fetchTransactions();
        } catch (error) {
            showAlert('error', error.message || failureMessage);
        }
    };

    const handleCreate = async (event) => {
        event.preventDefault();

        if (!formData.items.length || formData.items.some((item) => !item.productVariantId)) {
            showAlert('error', 'Each line requires a product variant');
            return;
        }
        if (formData.items.some((item) => Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity)))) {
            showAlert('error', 'Each transaction line requires a positive quantity');
            return;
        }
        if (formData.type === 'TRANSFER' && formData.sourceWarehouseId && formData.sourceWarehouseId === formData.destinationWarehouseId) {
            showAlert('error', 'Source and destination warehouses must be different for transfers');
            return;
        }

        try {
            await createStockTransaction({
                type: formData.type,
                sourceWarehouseId: formData.sourceWarehouseId || null,
                destinationWarehouseId: formData.destinationWarehouseId || null,
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                items: formData.items.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: Number(item.quantity),
                    unitCost: item.unitCost === '' ? null : Number(item.unitCost),
                })),
            });
            showAlert('success', 'Transaction created successfully');
            setShowModal(false);
            resetForm();
            fetchTransactions();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create transaction');
        }
    };

    const handleItemChange = (index, field, value) => {
        setFormData((current) => ({
            ...current,
            items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
        }));
    };

    const handleSelectItem = (variant) => {
        setFormData((current) => ({
            ...current,
            items: current.items.map((item, index) => index === 0 ? { ...item, productVariantId: variant.productVariantId || variant.id } : item),
        }));
        setItemQuery(variant.productVariantSku || variant.sku || variant.productVariantId || variant.id);
        setItemResults([]);
    };

    const addItem = () => {
        setFormData((current) => ({
            ...current,
            items: [...current.items, { productVariantId: '', quantity: '', unitCost: '' }],
        }));
    };

    const removeItem = (index) => {
        setFormData((current) => {
            const items = current.items.filter((_, itemIndex) => itemIndex !== index);
            return {
                ...current,
                items: items.length ? items : [{ productVariantId: '', quantity: '', unitCost: '' }],
            };
        });
    };

    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })), [warehouses]);
    const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const matchesSearch = filters.search
                ? [transaction.transactionNumber, transaction.reference, transaction.notes]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(filters.search.toLowerCase()))
                : true;
            const matchesType = filters.type ? transaction.type === filters.type : true;
            const matchesStatus = filters.status ? transaction.status === filters.status : true;
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [filters, transactions]);

    const summary = useMemo(() => ({
        total: transactions.length,
        pending: transactions.filter((transaction) => transaction.status === 'PENDING_APPROVAL').length,
        completed: transactions.filter((transaction) => transaction.status === 'COMPLETED').length,
        drafts: transactions.filter((transaction) => transaction.status === 'DRAFT').length,
    }), [transactions]);

    const typeRequiresSource = ['OUTBOUND', 'TRANSFER', 'ADJUSTMENT'].includes(formData.type);
    const typeRequiresDestination = ['INBOUND', 'TRANSFER'].includes(formData.type);

    const columns = [
        {
            key: 'transactionNumber',
            header: 'Transaction',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Unnumbered transaction'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.reference || 'No reference supplied'}</div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (value) => <Badge variant="info">{value || 'Unknown'}</Badge>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => <Badge variant={badgeVariantForStatus(value)}>{value || 'Unknown'}</Badge>,
        },
        {
            key: 'sourceWarehouseId',
            header: 'Flow',
            render: (value, row) => (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                    <div>{warehouseNameById.get(value) || value || 'No source'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">to {warehouseNameById.get(row.destinationWarehouseId) || row.destinationWarehouseId || 'No destination'}</div>
                </div>
            ),
        },
        {
            key: 'items',
            header: 'Lines',
            render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{Array.isArray(value) ? value.length : 0}</span>,
        },
        {
            key: 'transactionDate',
            header: 'Date',
            render: (value) => <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(value)}</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {row.status === 'DRAFT' ? <Button variant="secondary" size="sm" onClick={() => runAction(() => submitStockTransactionForApproval(row.id), 'Transaction submitted for approval', 'Failed to submit transaction')}>Submit</Button> : null}
                    {row.status === 'PENDING_APPROVAL' ? <Button variant="secondary" size="sm" onClick={() => runAction(() => approveStockTransaction(row.id), 'Transaction approved', 'Failed to approve transaction')}>Approve</Button> : null}
                    {row.status === 'PENDING_APPROVAL' ? <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => runAction(() => rejectStockTransaction(row.id), 'Transaction rejected', 'Failed to reject transaction')}>Reject</Button> : null}
                    {['DRAFT', 'APPROVED'].includes(row.status) ? <Button size="sm" onClick={() => runAction(() => confirmStockTransaction(row.id), 'Transaction confirmed', 'Failed to confirm transaction')}>Confirm</Button> : null}
                    {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(row.status) ? <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => runAction(() => cancelStockTransaction(row.id), 'Transaction cancelled', 'Failed to cancel transaction')}>Cancel</Button> : null}
                    {row.status === 'COMPLETED' ? <Button variant="secondary" size="sm" onClick={() => runAction(() => reverseStockTransaction(row.id), 'Transaction reversed', 'Failed to reverse transaction')}>Reverse</Button> : null}
                </div>
            ),
            className: 'text-right',
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_40%),radial-gradient(circle_at_75%_20%,_rgba(16,185,129,0.16),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Transaction Control
                                </span>
                                <InfoTip text="This workspace manages the full stock transaction lifecycle from draft through approval, completion, cancellation, and reversal." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Operational stock flows with clear state control.</h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Create inbound, outbound, transfer, and adjustment records with a cleaner review path and explicit state actions.
                            </p>
                        </div>
                        <Button icon="add" onClick={() => setShowModal(true)}>Create Transaction</Button>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Transactions" value={formatNumber(summary.total)} caption="All transactions in the current list" icon="receipt_long" tone="blue" info="This includes all states, including cancelled and rejected records." />
                    <MetricCard title="Pending Approval" value={formatNumber(summary.pending)} caption="Transactions waiting on manager action" icon="pending_actions" tone="amber" info="These records have been submitted and cannot be directly confirmed until approved." />
                    <MetricCard title="Completed" value={formatNumber(summary.completed)} caption="Transactions already posted to stock" icon="task_alt" tone="emerald" info="Completed transactions have already affected inventory and can only be reversed, not cancelled." />
                    <MetricCard title="Drafts" value={formatNumber(summary.drafts)} caption="Transactions still being prepared" icon="draft_orders" tone="violet" info="Drafts are safe to edit or cancel before they enter the approval flow." />
                </div>

                <Card title="Transaction Filters" subtitle="Search by transaction number, reference, or notes" action={<InfoTip text="Filtering keeps the action grid focused when teams are working through approvals or audit checks." />}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Input label="Search" icon="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Transaction number or reference" />
                        <Select label="Type" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} options={TRANSACTION_TYPES} placeholder="All types" />
                        <Select label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={TRANSACTION_STATUSES} placeholder="All statuses" />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ search: '', type: '', status: '' })}>Reset</Button>
                            <Button icon="sync" onClick={fetchTransactions}>Refresh</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden" title="Transaction Register" subtitle="Lifecycle-aware transaction view with operational actions" action={<InfoTip text="Action buttons only appear when the selected state allows the transition, keeping the workflow explicit." />}>
                    <DataTable columns={columns} data={filteredTransactions} loading={loading} emptyMessage="No transactions found. Create one to start the workflow." />
                </Card>
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Create Stock Transaction" size="lg">
                <form className="space-y-5" onSubmit={handleCreate}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span>Workflow setup</span>
                        <InfoTip text="Choose the transaction type first. The form then enforces the source and destination warehouse fields needed by that flow." />
                    </div>

                    <Select label="Transaction type" value={formData.type} onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))} options={TRANSACTION_TYPES} required />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select label="Source warehouse" value={formData.sourceWarehouseId} onChange={(event) => setFormData((current) => ({ ...current, sourceWarehouseId: event.target.value }))} options={warehouseOptions} placeholder={typeRequiresSource ? 'Select source warehouse' : 'Not required for this type'} required={typeRequiresSource} disabled={!typeRequiresSource} />
                        <Select label="Destination warehouse" value={formData.destinationWarehouseId} onChange={(event) => setFormData((current) => ({ ...current, destinationWarehouseId: event.target.value }))} options={warehouseOptions} placeholder={typeRequiresDestination ? 'Select destination warehouse' : 'Not required for this type'} required={typeRequiresDestination} disabled={!typeRequiresDestination} />
                        <Input label="Reference" value={formData.reference} onChange={(event) => setFormData((current) => ({ ...current, reference: event.target.value }))} placeholder="PO, transfer note, count sheet" />
                        <Input label="Notes" value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} placeholder="Operational context for reviewers" />
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <span>Transaction lines</span>
                                <InfoTip text="Use stock search to seed the first line, then add more lines for multi-item transactions." />
                            </div>
                            <Button variant="secondary" size="sm" onClick={addItem} type="button">Add Line</Button>
                        </div>

                        <div className="space-y-2">
                            <Input label="Search stocked SKU" value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search by SKU or keyword" />
                            {itemLoading ? <div className="text-xs text-slate-500 dark:text-slate-400">Searching stocked SKU data...</div> : null}
                            {itemResults.length > 0 ? (
                                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                                    {itemResults.map((item) => (
                                        <button key={item.id || item.productVariantId} type="button" onClick={() => handleSelectItem(item)} className="w-full border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50 last:border-b-0 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{item.productVariantSku || item.sku || item.productVariantId || item.id}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.warehouseName ? `${item.warehouseName} · ` : ''}{item.productVariantId || item.id}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {formData.items.map((item, index) => (
                            <div key={`${item.productVariantId}-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
                                <Input label={index === 0 ? 'Product variant ID' : undefined} value={item.productVariantId} onChange={(event) => handleItemChange(index, 'productVariantId', event.target.value)} placeholder="Paste or select variant ID" required />
                                <Input label={index === 0 ? 'Quantity' : undefined} type="number" min="0" value={item.quantity} onChange={(event) => handleItemChange(index, 'quantity', event.target.value)} placeholder="Positive quantity" required />
                                <Input label={index === 0 ? 'Unit cost' : undefined} type="number" min="0" value={item.unitCost} onChange={(event) => handleItemChange(index, 'unitCost', event.target.value)} placeholder="Optional for inbound costing" />
                                <div className="flex justify-end">
                                    <Button variant="ghost" size="sm" type="button" className="text-red-600 dark:text-red-400" onClick={() => removeItem(index)}>Remove</Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit">Create Transaction</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
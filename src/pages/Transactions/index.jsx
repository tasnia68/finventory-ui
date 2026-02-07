import React, { useEffect, useMemo, useState } from 'react';
import { getStockTransactions, createStockTransaction, confirmStockTransaction, cancelStockTransaction } from '../../services/stockTransactionService';
import { getWarehouses } from '../../services/warehouseService';
import { searchStockItems } from '../../services/stockService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const TRANSACTION_TYPES = [
    { value: 'INBOUND', label: 'INBOUND' },
    { value: 'OUTBOUND', label: 'OUTBOUND' },
    { value: 'TRANSFER', label: 'TRANSFER' },
    { value: 'ADJUSTMENT', label: 'ADJUSTMENT' },
];

const TRANSACTION_STATUSES = [
    { value: 'DRAFT', label: 'DRAFT' },
    { value: 'PENDING_APPROVAL', label: 'PENDING_APPROVAL' },
    { value: 'APPROVED', label: 'APPROVED' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
    { value: 'CONFIRMED', label: 'CONFIRMED' },
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

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        status: '',
    });
    const [itemQuery, setItemQuery] = useState('');
    const [itemResults, setItemResults] = useState([]);
    const [itemLoading, setItemLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'TRANSFER',
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        reference: '',
        notes: '',
        items: [
            { productVariantId: '', quantity: '', unitCost: '' },
        ],
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
        const timer = setTimeout(async () => {
            try {
                const data = await searchStockItems(itemQuery.trim());
                const list = toList(data);
                if (active) setItemResults(list);
            } catch (error) {
                if (active) setItemResults([]);
            } finally {
                if (active) setItemLoading(false);
            }
        }, 400);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [itemQuery]);

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

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
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

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                type: formData.type,
                sourceWarehouseId: formData.sourceWarehouseId || null,
                destinationWarehouseId: formData.destinationWarehouseId || null,
                reference: formData.reference || null,
                notes: formData.notes || null,
                items: formData.items.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: Number(item.quantity),
                    unitCost: item.unitCost === '' ? null : Number(item.unitCost),
                })),
            };
            await createStockTransaction(payload);
            showAlert('success', 'Transaction created successfully');
            setShowModal(false);
            resetForm();
            fetchTransactions();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create transaction');
        }
    };

    const handleConfirm = async (id) => {
        if (!window.confirm('Confirm this transaction?')) return;
        try {
            await confirmStockTransaction(id);
            showAlert('success', 'Transaction confirmed');
            fetchTransactions();
        } catch (error) {
            showAlert('error', error.message || 'Failed to confirm transaction');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this transaction?')) return;
        try {
            await cancelStockTransaction(id);
            showAlert('success', 'Transaction cancelled');
            fetchTransactions();
        } catch (error) {
            showAlert('error', error.message || 'Failed to cancel transaction');
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = formData.items.map((item, idx) =>
            idx === index ? { ...item, [field]: value } : item
        );
        setFormData({ ...formData, items: updatedItems });
    };

    const handleSelectItem = (variant) => {
        const updatedItems = [...formData.items];
        if (!updatedItems.length) {
            updatedItems.push({ productVariantId: '', quantity: '', unitCost: '' });
        }
        updatedItems[0] = {
            ...updatedItems[0],
            productVariantId: variant.productVariantId || variant.id,
        };
        setFormData({ ...formData, items: updatedItems });
        setItemQuery(variant.productVariantSku || variant.sku || variant.productVariantId || variant.id);
        setItemResults([]);
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productVariantId: '', quantity: '', unitCost: '' }],
        });
    };

    const removeItem = (index) => {
        const updatedItems = formData.items.filter((_, idx) => idx !== index);
        setFormData({ ...formData, items: updatedItems.length ? updatedItems : [{ productVariantId: '', quantity: '', unitCost: '' }] });
    };

    const warehouseOptions = useMemo(() => (
        toList(warehouses).map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
        }))
    ), [warehouses]);

    const warehouseNameById = useMemo(() => {
        const map = new Map();
        toList(warehouses).forEach((warehouse) => {
            map.set(warehouse.id, warehouse.name);
        });
        return map;
    }, [warehouses]);

    const filteredTransactions = useMemo(() => {
        return toList(transactions).filter((tx) => {
            const searchMatch = filters.search
                ? [tx.transactionNumber, tx.reference]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(filters.search.toLowerCase()))
                : true;
            const typeMatch = filters.type ? tx.type === filters.type : true;
            const statusMatch = filters.status ? tx.status === filters.status : true;
            return searchMatch && typeMatch && statusMatch;
        });
    }, [transactions, filters]);

    const typeRequiresSource = ['OUTBOUND', 'TRANSFER', 'ADJUSTMENT'].includes(formData.type);
    const typeRequiresDestination = ['INBOUND', 'TRANSFER'].includes(formData.type);

    const columns = [
        {
            key: 'transactionNumber',
            header: 'Transaction',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || '—'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.reference || 'No reference'}</div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (value) => (
                <Badge variant="info">{value || '—'}</Badge>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => {
                const variant = value === 'COMPLETED' || value === 'CONFIRMED'
                    ? 'success'
                    : value === 'CANCELLED'
                        ? 'danger'
                        : value === 'PENDING_APPROVAL'
                            ? 'warning'
                            : 'default';
                return (
                    <Badge variant={variant}>{value || '—'}</Badge>
                );
            },
        },
        {
            key: 'sourceWarehouseId',
            header: 'Source',
            render: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                    {warehouseNameById.get(value) || value || '—'}
                </span>
            ),
        },
        {
            key: 'destinationWarehouseId',
            header: 'Destination',
            render: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                    {warehouseNameById.get(value) || value || '—'}
                </span>
            ),
        },
        {
            key: 'transactionDate',
            header: 'Date',
            render: (value) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(value)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(row.status) && (
                        <button
                            onClick={() => handleConfirm(row.id)}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:text-mint-600 dark:hover:text-mint-400 transition-colors"
                            title="Confirm"
                        >
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </button>
                    )}
                    {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(row.status) && (
                        <button
                            onClick={() => handleCancel(row.id)}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                            title="Cancel"
                        >
                            <span className="material-symbols-outlined text-[20px]">cancel</span>
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Stock Transactions
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage inbound, outbound, and transfer workflows
                        </p>
                    </div>
                    <Button icon="add" onClick={() => setShowModal(true)}>
                        Create Transaction
                    </Button>
                </div>

                {alert && (
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onDismiss={() => setAlert(null)}
                    />
                )}

                <Card title="Filters" subtitle="Search by transaction number or reference">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            label="Search"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="TXN-0001 or reference"
                        />
                        <Select
                            label="Type"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            options={TRANSACTION_TYPES}
                            placeholder="All types"
                        />
                        <Select
                            label="Status"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            options={TRANSACTION_STATUSES}
                            placeholder="All statuses"
                        />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ search: '', type: '', status: '' })}>
                                Reset
                            </Button>
                            <Button onClick={fetchTransactions}>Refresh</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={filteredTransactions}
                        loading={loading}
                        emptyMessage="No transactions found. Create one to get started."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title="Create Stock Transaction"
                size="lg"
            >
                <form className="space-y-4" onSubmit={handleCreate}>
                    <Select
                        label="Transaction Type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        options={TRANSACTION_TYPES}
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Source Warehouse"
                            value={formData.sourceWarehouseId}
                            onChange={(e) => setFormData({ ...formData, sourceWarehouseId: e.target.value })}
                            options={warehouseOptions}
                            placeholder={typeRequiresSource ? 'Select source' : 'Not required'}
                            required={typeRequiresSource}
                            disabled={!typeRequiresSource}
                        />
                        <Select
                            label="Destination Warehouse"
                            value={formData.destinationWarehouseId}
                            onChange={(e) => setFormData({ ...formData, destinationWarehouseId: e.target.value })}
                            options={warehouseOptions}
                            placeholder={typeRequiresDestination ? 'Select destination' : 'Not required'}
                            required={typeRequiresDestination}
                            disabled={!typeRequiresDestination}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Reference"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            placeholder="TR-001"
                        />
                        <Input
                            label="Notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optional notes"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Items</h3>
                            <Button variant="secondary" size="sm" onClick={addItem} type="button">
                                Add Item
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Input
                                label="Search Product Stock"
                                value={itemQuery}
                                onChange={(e) => setItemQuery(e.target.value)}
                                placeholder="Search by SKU or keyword"
                            />
                            {itemLoading && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">Searching…</div>
                            )}
                            {itemResults.length > 0 && (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {itemResults.map((item) => (
                                        <button
                                            type="button"
                                            key={item.id || item.productVariantId}
                                            onClick={() => handleSelectItem(item)}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                {item.productVariantSku || item.sku || item.productVariantId || item.id}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {item.warehouseName ? `${item.warehouseName} · ` : ''}{item.productVariantId || item.id}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {formData.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <Input
                                    label={index === 0 ? 'Product Variant ID' : undefined}
                                    value={item.productVariantId}
                                    onChange={(e) => handleItemChange(index, 'productVariantId', e.target.value)}
                                    placeholder="Variant ID"
                                    required
                                />
                                <Input
                                    label={index === 0 ? 'Quantity' : undefined}
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    placeholder="0"
                                    required
                                />
                                <Input
                                    label={index === 0 ? 'Unit Cost' : undefined}
                                    type="number"
                                    value={item.unitCost}
                                    onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                                    placeholder="Optional"
                                />
                                <div className="flex justify-end">
                                    <Button variant="ghost" size="sm" type="button" onClick={() => removeItem(index)}>
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Create Transaction</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
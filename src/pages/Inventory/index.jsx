import React, { useEffect, useMemo, useState } from 'react';
import { getStockLevels, getStockMovements, adjustStock } from '../../services/stockService';
import { getWarehouses } from '../../services/warehouseService';
import { searchProductVariants } from '../../services/productService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const ADJUSTMENT_TYPES = [
    { value: 'IN', label: 'IN' },
    { value: 'OUT', label: 'OUT' },
    { value: 'ADJUSTMENT', label: 'ADJUSTMENT' },
    { value: 'TRANSFER_IN', label: 'TRANSFER_IN' },
    { value: 'TRANSFER_OUT', label: 'TRANSFER_OUT' },
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

const Inventory = () => {
    const [stocks, setStocks] = useState([]);
    const [movements, setMovements] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMovements, setLoadingMovements] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [variantQuery, setVariantQuery] = useState('');
    const [variantResults, setVariantResults] = useState([]);
    const [variantLoading, setVariantLoading] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [filters, setFilters] = useState({
        warehouseId: '',
        productVariantId: '',
    });
    const [adjustment, setAdjustment] = useState({
        productVariantId: '',
        warehouseId: '',
        quantity: '',
        unitCost: '',
        type: 'IN',
        reason: '',
        referenceId: '',
    });

    useEffect(() => {
        fetchWarehouses();
        fetchStockLevels();
        fetchMovements();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const fetchStockLevels = async (overrideFilters) => {
        try {
            setLoading(true);
            const params = overrideFilters || filters;
            const data = await getStockLevels(params);
            setStocks(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load stock levels');
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async (overrideFilters) => {
        try {
            setLoadingMovements(true);
            const params = overrideFilters || filters;
            const data = await getStockMovements(params);
            setMovements(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load stock movements');
        } finally {
            setLoadingMovements(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleApplyFilters = () => {
        fetchStockLevels(filters);
        fetchMovements(filters);
    };

    const handleResetFilters = () => {
        const cleared = { warehouseId: '', productVariantId: '' };
        setFilters(cleared);
        fetchStockLevels(cleared);
        fetchMovements(cleared);
    };

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...adjustment,
                quantity: Number(adjustment.quantity),
                unitCost: adjustment.unitCost === '' ? null : Number(adjustment.unitCost),
            };
            await adjustStock(payload);
            showAlert('success', 'Stock adjusted successfully');
            setShowAdjustModal(false);
            resetAdjustmentForm();
            fetchStockLevels();
            fetchMovements();
        } catch (error) {
            showAlert('error', error.message || 'Failed to adjust stock');
        }
    };

    const resetAdjustmentForm = () => {
        setAdjustment({
            productVariantId: '',
            warehouseId: '',
            quantity: '',
            unitCost: '',
            type: 'IN',
            reason: '',
            referenceId: '',
        });
        setVariantQuery('');
        setVariantResults([]);
        setSelectedVariant(null);
    };

    useEffect(() => {
        let active = true;
        if (!variantQuery || variantQuery.trim().length < 2) {
            setVariantResults([]);
            setVariantLoading(false);
            return undefined;
        }

        setVariantLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await searchProductVariants(variantQuery.trim());
                const list = toList(data);
                if (active) setVariantResults(list);
            } catch (error) {
                if (active) setVariantResults([]);
            } finally {
                if (active) setVariantLoading(false);
            }
        }, 400);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [variantQuery]);

    const handleSelectVariant = (variant) => {
        setSelectedVariant(variant);
        setAdjustment({
            ...adjustment,
            productVariantId: variant.id,
        });
        setVariantQuery(variant.sku || variant.id);
        setVariantResults([]);
    };

    const warehouseOptions = useMemo(() => (
        toList(warehouses).map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
        }))
    ), [warehouses]);

    const stockColumns = [
        {
            key: 'productVariantSku',
            header: 'SKU',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || '—'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.productVariantId}</div>
                </div>
            ),
        },
        {
            key: 'warehouseName',
            header: 'Warehouse',
            render: (value, row) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{value || '—'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.warehouseId}</div>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Quantity',
            render: (value) => (
                <span className="font-semibold text-slate-900 dark:text-white">{value ?? 0}</span>
            ),
        },
        {
            key: 'createdAt',
            header: 'Updated',
            render: (value) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(value)}</span>
            ),
        },
    ];

    const movementColumns = [
        {
            key: 'productVariantSku',
            header: 'SKU',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || '—'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.productVariantId || '—'}</div>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Quantity',
            render: (value) => (
                <span className="font-semibold text-slate-900 dark:text-white">{value ?? 0}</span>
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
            key: 'createdAt',
            header: 'Time',
            render: (value) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(value)}</span>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Stock Levels
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Track on-hand inventory across warehouses
                        </p>
                    </div>
                    <Button icon="tune" onClick={() => setShowAdjustModal(true)}>
                        Adjust Stock
                    </Button>
                </div>

                {alert && (
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onDismiss={() => setAlert(null)}
                    />
                )}

                <Card title="Filters" subtitle="Filter by warehouse or product variant">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Warehouse"
                            value={filters.warehouseId}
                            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                            options={warehouseOptions}
                            placeholder="All warehouses"
                        />
                        <Input
                            label="Product Variant ID"
                            value={filters.productVariantId}
                            onChange={(e) => setFilters({ ...filters, productVariantId: e.target.value })}
                            placeholder="Paste variant ID"
                        />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={handleResetFilters}>
                                Reset
                            </Button>
                            <Button onClick={handleApplyFilters}>
                                Apply
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden" title="Stock Levels">
                    <DataTable
                        columns={stockColumns}
                        data={stocks}
                        loading={loading}
                        emptyMessage="No stock levels found. Adjust stock to create initial quantities."
                    />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Recent Movements" subtitle="Audit trail for stock adjustments">
                    <DataTable
                        columns={movementColumns}
                        data={movements}
                        loading={loadingMovements}
                        emptyMessage="No stock movements yet."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showAdjustModal}
                onClose={() => {
                    setShowAdjustModal(false);
                    resetAdjustmentForm();
                }}
                title="Adjust Stock"
            >
                <form className="space-y-4" onSubmit={handleAdjustSubmit}>
                    <div className="space-y-2">
                        <Input
                            label="Product Variant"
                            value={variantQuery}
                            onChange={(e) => {
                                setVariantQuery(e.target.value);
                                setSelectedVariant(null);
                                if (!e.target.value) {
                                    setAdjustment({ ...adjustment, productVariantId: '' });
                                }
                            }}
                            placeholder="Search by SKU or keyword"
                            required
                        />
                        {selectedVariant && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Selected ID: {selectedVariant.id}
                            </div>
                        )}
                        {variantLoading && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">Searching…</div>
                        )}
                        {variantResults.length > 0 && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                {variantResults.map((variant) => (
                                    <button
                                        type="button"
                                        key={variant.id}
                                        onClick={() => handleSelectVariant(variant)}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                                            {variant.sku || variant.id}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {variant.id}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <Select
                        label="Warehouse"
                        value={adjustment.warehouseId}
                        onChange={(e) => setAdjustment({ ...adjustment, warehouseId: e.target.value })}
                        options={warehouseOptions}
                        placeholder="Select warehouse"
                        required
                    />
                    <Select
                        label="Adjustment Type"
                        value={adjustment.type}
                        onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                        options={ADJUSTMENT_TYPES}
                        required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Quantity"
                            type="number"
                            value={adjustment.quantity}
                            onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
                            placeholder="0"
                            required
                        />
                        <Input
                            label="Unit Cost"
                            type="number"
                            value={adjustment.unitCost}
                            onChange={(e) => setAdjustment({ ...adjustment, unitCost: e.target.value })}
                            placeholder="Optional"
                        />
                    </div>
                    <Input
                        label="Reason"
                        value={adjustment.reason}
                        onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                        placeholder="e.g., Initial stock"
                    />
                    <Input
                        label="Reference ID"
                        value={adjustment.referenceId}
                        onChange={(e) => setAdjustment({ ...adjustment, referenceId: e.target.value })}
                        placeholder="e.g., PO-123"
                    />
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                                setShowAdjustModal(false);
                                resetAdjustmentForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">Submit Adjustment</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Inventory;
import React, { useEffect, useMemo, useState } from 'react';
import { getStockLevels, getStockMovements, adjustStock } from '../../services/stockService';
import { getWarehouses } from '../../services/warehouseService';
import { searchProductVariants } from '../../services/productService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, Select } from '../../components/common';

const ADJUSTMENT_TYPES = [
    { value: 'IN', label: 'Inbound' },
    { value: 'OUT', label: 'Outbound' },
    { value: 'ADJUSTMENT', label: 'Adjustment' },
    { value: 'TRANSFER_IN', label: 'Transfer In' },
    { value: 'TRANSFER_OUT', label: 'Transfer Out' },
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

const Inventory = () => {
    const [stocks, setStocks] = useState([]);
    const [movements, setMovements] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingStocks, setLoadingStocks] = useState(true);
    const [loadingMovements, setLoadingMovements] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [variantQuery, setVariantQuery] = useState('');
    const [variantResults, setVariantResults] = useState([]);
    const [variantLoading, setVariantLoading] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [filters, setFilters] = useState({ warehouseId: '', productVariantId: '' });
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

    useEffect(() => {
        let active = true;
        if (!variantQuery || variantQuery.trim().length < 2) {
            setVariantResults([]);
            setVariantLoading(false);
            return undefined;
        }

        setVariantLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const data = await searchProductVariants(variantQuery.trim());
                if (active) setVariantResults(toList(data));
            } catch (error) {
                if (active) setVariantResults([]);
            } finally {
                if (active) setVariantLoading(false);
            }
        }, 350);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [variantQuery]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

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
            setLoadingStocks(true);
            const data = await getStockLevels(overrideFilters || filters);
            setStocks(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load stock levels');
        } finally {
            setLoadingStocks(false);
        }
    };

    const fetchMovements = async (overrideFilters) => {
        try {
            setLoadingMovements(true);
            const data = await getStockMovements(overrideFilters || filters);
            setMovements(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load stock movements');
        } finally {
            setLoadingMovements(false);
        }
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

    const handleSelectVariant = (variant) => {
        setSelectedVariant(variant);
        setAdjustment((current) => ({ ...current, productVariantId: variant.id }));
        setVariantQuery(variant.sku || variant.id);
        setVariantResults([]);
    };

    const handleAdjustSubmit = async (event) => {
        event.preventDefault();

        const quantity = Number(adjustment.quantity);
        const unitCost = adjustment.unitCost === '' ? null : Number(adjustment.unitCost);

        if (!adjustment.productVariantId) {
            showAlert('error', 'Select a product variant before adjusting stock');
            return;
        }
        if (!adjustment.warehouseId) {
            showAlert('error', 'Select a warehouse before adjusting stock');
            return;
        }
        if (Number.isNaN(quantity) || quantity === 0) {
            showAlert('error', 'Quantity must be a non-zero number');
            return;
        }
        if (['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT'].includes(adjustment.type) && quantity < 0) {
            showAlert('error', 'This movement type expects a positive quantity');
            return;
        }
        if (unitCost !== null && (Number.isNaN(unitCost) || unitCost < 0)) {
            showAlert('error', 'Unit cost must be zero or greater');
            return;
        }

        try {
            await adjustStock({
                ...adjustment,
                quantity,
                unitCost,
                reason: adjustment.reason.trim() || null,
                referenceId: adjustment.referenceId.trim() || null,
            });
            showAlert('success', 'Stock adjusted successfully');
            setShowAdjustModal(false);
            resetAdjustmentForm();
            fetchStockLevels();
            fetchMovements();
        } catch (error) {
            showAlert('error', error.message || 'Failed to adjust stock');
        }
    };

    const warehouseOptions = useMemo(() => (
        warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))
    ), [warehouses]);

    const summary = useMemo(() => {
        const skuLines = stocks.length;
        const onHand = stocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
        const lowStockLines = stocks.filter((stock) => Number(stock.quantity || 0) <= 5).length;
        const outboundCount = movements.filter((movement) => ['OUT', 'TRANSFER_OUT'].includes(movement.type)).length;
        return { skuLines, onHand, lowStockLines, outboundCount };
    }, [movements, stocks]);

    const stockColumns = [
        {
            key: 'productVariantSku',
            header: 'SKU',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Unknown SKU'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.productVariantId}</div>
                </div>
            ),
        },
        {
            key: 'warehouseName',
            header: 'Warehouse',
            render: (value, row) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{value || 'Unknown warehouse'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.storageLocationName || 'No storage location recorded'}</div>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'On Hand',
            render: (value) => {
                const number = Number(value || 0);
                return <Badge variant={number <= 5 ? 'warning' : 'success'}>{formatNumber(number)}</Badge>;
            },
        },
        {
            key: 'batchNumber',
            header: 'Batch',
            render: (value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value || 'Not batch tracked'}</span>,
        },
        {
            key: 'updatedAt',
            header: 'Updated',
            render: (value, row) => <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(value || row.createdAt)}</span>,
        },
    ];

    const movementColumns = [
        {
            key: 'productVariantSku',
            header: 'Movement',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Unknown SKU'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.reason || 'No reason supplied'}</div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (value) => <Badge variant="info">{value || 'Unknown'}</Badge>,
        },
        {
            key: 'quantity',
            header: 'Quantity',
            render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span>,
        },
        {
            key: 'unitCost',
            header: 'Unit Cost',
            render: (value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value ?? '-'}</span>,
        },
        {
            key: 'createdAt',
            header: 'Logged',
            render: (value) => <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(value)}</span>,
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_40%),radial-gradient(circle_at_70%_20%,_rgba(245,158,11,0.16),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Stock Control
                                </span>
                                <InfoTip text="This workspace combines current on-hand stock with recent movement activity so operators can act without switching between multiple screens." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Live inventory position across your warehouse network.</h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Filter stock lines, review movement history, and post controlled adjustments from one operational workspace.
                            </p>
                        </div>
                        <Button icon="tune" onClick={() => setShowAdjustModal(true)}>Adjust Stock</Button>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="SKU Lines" value={formatNumber(summary.skuLines)} caption="Distinct stock rows in the current view" icon="dataset" tone="blue" info="Each row reflects a product, warehouse, and optional location or batch combination." />
                    <MetricCard title="On-Hand Units" value={formatNumber(summary.onHand)} caption="Total quantity visible in the current stock view" icon="inventory_2" tone="emerald" info="This is a direct sum of the loaded stock rows." />
                    <MetricCard title="Low Stock Lines" value={formatNumber(summary.lowStockLines)} caption="Rows at or below five units" icon="warning" tone="amber" info="This threshold is visual guidance only and not the replenishment rule engine." />
                    <MetricCard title="Outbound Movements" value={formatNumber(summary.outboundCount)} caption="Recent outbound or transfer-out records in the current log" icon="outbound" tone="rose" info="Useful for spotting active depletion before replenishment decisions are made." />
                </div>

                <Card title="Inventory Filters" subtitle="Narrow both stock and movement views together" action={<InfoTip text="Applying filters updates both the stock table and movement log to keep investigation context aligned." />}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Select label="Warehouse" value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder="All warehouses" />
                        <Input label="Product Variant ID" value={filters.productVariantId} onChange={(event) => setFilters((current) => ({ ...current, productVariantId: event.target.value }))} placeholder="Paste an exact variant ID" />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={handleResetFilters}>Reset</Button>
                            <Button onClick={handleApplyFilters}>Apply</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden" title="Current Stock Position" subtitle="On-hand quantities by SKU and warehouse" action={<InfoTip text="Low quantities are highlighted so operators can spot pressure points quickly." />}>
                    <DataTable columns={stockColumns} data={stocks} loading={loadingStocks} emptyMessage="No stock levels found. Post an adjustment to create initial inventory." />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Movement Log" subtitle="Recent stock activity for the same scope" action={<InfoTip text="Use the movement log to verify the operational story behind current stock balances." />}>
                    <DataTable columns={movementColumns} data={movements} loading={loadingMovements} emptyMessage="No stock movements recorded for this scope." />
                </Card>
            </div>

            <Modal isOpen={showAdjustModal} onClose={() => { setShowAdjustModal(false); resetAdjustmentForm(); }} title="Post Stock Adjustment">
                <form className="space-y-5" onSubmit={handleAdjustSubmit}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span>Movement context</span>
                        <InfoTip text="Search for the exact product variant first, then select the warehouse and movement type before posting quantity and cost details." />
                    </div>

                    <div className="space-y-2">
                        <Input
                            label="Product variant"
                            value={variantQuery}
                            onChange={(event) => {
                                setVariantQuery(event.target.value);
                                setSelectedVariant(null);
                                if (!event.target.value) {
                                    setAdjustment((current) => ({ ...current, productVariantId: '' }));
                                }
                            }}
                            placeholder="Search by SKU or keyword"
                            required
                        />
                        {selectedVariant ? <div className="text-xs text-slate-500 dark:text-slate-400">Selected variant: {selectedVariant.id}</div> : null}
                        {variantLoading ? <div className="text-xs text-slate-500 dark:text-slate-400">Searching variants...</div> : null}
                        {variantResults.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                {variantResults.map((variant) => (
                                    <button key={variant.id} type="button" onClick={() => handleSelectVariant(variant)} className="w-full border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50 last:border-b-0 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                        <div className="text-sm font-medium text-slate-900 dark:text-white">{variant.sku || variant.id}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{variant.id}</div>
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select label="Warehouse" value={adjustment.warehouseId} onChange={(event) => setAdjustment((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder="Select warehouse" required />
                        <Select label="Movement type" value={adjustment.type} onChange={(event) => setAdjustment((current) => ({ ...current, type: event.target.value }))} options={ADJUSTMENT_TYPES} required />
                        <Input label="Quantity" type="number" value={adjustment.quantity} onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))} placeholder="Use negative only for net adjustments" required />
                        <Input label="Unit cost" type="number" min="0" value={adjustment.unitCost} onChange={(event) => setAdjustment((current) => ({ ...current, unitCost: event.target.value }))} placeholder="Optional unless costing is known" />
                        <Input label="Reason" value={adjustment.reason} onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))} placeholder="Cycle count variance, receipt, damage, etc." />
                        <Input label="Reference" value={adjustment.referenceId} onChange={(event) => setAdjustment((current) => ({ ...current, referenceId: event.target.value }))} placeholder="PO, count sheet, incident number" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
                        <Button type="submit">Post Adjustment</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Inventory;
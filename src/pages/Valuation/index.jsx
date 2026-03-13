import React, { useEffect, useMemo, useState } from 'react';
import { getInventoryValuationReport } from '../../services/inventoryValuationService';
import { getWarehouses } from '../../services/warehouseService';
import { Alert, Button, Card, DataTable, InfoTip, MetricCard, Select } from '../../components/common';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatCurrency = (value, currency = 'USD') => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 2,
    }).format(amount);
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const Valuation = () => {
    const [rows, setRows] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseId, setWarehouseId] = useState('');
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetchWarehouses();
        fetchValuation();
    }, []);

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

    const fetchValuation = async (selectedWarehouseId = warehouseId) => {
        try {
            setLoading(true);
            const data = await getInventoryValuationReport({ warehouseId: selectedWarehouseId || undefined });
            setRows(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load valuation report');
        } finally {
            setLoading(false);
        }
    };

    const warehouseOptions = useMemo(() => (
        toList(warehouses).map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))
    ), [warehouses]);

    const summary = useMemo(() => {
        const totalLines = rows.length;
        const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const totalValue = rows.reduce((sum, row) => sum + Number(row.totalValue || 0), 0);
        const currency = rows.find((row) => row.currency)?.currency || 'USD';
        const highestValueRow = [...rows].sort((left, right) => Number(right.totalValue || 0) - Number(left.totalValue || 0))[0];
        return { totalLines, totalQuantity, totalValue, currency, highestValueRow };
    }, [rows]);

    const columns = [
        {
            key: 'productName',
            header: 'Item',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Unnamed item'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.productVariantSku || row.productVariantId}</div>
                </div>
            ),
        },
        {
            key: 'warehouseName',
            header: 'Warehouse',
            render: (value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value || 'All warehouses'}</span>,
        },
        {
            key: 'quantity',
            header: 'Quantity',
            render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span>,
        },
        {
            key: 'unitCost',
            header: 'Unit Cost',
            render: (value, row) => <span className="text-sm text-slate-600 dark:text-slate-300">{formatCurrency(value, row.currency)}</span>,
        },
        {
            key: 'totalValue',
            header: 'Total Value',
            render: (value, row) => <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(value, row.currency)}</span>,
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(19,91,236,0.14),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.14),_transparent_35%)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Inventory Valuation
                                </span>
                                <InfoTip text="Valuation rolls up current inventory position by warehouse and SKU using the backend valuation method." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Cost visibility for every stocked SKU.
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Review on-hand quantity, unit cost, and total inventory value in one place before replenishment, transfer, or month-end reporting.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <Select
                                label="Warehouse scope"
                                value={warehouseId}
                                onChange={(event) => setWarehouseId(event.target.value)}
                                options={warehouseOptions}
                                placeholder="All warehouses"
                                className="min-w-[260px]"
                            />
                            <Button icon="sync" onClick={() => fetchValuation(warehouseId)}>Refresh</Button>
                        </div>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Valuation Lines" value={formatNumber(summary.totalLines)} caption="Distinct SKU and warehouse combinations in scope" icon="dataset" tone="blue" info="Each line represents one product variant in one warehouse." />
                    <MetricCard title="On-Hand Quantity" value={formatNumber(summary.totalQuantity)} caption="Current physical units represented in the report" icon="inventory_2" tone="emerald" info="This is summed directly from the valuation report payload." />
                    <MetricCard title="Inventory Value" value={formatCurrency(summary.totalValue, summary.currency)} caption="Estimated carrying value at the current valuation method" icon="payments" tone="amber" info="Currency comes from the backend valuation report." />
                    <MetricCard title="Highest Value Line" value={summary.highestValueRow ? summary.highestValueRow.productVariantSku || summary.highestValueRow.productName : 'None'} caption={summary.highestValueRow ? formatCurrency(summary.highestValueRow.totalValue, summary.highestValueRow.currency) : 'No valuation data available'} icon="monitoring" tone="violet" info="Useful for spotting concentration risk in a single SKU or warehouse." />
                </div>

                <Card padding="none" className="overflow-hidden" title="Valuation Register" subtitle="Operational snapshot for finance, replenishment, and inventory control" action={<InfoTip text="Use this table to review current carrying value by SKU and warehouse before closing transactions or approving replenishment." />}>
                    <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No valuation lines available for the selected warehouse scope." />
                </Card>
            </div>
        </div>
    );
};

export default Valuation;
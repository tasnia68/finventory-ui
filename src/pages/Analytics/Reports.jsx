import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Select } from '../../components/common';
import { getWarehouses } from '../../services/warehouseService';
import {
    exportGeneratedReport,
    getAgingAnalysisReport,
    getCurrentStockReport,
    getPurchaseOrderReport,
    getSalesOrderReport,
    getSupplierPerformanceReport,
    getStockMovementReport,
} from '../../services/reportingService';
import {
    downloadBlob,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    getReportDescription,
    getReportLabel,
    toHeadline,
    toList,
} from './utils';

const REPORT_OPTIONS = [
    { value: 'CURRENT_STOCK', label: 'Current Stock' },
    { value: 'STOCK_MOVEMENT', label: 'Stock Movements' },
    { value: 'AGING_ANALYSIS', label: 'Aging Analysis' },
    { value: 'PURCHASE_ORDER', label: 'Purchase Orders' },
    { value: 'SALES_ORDER', label: 'Sales Orders' },
    { value: 'SUPPLIER_PERFORMANCE', label: 'Supplier Performance' },
];

const buildReportColumns = (reportType) => {
    switch (reportType) {
        case 'CURRENT_STOCK':
            return [
                {
                    key: 'productName',
                    header: 'Product',
                    render: (value, row) => (
                        <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.sku}</div>
                        </div>
                    ),
                },
                { key: 'warehouseName', header: 'Warehouse' },
                { key: 'onHandQuantity', header: 'On-Hand', render: (value) => formatNumber(value) },
                { key: 'availableQuantity', header: 'Available', render: (value) => formatNumber(value) },
                { key: 'unitCost', header: 'Unit Cost', render: (value, row) => formatCurrency(value, row.currency) },
                { key: 'totalValue', header: 'Total Value', render: (value, row) => formatCurrency(value, row.currency) },
            ];
        case 'STOCK_MOVEMENT':
            return [
                { key: 'movementDate', header: 'Movement Date', render: (value) => formatDateTime(value) },
                {
                    key: 'productName',
                    header: 'Product',
                    render: (value, row) => (
                        <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.sku}</div>
                        </div>
                    ),
                },
                { key: 'warehouseName', header: 'Warehouse' },
                { key: 'type', header: 'Type', render: (value) => <Badge variant="info">{toHeadline(value)}</Badge> },
                { key: 'quantity', header: 'Quantity', render: (value) => formatNumber(value) },
                { key: 'totalCost', header: 'Total Cost', render: (value) => formatCurrency(value) },
            ];
        case 'AGING_ANALYSIS':
            return [
                {
                    key: 'productName',
                    header: 'Product',
                    render: (value, row) => (
                        <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.sku}</div>
                        </div>
                    ),
                },
                { key: 'warehouseName', header: 'Warehouse' },
                { key: 'onHandQuantity', header: 'On-Hand', render: (value) => formatNumber(value) },
                { key: 'daysSinceLastMovement', header: 'Days Idle', render: (value) => formatNumber(value) },
                { key: 'movementClass', header: 'Class', render: (value) => <Badge variant="warning">{value}</Badge> },
                { key: 'totalValue', header: 'Value', render: (value) => formatCurrency(value) },
            ];
        case 'PURCHASE_ORDER':
            return [
                { key: 'poNumber', header: 'PO Number' },
                { key: 'supplierName', header: 'Supplier' },
                { key: 'orderDate', header: 'Order Date', render: (value) => formatDateTime(value) },
                { key: 'expectedDeliveryDate', header: 'Expected Delivery', render: (value) => formatDate(value) },
                { key: 'status', header: 'Status', render: (value) => <Badge variant="info">{toHeadline(value)}</Badge> },
                { key: 'completionRate', header: 'Completion', render: (value) => `${formatNumber(value)}%` },
                { key: 'totalAmount', header: 'Total Amount', render: (value, row) => formatCurrency(value, row.currency) },
            ];
        case 'SALES_ORDER':
            return [
                { key: 'soNumber', header: 'SO Number' },
                { key: 'customerName', header: 'Customer' },
                { key: 'warehouseName', header: 'Warehouse' },
                { key: 'orderDate', header: 'Order Date', render: (value) => formatDateTime(value) },
                { key: 'status', header: 'Status', render: (value) => <Badge variant="info">{toHeadline(value)}</Badge> },
                { key: 'fulfillmentRate', header: 'Fulfillment', render: (value) => `${formatNumber(value)}%` },
                { key: 'totalAmount', header: 'Total Amount', render: (value, row) => formatCurrency(value, row.currency) },
            ];
        case 'SUPPLIER_PERFORMANCE':
            return [
                { key: 'supplierName', header: 'Supplier' },
                { key: 'supplierRating', header: 'Rating', render: (value) => formatNumber(value) },
                { key: 'purchaseOrderCount', header: 'PO Count', render: (value) => formatNumber(value) },
                { key: 'totalSpend', header: 'Spend', render: (value) => formatCurrency(value) },
                { key: 'fulfillmentRate', header: 'Fulfillment', render: (value) => `${formatNumber(value)}%` },
                { key: 'onTimeDeliveryRate', header: 'On-Time', render: (value) => `${formatNumber(value)}%` },
                { key: 'averageLeadTimeDays', header: 'Lead Time', render: (value) => `${formatNumber(value)} days` },
            ];
        default:
            return [];
    }
};

const Reports = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [rows, setRows] = useState([]);
    const [filters, setFilters] = useState({
        reportType: 'CURRENT_STOCK',
        warehouseId: '',
        fromDate: '',
        toDate: '',
        slowMovingThresholdDays: '30',
    });
    const [loading, setLoading] = useState(true);
    const [exportingFormat, setExportingFormat] = useState('');
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadWarehouses();
    }, []);

    useEffect(() => {
        loadReport();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadWarehouses = async () => {
        try {
            setWarehouses(toList(await getWarehouses()));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const buildPayload = (currentFilters = filters) => ({
        reportType: currentFilters.reportType,
        warehouseId: currentFilters.warehouseId || undefined,
        fromDate: currentFilters.fromDate || undefined,
        toDate: currentFilters.toDate || undefined,
        slowMovingThresholdDays: currentFilters.reportType === 'AGING_ANALYSIS'
            ? Number(currentFilters.slowMovingThresholdDays || 30)
            : undefined,
    });

    const loadReport = async (currentFilters = filters) => {
        try {
            setLoading(true);
            const payload = buildPayload(currentFilters);
            let response = [];

            switch (payload.reportType) {
                case 'CURRENT_STOCK':
                    response = await getCurrentStockReport({ warehouseId: payload.warehouseId });
                    break;
                case 'STOCK_MOVEMENT':
                    response = await getStockMovementReport(payload);
                    break;
                case 'AGING_ANALYSIS':
                    response = await getAgingAnalysisReport({
                        warehouseId: payload.warehouseId,
                        slowMovingThresholdDays: payload.slowMovingThresholdDays,
                    });
                    break;
                case 'PURCHASE_ORDER':
                    response = await getPurchaseOrderReport({
                        fromDate: payload.fromDate,
                        toDate: payload.toDate,
                    });
                    break;
                case 'SALES_ORDER':
                    response = await getSalesOrderReport({
                        warehouseId: payload.warehouseId,
                        fromDate: payload.fromDate,
                        toDate: payload.toDate,
                    });
                    break;
                case 'SUPPLIER_PERFORMANCE':
                    response = await getSupplierPerformanceReport({
                        fromDate: payload.fromDate,
                        toDate: payload.toDate,
                    });
                    break;
                default:
                    response = [];
            }

            setRows(toList(response));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            setExportingFormat(format);
            const { blob, filename } = await exportGeneratedReport({
                ...buildPayload(),
                format,
            });
            downloadBlob(blob, filename);
        } catch (error) {
            showAlert('error', error.message || 'Failed to export report');
        } finally {
            setExportingFormat('');
        }
    };

    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    })), [warehouses]);

    const columns = useMemo(() => buildReportColumns(filters.reportType), [filters.reportType]);

    const metrics = useMemo(() => {
        const totalRows = rows.length;
        const valueField = rows.some((row) => row.totalValue !== undefined) ? 'totalValue' : rows.some((row) => row.totalAmount !== undefined) ? 'totalAmount' : rows.some((row) => row.totalSpend !== undefined) ? 'totalSpend' : null;
        const quantityField = rows.some((row) => row.onHandQuantity !== undefined) ? 'onHandQuantity' : rows.some((row) => row.quantity !== undefined) ? 'quantity' : rows.some((row) => row.orderedQuantity !== undefined) ? 'orderedQuantity' : null;
        const rateField = rows.some((row) => row.fulfillmentRate !== undefined) ? 'fulfillmentRate' : rows.some((row) => row.completionRate !== undefined) ? 'completionRate' : rows.some((row) => row.onTimeDeliveryRate !== undefined) ? 'onTimeDeliveryRate' : null;
        const currency = rows.find((row) => row.currency)?.currency || 'USD';

        const totalValue = valueField
            ? rows.reduce((sum, row) => sum + Number(row[valueField] || 0), 0)
            : 0;
        const totalQuantity = quantityField
            ? rows.reduce((sum, row) => sum + Number(row[quantityField] || 0), 0)
            : 0;
        const averageRate = rateField && rows.length
            ? rows.reduce((sum, row) => sum + Number(row[rateField] || 0), 0) / rows.length
            : 0;

        return { totalRows, totalValue, totalQuantity, averageRate, currency };
    }, [rows]);

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_42%),radial-gradient(circle_at_80%_15%,_rgba(34,197,94,0.12),_transparent_24%)]" />
                    <div className="relative flex flex-col gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Report Studio
                                </span>
                                <InfoTip text="This workspace runs the new reporting APIs directly, then allows operators to export the same output in operational formats." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Standard reports without leaving the operations console.
                            </h1>
                            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Switch between stock, purchasing, supplier, and sales reports with shared filters and export the exact same result set to CSV, XLSX, PDF, or JSON.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                            <Select
                                label="Report"
                                value={filters.reportType}
                                onChange={(event) => setFilters((current) => ({ ...current, reportType: event.target.value }))}
                                options={REPORT_OPTIONS}
                                placeholder="Choose report"
                                className="lg:col-span-2"
                            />
                            <Select
                                label="Warehouse"
                                value={filters.warehouseId}
                                onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
                                options={warehouseOptions}
                                placeholder="All warehouses"
                            />
                            <Input
                                label="From date"
                                type="date"
                                value={filters.fromDate}
                                onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
                            />
                            <Input
                                label="To date"
                                type="date"
                                value={filters.toDate}
                                onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
                            />
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                                <div className="font-semibold text-slate-900 dark:text-white">{getReportLabel(filters.reportType)}</div>
                                <div className="mt-1">{getReportDescription(filters.reportType)}</div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                {filters.reportType === 'AGING_ANALYSIS' ? (
                                    <Input
                                        label="Slow-moving threshold"
                                        type="number"
                                        value={filters.slowMovingThresholdDays}
                                        onChange={(event) => setFilters((current) => ({ ...current, slowMovingThresholdDays: event.target.value }))}
                                        className="min-w-[180px]"
                                    />
                                ) : null}
                                <Button icon="tune" loading={loading} onClick={() => loadReport()}>
                                    Run report
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Rows Returned" value={formatNumber(metrics.totalRows)} caption="Number of records in the current report response" icon="dataset" tone="blue" />
                    <MetricCard title="Aggregate Quantity" value={formatNumber(metrics.totalQuantity)} caption="Summed from the dominant quantity field in this report type" icon="stacked_bar_chart" tone="emerald" />
                    <MetricCard title="Aggregate Value" value={formatCurrency(metrics.totalValue, metrics.currency)} caption="Spend, stock value, or order amount depending on the report" icon="account_balance_wallet" tone="amber" />
                    <MetricCard title="Average Rate" value={`${formatNumber(metrics.averageRate)}%`} caption="Average of fulfillment, completion, or on-time rate when available" icon="monitoring" tone="violet" />
                </div>

                <Card
                    title="Export Output"
                    subtitle="Generate downstream files from the same report definition"
                    action={<InfoTip text="Exports call the backend report builder so the file contents align with the UI filters." />}
                >
                    <div className="flex flex-wrap gap-3">
                        {['CSV', 'XLSX', 'PDF', 'JSON'].map((format) => (
                            <Button
                                key={format}
                                variant={format === 'CSV' ? 'primary' : 'secondary'}
                                icon="download"
                                loading={exportingFormat === format}
                                onClick={() => handleExport(format)}
                            >
                                Export {format}
                            </Button>
                        ))}
                    </div>
                </Card>

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title={`${getReportLabel(filters.reportType)} Register`}
                    subtitle="Live response from the reporting backend"
                >
                    <DataTable
                        columns={columns}
                        data={rows}
                        loading={loading}
                        emptyMessage="No report rows are available for the selected filter set."
                    />
                </Card>
            </div>
        </div>
    );
};

export default Reports;
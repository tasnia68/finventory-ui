import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Select } from '../../components/common';
import { getWarehouses } from '../../services/warehouseService';
import { getAnalyticsAlerts, getAnalyticsDashboardSummary, getAnalyticsWidgets } from '../../services/reportingService';
import {
    formatCurrency,
    formatDateTime,
    formatNumber,
    getAlertStatusVariant,
    getReportLabel,
    toHeadline,
    toList,
} from './utils';

const WidgetCard = ({ widget }) => {
    const rows = Array.isArray(widget?.data?.rows) ? widget.data.rows : [];
    const summaryEntries = Object.entries(widget?.data || {}).filter(([key]) => key !== 'rows');

    return (
        <Card
            title={widget.title}
            subtitle={`${toHeadline(widget.widgetType)} · ${getReportLabel(widget.reportType)}`}
            className="h-full"
            action={<InfoTip text="Default dashboard widgets are sourced from the reporting backend and update with the selected scope." />}
        >
            {rows.length ? (
                <div className="space-y-3">
                    {rows.slice(0, 4).map((row, index) => {
                        const rowEntries = Object.entries(row || {}).filter(([, value]) => value !== null && value !== undefined && value !== '');
                        const primary = rowEntries[0];
                        const secondary = rowEntries[1];
                        return (
                            <div key={`${widget.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{primary?.[1] || 'Row item'}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{secondary ? `${toHeadline(secondary[0])}: ${secondary[1]}` : 'Operational widget row'}</div>
                            </div>
                        );
                    })}
                </div>
            ) : summaryEntries.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {summaryEntries.slice(0, 6).map(([key, value]) => (
                        <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{toHeadline(key)}</div>
                            <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{typeof value === 'number' ? formatNumber(value) : String(value)}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No widget payload is available for the selected scope.
                </div>
            )}
        </Card>
    );
};

const AnalyticsOverview = () => {
    const [summary, setSummary] = useState(null);
    const [widgets, setWidgets] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [filters, setFilters] = useState({
        warehouseId: '',
        fromDate: '',
        toDate: '',
    });
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadWarehouses();
    }, []);

    useEffect(() => {
        loadOverview();
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

    const buildParams = (currentFilters = filters) => ({
        warehouseId: currentFilters.warehouseId || undefined,
        fromDate: currentFilters.fromDate || undefined,
        toDate: currentFilters.toDate || undefined,
    });

    const loadOverview = async (currentFilters = filters) => {
        try {
            setLoading(true);
            const params = buildParams(currentFilters);
            const [summaryResponse, widgetsResponse, alertsResponse] = await Promise.all([
                getAnalyticsDashboardSummary(params),
                getAnalyticsWidgets(params),
                getAnalyticsAlerts({ warehouseId: params.warehouseId }),
            ]);

            setSummary(summaryResponse || null);
            setWidgets(toList(widgetsResponse));
            setAlerts(toList(alertsResponse));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load analytics overview');
        } finally {
            setLoading(false);
        }
    };

    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    })), [warehouses]);

    const alertsColumns = [
        {
            key: 'productVariantName',
            header: 'Product',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Unspecified SKU'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.sku || 'No SKU'}</div>
                </div>
            ),
        },
        {
            key: 'warehouseName',
            header: 'Warehouse',
            render: (value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value || 'All warehouses'}</span>,
        },
        {
            key: 'currentStock',
            header: 'Current',
            render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span>,
        },
        {
            key: 'minStock',
            header: 'Min / Max',
            render: (value, row) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formatNumber(value)} / {formatNumber(row.maxStock)}
                </span>
            ),
        },
        {
            key: 'suggestedQuantity',
            header: 'Suggested Qty',
            render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => <Badge variant={getAlertStatusVariant(value)}>{toHeadline(value)}</Badge>,
        },
    ];

    const metricValues = {
        totalOnHandQuantity: formatNumber(summary?.totalOnHandQuantity),
        totalAvailableQuantity: formatNumber(summary?.totalAvailableQuantity),
        totalInventoryValue: formatCurrency(summary?.totalInventoryValue),
        inventoryTurnover: formatNumber(summary?.inventoryTurnover),
        orderFulfillmentRate: `${formatNumber(summary?.orderFulfillmentRate)}%`,
        activeStockAlerts: formatNumber(summary?.activeStockAlerts),
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.18),_transparent_40%),radial-gradient(circle_at_85%_20%,_rgba(251,146,60,0.14),_transparent_28%)]" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Analytics Overview
                                </span>
                                <InfoTip text="Use this command view as the operational landing page for stock health, demand pressure, and reporting drill-downs." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Reporting control for warehouse, purchasing, and order flow.
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Monitor inventory exposure, execution throughput, and alert pressure from one workspace, then pivot into detailed reports, imports, and automation when something needs action.
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Link to="/analytics/reports" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/30 transition-colors hover:bg-primary/90">
                                    <span className="material-symbols-outlined text-[20px]">insights</span>
                                    Open Reports
                                </Link>
                                <Link to="/analytics/data-exchange" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                                    <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                                    Manage Data Exchange
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[420px]">
                            <Select
                                label="Warehouse scope"
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
                            <div className="flex items-end">
                                <Button icon="sync" className="w-full" loading={loading} onClick={() => loadOverview()}>
                                    Refresh overview
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard title="On-Hand Quantity" value={metricValues.totalOnHandQuantity} caption="Physical units currently registered across the selected scope" icon="inventory_2" tone="blue" />
                    <MetricCard title="Available Quantity" value={metricValues.totalAvailableQuantity} caption="Net available inventory after operational constraints" icon="deployed_code" tone="emerald" />
                    <MetricCard title="Inventory Value" value={metricValues.totalInventoryValue} caption="Estimated carrying value from current stock and cost basis" icon="payments" tone="amber" />
                    <MetricCard title="Inventory Turnover" value={metricValues.inventoryTurnover} caption="Velocity indicator for stock movement within the active period" icon="autorenew" tone="violet" />
                    <MetricCard title="Fulfillment Rate" value={metricValues.orderFulfillmentRate} caption="Order execution effectiveness across open and shipped demand" icon="local_shipping" tone="blue" />
                    <MetricCard title="Active Alerts" value={metricValues.activeStockAlerts} caption={`Generated ${formatDateTime(summary?.generatedAt)}`} icon="notification_important" tone="rose" />
                </div>

                <Card
                    title="Embedded Widgets"
                    subtitle="Backend-driven reporting cards exposed for quick operational scan"
                    action={<InfoTip text="These widgets reflect the reporting configurations exposed through the analytics API." />}
                >
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {loading && !widgets.length ? (
                            <div className="col-span-full flex items-center justify-center py-12">
                                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
                            </div>
                        ) : widgets.length ? widgets.map((widget, index) => (
                            <WidgetCard key={widget.configurationId || `${widget.title}-${index}`} widget={widget} />
                        )) : (
                            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                No analytics widgets are configured yet.
                            </div>
                        )}
                    </div>
                </Card>

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title="Stock Alerts"
                    subtitle="Action queue for replenishment, transfers, and exception handling"
                    action={<InfoTip text="Alerts are generated by the reporting backend and are scoped to the selected warehouse when applicable." />}
                >
                    <DataTable
                        columns={alertsColumns}
                        data={alerts}
                        loading={loading}
                        emptyMessage="No stock alerts are active for the current scope."
                    />
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsOverview;
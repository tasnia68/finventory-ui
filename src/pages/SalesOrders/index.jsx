import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getCustomers } from '../../services/customerService';
import { getSalesOrders, createSalesOrder, updateSalesOrder, updateSalesOrderItems, updateSalesOrderStatus } from '../../services/salesOrderService';
import { getWarehouses } from '../../services/warehouseService';
import SalesOrderDetailModal from './SalesOrderDetailModal';
import SalesOrderFormModal from './SalesOrderFormModal';
import { formatCurrency, formatDate, formatDateTime, formatNumber, getSalesOrderStatusVariant, toList } from '../Sales/utils';
import { generateUUID } from '../../utils/uuid';
import { SALES_ORDER_SOURCES, getSalesOrderSource, getSalesOrderSourceBadgeVariant, getSalesOrderSourceLabel } from '../../utils/salesOrderSource';
import { useStorefrontModule } from '../../hooks/useStorefrontModule';

const STATUS_OPTIONS = ['DRAFT', 'PENDING', 'HOLD', 'APPROVED', 'CONFIRMED', 'PACKAGING', 'BACKORDERED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'PARTIALLY_CANCELLED', 'CANCELLED', 'RETURNED'].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ value, label: value }));
const SOURCE_OPTIONS = [
    { value: SALES_ORDER_SOURCES.STOREFRONT, label: 'Storefront' },
    { value: SALES_ORDER_SOURCES.DIRECT, label: 'Direct' },
    { value: SALES_ORDER_SOURCES.POS, label: 'POS' },
];

const createEmptyForm = () => ({ customerId: '', warehouseId: '', expectedDeliveryDate: '', priority: 'MEDIUM', currency: 'USD', notes: '', items: [{ id: generateUUID(), variant: null, quantity: 1, unitPrice: '' }] });

// Status sets that mirror SalesOrderServiceImpl edit policies.
const FULL_EDIT_STATUSES = new Set(['DRAFT', 'PENDING']);
const ITEMS_LOCKED_STATUSES = new Set(['SHIPPED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'PARTIALLY_CANCELLED', 'RETURNED', 'CANCELLED', 'DELIVERY_FAILED']);

const canEditOrder = (order) => {
    if (!order || !order.status) return false;
    return FULL_EDIT_STATUSES.has(order.status) || !ITEMS_LOCKED_STATUSES.has(order.status);
};

const isItemsOnlyEdit = (order) => order && order.status && !FULL_EDIT_STATUSES.has(order.status) && !ITEMS_LOCKED_STATUSES.has(order.status);

const SalesOrders = ({ mode = 'all' }) => {
    const [salesOrders, setSalesOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ query: '', status: '', priority: '', source: mode === 'storefront' ? SALES_ORDER_SOURCES.STOREFRONT : '' });
    const [showFormModal, setShowFormModal] = useState(false);
    const [formData, setFormData] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { storefrontEnabled, storefrontResolved } = useStorefrontModule();

    useEffect(() => {
        setFilters((current) => ({
            ...current,
            source: mode === 'storefront' ? SALES_ORDER_SOURCES.STOREFRONT : current.source === SALES_ORDER_SOURCES.STOREFRONT && !storefrontEnabled ? '' : current.source,
        }));
    }, [mode, storefrontEnabled]);

    useEffect(() => {
        loadPage();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadPage = async () => {
        try {
            setLoading(true);
            const [customerData, warehouseData, orderData] = await Promise.all([
                getCustomers(),
                getWarehouses(),
                getSalesOrders({ page: 0, size: 100 }),
            ]);
            setCustomers(Array.isArray(customerData) ? customerData : []);
            setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
            setSalesOrders(toList(orderData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load sales orders');
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return salesOrders.filter((order) => {
            if (filters.status && order.status !== filters.status) return false;
            if (filters.priority && order.priority !== filters.priority) return false;
            if (filters.source && getSalesOrderSource(order) !== filters.source) return false;
            if (!normalizedQuery) return true;
            return [order.soNumber, order.customerName, order.warehouseName]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [salesOrders, filters]);

    const summary = useMemo(() => ({
        total: salesOrders.length,
        open: salesOrders.filter((order) => ['DRAFT', 'PENDING', 'HOLD', 'APPROVED', 'CONFIRMED', 'PACKAGING', 'BACKORDERED', 'PARTIALLY_SHIPPED'].includes(order.status)).length,
        backlog: salesOrders.filter((order) => order.status === 'BACKORDERED').length,
        totalValue: salesOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
        storefront: salesOrders.filter((order) => getSalesOrderSource(order) === SALES_ORDER_SOURCES.STOREFRONT).length,
    }), [salesOrders]);

    const columns = [
        {
            key: 'soNumber',
            header: 'Sales Order',
            render: (value, row) => (
                <div>
                    <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                        <Badge variant={getSalesOrderSourceBadgeVariant(row)}>{getSalesOrderSourceLabel(row)}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.customerName} • {row.warehouseName || 'No warehouse'}</div>
                </div>
            ),
        },
        { key: 'salesChannel', header: 'Source', render: (_, row) => <Badge variant={getSalesOrderSourceBadgeVariant(row)}>{getSalesOrderSourceLabel(row)}</Badge> },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getSalesOrderStatusVariant(value)}>{value}</Badge> },
        { key: 'expectedDeliveryDate', header: 'Expected Delivery', render: (value) => formatDate(value) },
        { key: 'totalAmount', header: 'Order Value', render: (value, row) => formatCurrency(value, row.currency) },
        { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
    ];

    const openCreate = () => {
        setEditingOrder(null);
        setFormData(createEmptyForm());
        setShowFormModal(true);
    };

    const openEdit = (order) => {
        setEditingOrder(order);
        setFormData({
            customerId: order.customerId,
            warehouseId: order.warehouseId,
            expectedDeliveryDate: order.expectedDeliveryDate || '',
            priority: order.priority || 'MEDIUM',
            currency: order.currency || 'USD',
            notes: order.notes || '',
            items: (order.items || []).map((item) => ({
                id: item.id,
                variant: { id: item.productVariantId, sku: item.sku, name: item.productVariantName },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
        });
        setShowFormModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const payload = {
                customerId: formData.customerId,
                warehouseId: formData.warehouseId,
                expectedDeliveryDate: formData.expectedDeliveryDate || null,
                priority: formData.priority,
                currency: formData.currency || 'USD',
                notes: formData.notes || null,
                items: formData.items.map((item) => ({
                    productVariantId: item.variant.id,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                })),
            };
            if (editingOrder) {
                if (isItemsOnlyEdit(editingOrder)) {
                    await updateSalesOrderItems(editingOrder.id, payload.items);
                    showAlert('success', `Items updated on ${editingOrder.soNumber}`);
                } else {
                    await updateSalesOrder(editingOrder.id, payload);
                    showAlert('success', 'Sales order updated');
                }
            } else {
                await createSalesOrder(payload);
                showAlert('success', 'Sales order created');
            }
            setShowFormModal(false);
            loadPage();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save sales order');
        } finally {
            setSaving(false);
        }
    };

    const transitionOrder = async (order, status) => {
        try {
            await updateSalesOrderStatus(order.id, status);
            showAlert('success', `Sales order moved to ${status}`);
            loadPage();
            if (selectedOrder?.id === order.id) {
                setSelectedOrder({ ...selectedOrder, status });
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to update sales order status');
        }
    };

    const pageTitle = mode === 'storefront' ? 'Web Orders' : 'Commit demand with pricing, priority, and warehouse intent in one ledger.';
    const pageDescription = mode === 'storefront'
        ? 'Storefront-originated customer orders land here first, then move through the same approval and fulfillment workflow as every other sales order.'
        : 'Sales coordinators can stage, approve, confirm, and monitor customer demand before the warehouse allocates picking and shipping effort.';

    if (mode === 'storefront' && storefrontResolved && !storefrontEnabled) {
        return (
            <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
                <div className="mx-auto max-w-4xl">
                    <Alert
                        type="info"
                        message="The storefront module is not enabled for this workspace, so Web Orders is hidden for this tenant."
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Sales Orders"
                    title={pageTitle}
                    description={pageDescription}
                    actions={(
                        <>
                            <Input placeholder="Search SO, customer, or warehouse" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[260px]" />
                            <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={STATUS_OPTIONS} placeholder="Status" className="min-w-[220px]" />
                            <Select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))} options={PRIORITY_OPTIONS} placeholder="Priority" className="min-w-[180px]" />
                            {storefrontEnabled && mode !== 'storefront' ? (
                                <Select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} options={SOURCE_OPTIONS} placeholder="Source" className="min-w-[180px]" />
                            ) : null}
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            {storefrontEnabled && mode !== 'storefront' ? (
                                <Link to="/sales-orders/web" className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20">
                                    Web Orders
                                </Link>
                            ) : null}
                            {storefrontEnabled && mode === 'storefront' ? (
                                <Link to="/sales-orders" className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                    All Orders
                                </Link>
                            ) : null}
                            <Button icon="add" onClick={openCreate}>Create Order</Button>
                        </>
                    )}
                    accent="from-fuchsia-500/15 via-transparent to-sky-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Sales Orders" value={formatNumber(summary.total)} caption="All customer orders currently visible" icon="receipt_long" tone="blue" />
                    <MetricCard title="Open Orders" value={formatNumber(summary.open)} caption="Orders still moving through approval or fulfillment" icon="pending_actions" tone="amber" />
                    <MetricCard title="Backorders" value={formatNumber(summary.backlog)} caption="Demand waiting on available stock or allocation" icon="event_busy" tone="rose" />
                    {storefrontEnabled ? (
                        <MetricCard title="Web Orders" value={formatNumber(summary.storefront)} caption="Storefront-origin demand captured in the shared order book" icon="storefront" tone="emerald" />
                    ) : (
                        <MetricCard title="Booked Value" value={formatCurrency(summary.totalValue)} caption="Commercial value across the visible order book" icon="payments" tone="violet" />
                    )}
                </div>

                <Card padding="none" className="overflow-hidden" title="Order Book" subtitle="Demand register feeding reservations, picking, and shipment execution">
                    <DataTable columns={columns} data={filteredOrders} loading={loading} emptyMessage="No sales orders found." onRowClick={setSelectedOrder} />
                </Card>
            </div>

            <SalesOrderFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} customers={customers.filter((customer) => customer.status === 'ACTIVE' && customer.isActive)} warehouses={warehouses} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} loading={saving} isEditing={Boolean(editingOrder)} itemsOnly={isItemsOnlyEdit(editingOrder)} editingStatus={editingOrder?.status} />

            <SalesOrderDetailModal
                salesOrder={selectedOrder}
                isOpen={Boolean(selectedOrder)}
                onClose={() => setSelectedOrder(null)}
                onEdit={(order) => {
                    setSelectedOrder(null);
                    openEdit(order);
                }}
                onRefresh={(message) => {
                    if (message) showAlert('success', message);
                    setSelectedOrder(null);
                    loadPage();
                }}
            />
        </div>
    );
};

export default SalesOrders;

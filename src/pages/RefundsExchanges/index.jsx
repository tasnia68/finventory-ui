import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    InfoTip,
    Input,
    MetricCard,
    Modal,
    ProductVariantLookup,
    Select,
} from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getBatches } from '../../services/batchService';
import { getCustomers } from '../../services/customerService';
import {
    getCustomerStoreCreditTransactions,
    approveSalesRefund,
    cancelSalesRefund,
    completeSalesRefund,
    createSalesRefund,
    generateRefundCreditNote,
    getRmas,
    getSalesRefund,
    getSalesRefunds,
    getStorageLocations,
    rejectSalesRefund,
} from '../../services/salesRefundService';
import { getSalesOrders } from '../../services/salesOrderService';
import { getWarehouses } from '../../services/warehouseService';
import { useLanguage } from '../../contexts/LanguageContext';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const createReplacementItem = () => ({
    id: crypto.randomUUID(),
    variant: null,
    quantity: '',
    unitPrice: '',
});

const createRefundItem = (item) => ({
    salesOrderItemId: item.id,
    productVariantId: item.productVariantId,
    sku: item.sku,
    shippedQuantity: Number(item.shippedQuantity || item.quantity || 0),
    quantity: '',
    unitPrice: String(item.unitPrice || ''),
    returnDisposition: 'RETURN_TO_STOCK',
    reason: '',
    batchId: '',
    storageLocationId: '',
    serialNumbers: '',
});

const getRefundStatusVariant = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'APPROVED':
            return 'primary';
        case 'PENDING_APPROVAL':
            return 'warning';
        case 'REJECTED':
        case 'CANCELLED':
            return 'danger';
        default:
            return 'default';
    }
};

const getRefundTypeVariant = (type) => {
    switch (type) {
        case 'EXCHANGE':
            return 'info';
        case 'STORE_CREDIT':
            return 'primary';
        default:
            return 'default';
    }
};

const RefundsExchanges = () => {
    const { t, formatNumber, formatCurrency, formatDateTime } = useLanguage();
    const [refunds, setRefunds] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [selectedRefundId, setSelectedRefundId] = useState(null);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [creditTransactions, setCreditTransactions] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [storageLocations, setStorageLocations] = useState([]);
    const [batchOptionsByVariant, setBatchOptionsByVariant] = useState({});
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [creditLoading, setCreditLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ customerId: '', status: '', type: '', query: '' });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        salesOrderId: '',
        rmaId: '',
        warehouseId: '',
        refundType: 'REFUND',
        refundMethod: 'ORIGINAL_PAYMENT_METHOD',
        reason: '',
        notes: '',
        items: [],
        replacementItems: [],
    });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadPage = async (preferredSelectedId = selectedRefundId) => {
        try {
            setLoading(true);
            const [refundData, customerData, warehouseData, orderData] = await Promise.all([
                getSalesRefunds({ page: 0, size: 100 }),
                getCustomers(),
                getWarehouses(),
                getSalesOrders({ page: 0, size: 100 }),
            ]);

            const nextRefunds = toList(refundData);
            setRefunds(nextRefunds);
            setCustomers(toList(customerData));
            setWarehouses(toList(warehouseData));
            setSalesOrders(toList(orderData).filter((order) => ['SHIPPED', 'DELIVERED', 'RETURNED'].includes(order.status)));

            if (preferredSelectedId) {
                setSelectedRefundId(nextRefunds.find((refund) => refund.id === preferredSelectedId)?.id || null);
            }
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const loadRefundDetail = async (refundId) => {
        if (!refundId) {
            setSelectedRefund(null);
            setCreditTransactions([]);
            return;
        }

        try {
            setDetailLoading(true);
            const refund = await getSalesRefund(refundId);
            setSelectedRefund(refund);

            if (refund.customerId) {
                setCreditLoading(true);
                const creditData = await getCustomerStoreCreditTransactions(refund.customerId, { page: 0, size: 20 });
                setCreditTransactions(toList(creditData));
            } else {
                setCreditTransactions([]);
            }
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.detailFailed'));
        } finally {
            setDetailLoading(false);
            setCreditLoading(false);
        }
    };

    useEffect(() => {
        loadPage();
    }, []);

    useEffect(() => {
        loadRefundDetail(selectedRefundId);
    }, [selectedRefundId]);

    const filteredRefunds = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return refunds.filter((refund) => {
            if (filters.customerId && refund.customerId !== filters.customerId) return false;
            if (filters.status && refund.status !== filters.status) return false;
            if (filters.type && refund.refundType !== filters.type) return false;
            if (!query) return true;

            return [refund.refundNumber, refund.soNumber, refund.customerName, refund.creditNoteNumber]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [refunds, filters]);

    const summary = useMemo(() => ({
        totalRefunds: refunds.length,
        pendingApproval: refunds.filter((refund) => refund.status === 'PENDING_APPROVAL').length,
        netRefundAmount: refunds.reduce((sum, refund) => sum + Number(refund.netRefundAmount || 0), 0),
        storeCreditIssued: refunds.reduce((sum, refund) => sum + Number(refund.storeCreditIssued || 0), 0),
        exchanges: refunds.filter((refund) => refund.refundType === 'EXCHANGE').length,
    }), [refunds]);

    const customerOptions = useMemo(() => customers.map((customer) => ({ value: customer.id, label: customer.name })), [customers]);
    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })), [warehouses]);
    const salesOrderOptions = useMemo(() => salesOrders.map((order) => ({ value: order.id, label: `${order.soNumber} • ${order.customerName}` })), [salesOrders]);
    const rmaOptions = useMemo(() => rmas.map((rma) => ({ value: rma.id, label: `${rma.rmaNumber} • ${rma.status}` })), [rmas]);
    const storageLocationOptions = useMemo(() => storageLocations.map((location) => ({ value: location.id, label: location.name })), [storageLocations]);

    const currentSalesOrder = useMemo(() => salesOrders.find((order) => order.id === createForm.salesOrderId) || null, [salesOrders, createForm.salesOrderId]);
    const currentRma = useMemo(() => rmas.find((rma) => rma.id === createForm.rmaId) || null, [rmas, createForm.rmaId]);

    const loadCreateDependencies = async (salesOrder) => {
        if (!salesOrder) {
            setRmas([]);
            setStorageLocations([]);
            setBatchOptionsByVariant({});
            return;
        }

        try {
            const [rmaData, locationData, batchGroups] = await Promise.all([
                getRmas({ salesOrderId: salesOrder.id, page: 0, size: 100 }),
                salesOrder.warehouseId ? getStorageLocations(salesOrder.warehouseId) : Promise.resolve([]),
                Promise.all((salesOrder.items || []).map(async (item) => {
                    try {
                        const batches = await getBatches({ productVariantId: item.productVariantId });
                        return [item.productVariantId, toList(batches)];
                    } catch (error) {
                        return [item.productVariantId, []];
                    }
                })),
            ]);

            setRmas(toList(rmaData));
            setStorageLocations(toList(locationData));
            setBatchOptionsByVariant(Object.fromEntries(batchGroups));
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.lookupFailed'));
        }
    };

    const openCreateModal = () => {
        setCreateForm({
            salesOrderId: salesOrderOptions[0]?.value || '',
            rmaId: '',
            warehouseId: '',
            refundType: 'REFUND',
            refundMethod: 'ORIGINAL_PAYMENT_METHOD',
            reason: '',
            notes: '',
            items: [],
            replacementItems: [],
        });
        setShowCreateModal(true);
    };

    useEffect(() => {
        if (!showCreateModal) {
            return;
        }

        const salesOrder = salesOrders.find((order) => order.id === createForm.salesOrderId) || null;
        if (!salesOrder) {
            return;
        }

        loadCreateDependencies(salesOrder);
        setCreateForm((current) => ({
            ...current,
            warehouseId: salesOrder.warehouseId || current.warehouseId,
            items: current.items.length > 0 && current.salesOrderId === salesOrder.id
                ? current.items
                : (salesOrder.items || []).map(createRefundItem),
        }));
    }, [showCreateModal, createForm.salesOrderId, salesOrders]);

    const handleSalesOrderChange = (salesOrderId) => {
        const order = salesOrders.find((item) => item.id === salesOrderId) || null;
        setCreateForm((current) => ({
            ...current,
            salesOrderId,
            rmaId: '',
            warehouseId: order?.warehouseId || '',
            refundMethod: 'ORIGINAL_PAYMENT_METHOD',
            items: (order?.items || []).map(createRefundItem),
            replacementItems: current.refundType === 'EXCHANGE' ? [createReplacementItem()] : [],
        }));
    };

    const handleRmaChange = (rmaId) => {
        const nextRma = rmas.find((item) => item.id === rmaId) || null;
        setCreateForm((current) => ({
            ...current,
            rmaId,
            items: current.items.map((item) => {
                const matchedLine = nextRma?.items?.find((rmaItem) => rmaItem.salesOrderItemId === item.salesOrderItemId);
                return matchedLine && !item.quantity
                    ? { ...item, quantity: String(matchedLine.quantity || '') }
                    : item;
            }),
        }));
    };

    const handleRefundItemChange = (salesOrderItemId, key, value) => {
        setCreateForm((current) => ({
            ...current,
            items: current.items.map((item) => item.salesOrderItemId === salesOrderItemId ? { ...item, [key]: value } : item),
        }));
    };

    const handleReplacementItemChange = (itemId, key, value) => {
        setCreateForm((current) => ({
            ...current,
            replacementItems: current.replacementItems.map((item) => item.id === itemId ? { ...item, [key]: value } : item),
        }));
    };

    const getEligibleQuantity = (item) => {
        const rmaItem = currentRma?.items?.find((rmaLine) => rmaLine.salesOrderItemId === item.salesOrderItemId);
        return Number(rmaItem?.quantity || item.shippedQuantity || 0);
    };

    const handleCreateRefund = async (event) => {
        event.preventDefault();

        const validItems = createForm.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
                salesOrderItemId: item.salesOrderItemId,
                quantity: Number(item.quantity),
                unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
                returnDisposition: item.returnDisposition,
                reason: item.reason || null,
                batchId: item.batchId || null,
                storageLocationId: item.storageLocationId || null,
                serialNumbers: item.serialNumbers
                    ? item.serialNumbers.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
                    : [],
            }));

        const validReplacementItems = createForm.replacementItems
            .filter((item) => item.variant?.id && Number(item.quantity) > 0 && Number(item.unitPrice) > 0)
            .map((item) => ({
                productVariantId: item.variant.id,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            }));

        if (!createForm.salesOrderId) {
            showAlert('error', t('refundsExchanges.messages.salesOrderRequired'));
            return;
        }
        if (validItems.length === 0) {
            showAlert('error', t('refundsExchanges.messages.itemsRequired'));
            return;
        }
        if (createForm.refundType === 'EXCHANGE' && validReplacementItems.length === 0) {
            showAlert('error', t('refundsExchanges.messages.replacementRequired'));
            return;
        }

        try {
            setActionLoading('create');
            const created = await createSalesRefund({
                salesOrderId: createForm.salesOrderId,
                rmaId: createForm.rmaId || null,
                warehouseId: createForm.warehouseId || null,
                refundType: createForm.refundType,
                refundMethod: createForm.refundMethod,
                reason: createForm.reason || null,
                notes: createForm.notes || null,
                items: validItems,
                replacementItems: createForm.refundType === 'EXCHANGE' ? validReplacementItems : undefined,
            });
            showAlert('success', t('refundsExchanges.messages.created'));
            setShowCreateModal(false);
            await loadPage(created.id);
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.createFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleRefundAction = async (actionKey, action, successMessage) => {
        if (!selectedRefundId) return;
        try {
            setActionLoading(actionKey);
            await action(selectedRefundId, {});
            showAlert('success', successMessage);
            await loadPage(selectedRefundId);
            await loadRefundDetail(selectedRefundId);
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.actionFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleGenerateCreditNote = async () => {
        if (!selectedRefundId) return;
        try {
            setActionLoading('credit-note');
            await generateRefundCreditNote(selectedRefundId);
            showAlert('success', t('refundsExchanges.messages.creditNoteGenerated'));
            await loadRefundDetail(selectedRefundId);
            await loadPage(selectedRefundId);
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.creditNoteFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const columns = [
        {
            key: 'refundNumber',
            header: t('refundsExchanges.columns.refund'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.soNumber} • {row.customerName}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: t('refundsExchanges.columns.status'),
            render: (value) => <Badge variant={getRefundStatusVariant(value)}>{t(`refundsExchanges.enums.status.${value}`)}</Badge>,
        },
        {
            key: 'refundType',
            header: t('refundsExchanges.columns.type'),
            render: (value) => <Badge variant={getRefundTypeVariant(value)}>{t(`refundsExchanges.enums.type.${value}`)}</Badge>,
        },
        {
            key: 'refundMethod',
            header: t('refundsExchanges.columns.method'),
            render: (value) => t(`refundsExchanges.enums.method.${value}`),
        },
        {
            key: 'netRefundAmount',
            header: t('refundsExchanges.columns.netRefund'),
            render: (value) => formatCurrency(Number(value || 0)),
        },
        {
            key: 'requestedAt',
            header: t('refundsExchanges.columns.requestedAt'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background-light p-4 sm:p-6 lg:p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6 sm:gap-8">
                <SalesHero
                    eyebrow={t('refundsExchanges.eyebrow')}
                    title={t('refundsExchanges.title')}
                    description={t('refundsExchanges.description')}
                    actions={(
                        <>
                            <Input placeholder={t('refundsExchanges.filters.searchPlaceholder')} value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[240px]" />
                            <Select value={filters.customerId} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))} options={customerOptions} placeholder={t('refundsExchanges.filters.customer')} className="min-w-[220px]" />
                            <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((value) => ({ value, label: t(`refundsExchanges.enums.status.${value}`) }))} placeholder={t('refundsExchanges.filters.status')} className="min-w-[220px]" />
                            <Select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} options={['REFUND', 'EXCHANGE', 'STORE_CREDIT'].map((value) => ({ value, label: t(`refundsExchanges.enums.type.${value}`) }))} placeholder={t('refundsExchanges.filters.type')} className="min-w-[220px]" />
                            <Button variant="secondary" icon="sync" onClick={() => loadPage(selectedRefundId)}>{t('refundsExchanges.actions.refresh')}</Button>
                            <Button icon="currency_exchange" onClick={openCreateModal}>{t('refundsExchanges.actions.create')}</Button>
                        </>
                    )}
                    accent="from-emerald-500/15 via-transparent to-amber-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard title={t('refundsExchanges.metrics.totalRefunds')} value={formatNumber(summary.totalRefunds)} icon="receipt_long" tone="blue" info={t('refundsExchanges.metricInfo.totalRefunds')} caption={t('refundsExchanges.metricCaption.totalRefunds')} />
                    <MetricCard title={t('refundsExchanges.metrics.pendingApproval')} value={formatNumber(summary.pendingApproval)} icon="approval_delegation" tone="amber" info={t('refundsExchanges.metricInfo.pendingApproval')} caption={t('refundsExchanges.metricCaption.pendingApproval')} />
                    <MetricCard title={t('refundsExchanges.metrics.netRefund')} value={formatCurrency(summary.netRefundAmount)} icon="payments" tone="emerald" info={t('refundsExchanges.metricInfo.netRefund')} caption={t('refundsExchanges.metricCaption.netRefund')} />
                    <MetricCard title={t('refundsExchanges.metrics.storeCredit')} value={formatCurrency(summary.storeCreditIssued)} icon="account_balance_wallet" tone="violet" info={t('refundsExchanges.metricInfo.storeCredit')} caption={t('refundsExchanges.metricCaption.storeCredit')} />
                    <MetricCard title={t('refundsExchanges.metrics.exchanges')} value={formatNumber(summary.exchanges)} icon="swap_horiz" tone="rose" info={t('refundsExchanges.metricInfo.exchanges')} caption={t('refundsExchanges.metricCaption.exchanges')} />
                </div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.9fr)]">
                    <div className="space-y-8">
                        <Card padding="none" className="overflow-hidden" title={t('refundsExchanges.register.title')} subtitle={t('refundsExchanges.register.subtitle')} action={<InfoTip text={t('refundsExchanges.register.info')} />}>
                            <DataTable columns={columns} data={filteredRefunds} loading={loading} emptyMessage={t('refundsExchanges.register.empty')} onRowClick={(row) => setSelectedRefundId(row.id)} />
                        </Card>
                    </div>

                    <Card title={t('refundsExchanges.detail.title')} subtitle={selectedRefund ? selectedRefund.refundNumber : t('refundsExchanges.detail.subtitle')}>
                        {detailLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
                            </div>
                        ) : !selectedRefund ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                {t('refundsExchanges.detail.empty')}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedRefund.refundNumber}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <Badge variant={getRefundStatusVariant(selectedRefund.status)}>{t(`refundsExchanges.enums.status.${selectedRefund.status}`)}</Badge>
                                                <Badge variant={getRefundTypeVariant(selectedRefund.refundType)}>{t(`refundsExchanges.enums.type.${selectedRefund.refundType}`)}</Badge>
                                                <span>{selectedRefund.soNumber}</span>
                                                <span>•</span>
                                                <span>{selectedRefund.customerName}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRefund.status === 'PENDING_APPROVAL' ? (
                                                <>
                                                    <Button size="sm" loading={actionLoading === 'approve'} onClick={() => handleRefundAction('approve', approveSalesRefund, t('refundsExchanges.messages.approved'))}>{t('refundsExchanges.actions.approve')}</Button>
                                                    <Button size="sm" variant="danger" loading={actionLoading === 'reject'} onClick={() => handleRefundAction('reject', rejectSalesRefund, t('refundsExchanges.messages.rejected'))}>{t('refundsExchanges.actions.reject')}</Button>
                                                </>
                                            ) : null}
                                            {selectedRefund.status === 'APPROVED' ? (
                                                <Button size="sm" loading={actionLoading === 'complete'} onClick={() => handleRefundAction('complete', completeSalesRefund, t('refundsExchanges.messages.completed'))}>{t('refundsExchanges.actions.complete')}</Button>
                                            ) : null}
                                            {selectedRefund.status !== 'COMPLETED' && selectedRefund.status !== 'REJECTED' && selectedRefund.status !== 'CANCELLED' ? (
                                                <Button size="sm" variant="secondary" loading={actionLoading === 'cancel'} onClick={() => handleRefundAction('cancel', cancelSalesRefund, t('refundsExchanges.messages.cancelled'))}>{t('refundsExchanges.actions.cancel')}</Button>
                                            ) : null}
                                            <Button size="sm" variant="ghost" loading={actionLoading === 'credit-note'} onClick={handleGenerateCreditNote}>{t('refundsExchanges.actions.generateCreditNote')}</Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.method')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{t(`refundsExchanges.enums.method.${selectedRefund.refundMethod}`)}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.requestedAt')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{selectedRefund.requestedAt ? formatDateTime(selectedRefund.requestedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.netRefund')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(Number(selectedRefund.netRefundAmount || 0))}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.priceDifference')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(Number(selectedRefund.exchangePriceDifference || 0))}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.detail.items')}</h3>
                                        <InfoTip text={t('refundsExchanges.detail.itemsInfo')} />
                                    </div>
                                    <div className="space-y-3">
                                        {selectedRefund.items?.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku}</div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {t(`refundsExchanges.enums.disposition.${item.returnDisposition}`)}
                                                            {item.storageLocationName ? ` • ${item.storageLocationName}` : ''}
                                                            {item.batchNumber ? ` • ${item.batchNumber}` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="default">{formatNumber(Number(item.quantity || 0), { maximumFractionDigits: 2 })}</Badge>
                                                        <Badge variant="primary">{formatCurrency(Number(item.refundAmount || 0))}</Badge>
                                                    </div>
                                                </div>
                                                {item.reason ? <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{item.reason}</div> : null}
                                                {item.serialNumbers?.length ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.serialNumbers.join(', ')}</div> : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.detail.audit')}</h3>
                                        <InfoTip text={t('refundsExchanges.detail.auditInfo')} />
                                    </div>
                                    <div className="space-y-3">
                                        {(selectedRefund.auditEntries || []).length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('refundsExchanges.detail.noAudit')}</div>
                                        ) : selectedRefund.auditEntries.map((entry) => (
                                            <div key={entry.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(`refundsExchanges.enums.audit.${entry.action}`)}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{entry.actedAt ? formatDateTime(entry.actedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                                                </div>
                                                {entry.notes ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{entry.notes}</div> : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.detail.storeCredit')}</h3>
                                        <InfoTip text={t('refundsExchanges.detail.storeCreditInfo')} />
                                    </div>
                                    <div className="space-y-3">
                                        {creditLoading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <span className="material-symbols-outlined animate-spin text-[24px] text-primary">progress_activity</span>
                                            </div>
                                        ) : creditTransactions.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('refundsExchanges.detail.noStoreCredit')}</div>
                                        ) : creditTransactions.map((transaction) => (
                                            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(`refundsExchanges.enums.storeCredit.${transaction.type}`)}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{transaction.referenceNumber || t('refundsExchanges.labels.none')}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(transaction.amount || 0))}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(transaction.transactionDate, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.detail.creditNote')}</h3>
                                        <InfoTip text={t('refundsExchanges.detail.creditNoteInfo')} />
                                    </div>
                                    {selectedRefund.creditNoteNumber ? (
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedRefund.creditNoteNumber}</div>
                                                <Badge variant="success">{t('refundsExchanges.labels.generated')}</Badge>
                                            </div>
                                            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-600 dark:text-slate-300">{selectedRefund.documentContent || t('refundsExchanges.detail.documentPending')}</pre>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('refundsExchanges.detail.noCreditNote')}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('refundsExchanges.forms.title')} size="xl">
                <form className="space-y-5" onSubmit={handleCreateRefund}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Select label={t('refundsExchanges.forms.salesOrder')} value={createForm.salesOrderId} onChange={(event) => handleSalesOrderChange(event.target.value)} options={salesOrderOptions} placeholder={t('refundsExchanges.forms.selectSalesOrder')} required />
                        <Select label={t('refundsExchanges.forms.rma')} value={createForm.rmaId} onChange={(event) => handleRmaChange(event.target.value)} options={rmaOptions} placeholder={t('refundsExchanges.forms.optionalRma')} />
                        <Select label={t('refundsExchanges.forms.warehouse')} value={createForm.warehouseId} onChange={(event) => setCreateForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder={t('refundsExchanges.forms.selectWarehouse')} required />
                        <Select label={t('refundsExchanges.forms.type')} value={createForm.refundType} onChange={(event) => setCreateForm((current) => ({
                            ...current,
                            refundType: event.target.value,
                            replacementItems: event.target.value === 'EXCHANGE' && current.replacementItems.length === 0 ? [createReplacementItem()] : (event.target.value === 'EXCHANGE' ? current.replacementItems : []),
                        }))} options={['REFUND', 'EXCHANGE', 'STORE_CREDIT'].map((value) => ({ value, label: t(`refundsExchanges.enums.type.${value}`) }))} placeholder={t('refundsExchanges.forms.type')} />
                        <Select label={t('refundsExchanges.forms.method')} value={createForm.refundMethod} onChange={(event) => setCreateForm((current) => ({ ...current, refundMethod: event.target.value }))} options={['ORIGINAL_PAYMENT_METHOD', 'STORE_CREDIT', 'CASH', 'CARD', 'TRANSFER', 'OTHER'].map((value) => ({ value, label: t(`refundsExchanges.enums.method.${value}`) }))} placeholder={t('refundsExchanges.forms.method')} />
                        <Input label={t('refundsExchanges.forms.reason')} value={createForm.reason} onChange={(event) => setCreateForm((current) => ({ ...current, reason: event.target.value }))} placeholder={t('refundsExchanges.forms.reasonPlaceholder')} />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('refundsExchanges.forms.notes')}</label>
                        <textarea value={createForm.notes} onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('refundsExchanges.forms.notesPlaceholder')} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.forms.items')}</h3>
                            <InfoTip text={t('refundsExchanges.forms.itemsInfo')} />
                        </div>
                        {createForm.items.map((item) => {
                            const batchOptions = (batchOptionsByVariant[item.productVariantId] || []).map((batch) => ({ value: batch.id, label: batch.batchNumber }));
                            return (
                                <div key={item.salesOrderItemId} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.sku}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{t('refundsExchanges.labels.maxReturnable', { value: formatNumber(getEligibleQuantity(item), { maximumFractionDigits: 2 }) })}</div>
                                        </div>
                                        <Badge variant="default">{formatCurrency(Number(item.unitPrice || 0))}</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <Input label={t('refundsExchanges.forms.quantity')} type="number" min="0" max={getEligibleQuantity(item)} step="0.01" value={item.quantity} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'quantity', event.target.value)} />
                                        <Input label={t('refundsExchanges.forms.unitPrice')} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'unitPrice', event.target.value)} />
                                        <Select label={t('refundsExchanges.forms.disposition')} value={item.returnDisposition} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'returnDisposition', event.target.value)} options={['RETURN_TO_STOCK', 'QUARANTINE', 'SCRAP', 'SUPPLIER_CLAIM'].map((value) => ({ value, label: t(`refundsExchanges.enums.disposition.${value}`) }))} placeholder={t('refundsExchanges.forms.disposition')} />
                                        <Select label={t('refundsExchanges.forms.storageLocation')} value={item.storageLocationId} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'storageLocationId', event.target.value)} options={storageLocationOptions} placeholder={t('refundsExchanges.forms.optionalLocation')} />
                                        <Select label={t('refundsExchanges.forms.batch')} value={item.batchId} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'batchId', event.target.value)} options={batchOptions} placeholder={t('refundsExchanges.forms.optionalBatch')} className="xl:col-span-2" />
                                        <Input label={t('refundsExchanges.forms.lineReason')} value={item.reason} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'reason', event.target.value)} placeholder={t('refundsExchanges.forms.lineReasonPlaceholder')} className="xl:col-span-2" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('refundsExchanges.forms.serialNumbers')}</label>
                                        <textarea value={item.serialNumbers} onChange={(event) => handleRefundItemChange(item.salesOrderItemId, 'serialNumbers', event.target.value)} rows={2} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('refundsExchanges.forms.serialNumbersPlaceholder')} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {createForm.refundType === 'EXCHANGE' ? (
                        <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.forms.replacementItems')}</h3>
                                    <InfoTip text={t('refundsExchanges.forms.replacementItemsInfo')} />
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setCreateForm((current) => ({ ...current, replacementItems: [...current.replacementItems, createReplacementItem()] }))}>{t('refundsExchanges.actions.addReplacement')}</Button>
                            </div>
                            {createForm.replacementItems.map((item, index) => (
                                <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('refundsExchanges.forms.replacementLine', { value: index + 1 })}</div>
                                        {createForm.replacementItems.length > 1 ? <Button size="sm" variant="ghost" onClick={() => setCreateForm((current) => ({ ...current, replacementItems: current.replacementItems.filter((currentItem) => currentItem.id !== item.id) }))}>{t('refundsExchanges.actions.remove')}</Button> : null}
                                    </div>
                                    <ProductVariantLookup label={t('refundsExchanges.forms.variant')} placeholder={t('refundsExchanges.forms.variantPlaceholder')} selectedVariant={item.variant} onSelect={(variant) => handleReplacementItemChange(item.id, 'variant', variant)} />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <Input label={t('refundsExchanges.forms.quantity')} type="number" min="0.000001" step="0.01" value={item.quantity} onChange={(event) => handleReplacementItemChange(item.id, 'quantity', event.target.value)} />
                                        <Input label={t('refundsExchanges.forms.unitPrice')} type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => handleReplacementItemChange(item.id, 'unitPrice', event.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>{t('refundsExchanges.actions.close')}</Button>
                        <Button type="submit" loading={actionLoading === 'create'}>{t('refundsExchanges.actions.save')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RefundsExchanges;
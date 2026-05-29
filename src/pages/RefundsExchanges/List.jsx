import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    InfoTip,
    Input,
    MetricCard,
    Select,
} from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getCustomers } from '../../services/customerService';
import { getSalesRefunds } from '../../services/salesRefundService';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    REFUND_METHODS,
    REFUND_STATUSES,
    REFUND_TYPES,
    getRefundStatusVariant,
    getRefundTypeVariant,
    toList,
} from './constants';

const RefundsExchangesList = () => {
    const navigate = useNavigate();
    const { t, formatNumber, formatCurrency, formatDateTime } = useLanguage();

    const [refunds, setRefunds] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ customerId: '', status: '', type: '', query: '' });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadPage = async () => {
        try {
            setLoading(true);
            const [refundData, customerData] = await Promise.all([
                getSalesRefunds({ page: 0, size: 100 }),
                getCustomers(),
            ]);
            setRefunds(toList(refundData));
            setCustomers(toList(customerData));
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPage();
    }, []);

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

    const customerOptions = useMemo(
        () => customers.map((customer) => ({ value: customer.id, label: customer.name })),
        [customers]
    );

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
                            <Input
                                placeholder={t('refundsExchanges.filters.searchPlaceholder')}
                                value={filters.query}
                                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                                className="min-w-[240px]"
                            />
                            <Select
                                value={filters.customerId}
                                onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))}
                                options={customerOptions}
                                placeholder={t('refundsExchanges.filters.customer')}
                                className="min-w-[220px]"
                            />
                            <Select
                                value={filters.status}
                                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                                options={REFUND_STATUSES.map((value) => ({ value, label: t(`refundsExchanges.enums.status.${value}`) }))}
                                placeholder={t('refundsExchanges.filters.status')}
                                className="min-w-[220px]"
                            />
                            <Select
                                value={filters.type}
                                onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                                options={REFUND_TYPES.map((value) => ({ value, label: t(`refundsExchanges.enums.type.${value}`) }))}
                                placeholder={t('refundsExchanges.filters.type')}
                                className="min-w-[220px]"
                            />
                            <Button variant="secondary" icon="sync" onClick={loadPage}>{t('refundsExchanges.actions.refresh')}</Button>
                            <Button icon="currency_exchange" onClick={() => navigate('/refunds-exchanges/new')}>{t('refundsExchanges.actions.create')}</Button>
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

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title={t('refundsExchanges.register.title')}
                    subtitle={t('refundsExchanges.register.subtitle')}
                    action={<InfoTip text={t('refundsExchanges.register.info')} />}
                >
                    <DataTable
                        columns={columns}
                        data={filteredRefunds}
                        loading={loading}
                        emptyMessage={t('refundsExchanges.register.empty')}
                        onRowClick={(row) => navigate(`/refunds-exchanges/${row.id}`)}
                    />
                </Card>
            </div>
        </div>
    );
};

export default RefundsExchangesList;

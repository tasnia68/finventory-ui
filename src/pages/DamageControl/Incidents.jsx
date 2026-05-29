import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    Input,
    Select,
} from '../../components/common';
import { useLanguage } from '../../contexts/LanguageContext';
import { getDamageRecords } from '../../services/damageControlService';
import { getWarehouses } from '../../services/warehouseService';
import {
    DAMAGE_STATUSES,
    formatDecimal,
    getDamageStatusVariant,
    toList,
} from './constants';

const Incidents = () => {
    const navigate = useNavigate();
    const { t, formatNumber, formatDateTime } = useLanguage();

    const [records, setRecords] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ warehouseId: '', status: '', fromDate: '', toDate: '' });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadRecords = async (activeFilters = filters) => {
        try {
            setLoading(true);
            const params = {
                warehouseId: activeFilters.warehouseId || undefined,
                status: activeFilters.status || undefined,
                fromDate: activeFilters.fromDate || undefined,
                toDate: activeFilters.toDate || undefined,
                page: 0,
                size: 100,
            };
            const [recordData, warehouseData] = await Promise.all([
                getDamageRecords(params),
                getWarehouses(),
            ]);
            setRecords(toList(recordData));
            setWarehouses(toList(warehouseData));
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, []);

    const warehouseOptions = useMemo(
        () => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
        [warehouses],
    );

    const applyFilters = () => loadRecords(filters);

    const resetFilters = () => {
        const cleared = { warehouseId: '', status: '', fromDate: '', toDate: '' };
        setFilters(cleared);
        loadRecords(cleared);
    };

    const columns = [
        {
            key: 'recordNumber',
            header: t('damageControl.columns.record'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t(`damageControl.enums.source.${row.sourceType}`)} • {row.warehouseName}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: t('damageControl.columns.status'),
            render: (value) => <Badge variant={getDamageStatusVariant(value)}>{t(`damageControl.enums.status.${value}`)}</Badge>,
        },
        {
            key: 'reasonCode',
            header: t('damageControl.columns.reason'),
            render: (value) => t(`damageControl.enums.reason.${value}`),
        },
        {
            key: 'items',
            header: t('damageControl.columns.quantity'),
            render: (value) => formatDecimal(value?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0, formatNumber),
        },
        {
            key: 'supplierClaimNumber',
            header: t('damageControl.columns.claim'),
            render: (value) => value
                ? <Badge variant="primary">{value}</Badge>
                : <span className="text-slate-400">{t('damageControl.labels.none')}</span>,
        },
        {
            key: 'createdAt',
            header: t('damageControl.columns.created'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
    ];

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('damageControl.register.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('damageControl.register.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" icon="sync" onClick={() => loadRecords(filters)}>
                        {t('damageControl.actions.refresh')}
                    </Button>
                    <Button icon="add_circle" onClick={() => navigate('/damage-control/incidents/new')}>
                        {t('damageControl.actions.logIncident')}
                    </Button>
                </div>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <Card title={t('damageControl.filters.title')} subtitle={t('damageControl.filters.subtitle')}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <Select
                        label={t('damageControl.filters.warehouse')}
                        value={filters.warehouseId}
                        onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
                        options={warehouseOptions}
                        placeholder={t('damageControl.filters.allWarehouses')}
                    />
                    <Select
                        label={t('damageControl.filters.status')}
                        value={filters.status}
                        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        options={DAMAGE_STATUSES.map((status) => ({ value: status, label: t(`damageControl.enums.status.${status}`) }))}
                        placeholder={t('damageControl.filters.allStatuses')}
                    />
                    <Input
                        label={t('damageControl.filters.fromDate')}
                        type="date"
                        value={filters.fromDate}
                        onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
                    />
                    <Input
                        label={t('damageControl.filters.toDate')}
                        type="date"
                        value={filters.toDate}
                        onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
                    />
                    <div className="flex items-end gap-3 xl:col-span-2">
                        <Button variant="secondary" fullWidth onClick={resetFilters}>{t('damageControl.actions.resetFilters')}</Button>
                        <Button fullWidth onClick={applyFilters}>{t('damageControl.actions.applyFilters')}</Button>
                    </div>
                </div>
            </Card>

            <Card padding="none" className="overflow-hidden">
                <DataTable
                    columns={columns}
                    data={records}
                    loading={loading}
                    emptyMessage={t('damageControl.register.empty')}
                    onRowClick={(row) => navigate(`/damage-control/incidents/${row.id}`)}
                />
            </Card>
        </div>
    );
};

export default Incidents;

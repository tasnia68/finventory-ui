import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBatches, getExpiringBatches, getExpiredBatches } from '../../services/batchService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, ProductVariantLookup, Select } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';
import ExpiryModal from './ExpiryModal';

const VIEW_OPTIONS = [
    { value: 'RISK_WINDOW', label: 'Expiry risk window' },
    { value: 'EXPIRED', label: 'Expired only' },
    { value: 'VARIANT_REGISTER', label: 'Single variant register' },
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
    return date.toLocaleDateString();
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const mergeUniqueById = (...groups) => {
    const items = groups.flat();
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
};

const getBatchHealth = (expiryDate) => {
    if (!expiryDate) {
        return { label: 'No expiry', variant: 'default', daysRemaining: null };
    }

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: 'Expired', variant: 'danger', daysRemaining: diffDays };
    }
    if (diffDays <= 30) {
        return { label: 'Expiring', variant: 'warning', daysRemaining: diffDays };
    }
    return { label: 'Healthy', variant: 'success', daysRemaining: diffDays };
};

const BatchesList = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [, setExpiringBatches] = useState([]);
    const [, setExpiredBatches] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({
        view: 'RISK_WINDOW',
        days: 30,
    });
    const [showExpiryModal, setShowExpiryModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    useEffect(() => {
        loadOverview();
    }, []);

    useEffect(() => {
        loadBatchRegister();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.view, filters.days, selectedVariant]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadOverview = async (days = filters.days) => {
        try {
            const [expiringData, expiredData] = await Promise.all([
                getExpiringBatches(days),
                getExpiredBatches(),
            ]);
            setExpiringBatches(toList(expiringData));
            setExpiredBatches(toList(expiredData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load batch overview');
        }
    };

    const loadBatchRegister = async () => {
        try {
            setLoading(true);

            if (filters.view === 'VARIANT_REGISTER') {
                if (!selectedVariant?.id) {
                    setBatches([]);
                    return;
                }
                const data = await getBatches({ productVariantId: selectedVariant.id });
                setBatches(toList(data));
                return;
            }

            if (filters.view === 'EXPIRED') {
                const data = await getExpiredBatches();
                setBatches(toList(data));
                return;
            }

            const [expiringData, expiredData] = await Promise.all([
                getExpiringBatches(filters.days || 30),
                getExpiredBatches(),
            ]);
            const expiringList = toList(expiringData);
            const expiredList = toList(expiredData);
            setExpiringBatches(expiringList);
            setExpiredBatches(expiredList);
            setBatches(mergeUniqueById(expiringList, expiredList));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadOverview(filters.days);
        await loadBatchRegister();
    };

    const openExpiryModal = (batch) => {
        setSelectedBatch(batch);
        setShowExpiryModal(true);
    };

    const handleExpiryUpdated = async () => {
        setShowExpiryModal(false);
        showAlert('success', 'Batch dating updated successfully');
        await handleRefresh();
    };

    const summary = useMemo(() => {
        const visible = batches.length;
        const expired = batches.filter((batch) => getBatchHealth(batch.expiryDate).label === 'Expired').length;
        const expiring = batches.filter((batch) => getBatchHealth(batch.expiryDate).label === 'Expiring').length;
        const nextToExpire = [...batches]
            .filter((batch) => batch.expiryDate)
            .sort((left, right) => new Date(left.expiryDate).getTime() - new Date(right.expiryDate).getTime())[0];

        return { visible, expired, expiring, nextToExpire };
    }, [batches]);

    const columns = [
        {
            key: 'batchNumber',
            header: 'Batch',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || row.id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Variant: {selectedVariant?.sku || row.productVariantId}</div>
                </div>
            ),
        },
        {
            key: 'manufacturingDate',
            header: 'Manufactured',
            render: (value) => formatDate(value),
        },
        {
            key: 'expiryDate',
            header: 'Expiry',
            render: (value) => formatDate(value),
        },
        {
            key: 'status',
            header: 'Health',
            render: (value, row) => {
                const health = getBatchHealth(row.expiryDate);
                return (
                    <div className="space-y-1">
                        <Badge variant={health.variant}>{health.label}</Badge>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {health.daysRemaining === null ? 'No shelf-life rule recorded' : `${health.daysRemaining} day(s)`}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" size="sm" icon="visibility" onClick={() => navigate(`/batches/${row.id}`)}>
                        View
                    </Button>
                    <Button variant="secondary" size="sm" icon="edit" onClick={() => openExpiryModal(row)}>
                        Update
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title="Batch control with expiry risk visibility."
                description="Monitor near-expiry lots, review traceability history, and correct shelf-life data without jumping between screens."
                info="Use the risk window for expiry surveillance and switch to a variant register when QA or recall workflows need one SKU at a time."
                actions={<Button icon="sync" onClick={handleRefresh}>Refresh</Button>}
                badgeTone="amber"
            />

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Visible Batches" value={formatNumber(summary.visible)} caption="Lots in the active workspace" icon="inventory_2" tone="blue" />
                <MetricCard title="Expiring Soon" value={formatNumber(summary.expiring)} caption={`Within the next ${filters.days} day(s)`} icon="schedule" tone="amber" />
                <MetricCard title="Expired Lots" value={formatNumber(summary.expired)} caption="Requires review, quarantine, or disposal" icon="warning" tone="rose" />
                <MetricCard title="Next Expiry" value={summary.nextToExpire?.batchNumber || 'None'} caption={summary.nextToExpire ? formatDate(summary.nextToExpire.expiryDate) : 'No dated batches in scope'} icon="event_upcoming" tone="violet" />
            </div>

            <Card
                title="Batch Workspace"
                subtitle="Choose whether you are reviewing expiry risk or drilling into one variant register."
                action={<InfoTip text="The backend only exposes full register lookup by variant. Risk views use dedicated expiring and expired endpoints." />}
            >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <Select
                        label="Workspace"
                        value={filters.view}
                        onChange={(event) => setFilters((current) => ({ ...current, view: event.target.value }))}
                        options={VIEW_OPTIONS}
                    />
                    <Input
                        label="Risk horizon (days)"
                        type="number"
                        value={filters.days}
                        onChange={(event) => setFilters((current) => ({ ...current, days: event.target.value }))}
                        disabled={filters.view !== 'RISK_WINDOW'}
                    />
                    <ProductVariantLookup
                        label="Variant register"
                        selectedVariant={selectedVariant}
                        onSelect={setSelectedVariant}
                        className="lg:col-span-2"
                    />
                </div>
            </Card>

            <Card
                padding="none"
                className="overflow-hidden"
                title="Batch Register"
                subtitle={filters.view === 'VARIANT_REGISTER' && !selectedVariant ? 'Select a product variant to load its batch register.' : 'Batch dating and risk review'}
            >
                <DataTable
                    columns={columns}
                    data={batches}
                    loading={loading}
                    emptyMessage={filters.view === 'VARIANT_REGISTER' && !selectedVariant ? 'Choose a product variant to load batch records.' : 'No batches found for the current workspace.'}
                    onRowClick={(row) => navigate(`/batches/${row.id}`)}
                />
            </Card>

            <Card title="Operational Notes" subtitle="Use the risk view for proactive review and the variant register for traceability work.">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Risk window</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shows expiring and expired lots together so planners can act before customer allocations are affected.</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Variant register</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Best for investigations, QA holds, and recall prep because it isolates one SKU's full lot history.</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">History review</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use movement history before changing dates so operational records remain defensible for audit and traceability.</div>
                    </div>
                </div>
            </Card>

            <ExpiryModal
                isOpen={showExpiryModal}
                onClose={() => setShowExpiryModal(false)}
                batch={selectedBatch}
                onUpdated={handleExpiryUpdated}
            />
        </CatalogPageFrame>
    );
};

export default BatchesList;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    InfoTip,
    MetricCard,
} from '../../components/common';
import ProcurementHero from '../../components/procurement/ProcurementHero';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import {
    getDamageRecords,
    getDamageSummary,
    getSupplierClaimsForGoodsReceipt,
} from '../../services/damageControlService';
import {
    formatDecimal,
    getClaimStatusVariant,
    getDamageStatusVariant,
    sumClaimQuantity,
    sumRejectedQuantity,
    toList,
} from './constants';
import ReceivingModal from './Sections/ReceivingModal';

const Overview = () => {
    const navigate = useNavigate();
    const { t, formatNumber, formatDateTime } = useLanguage();

    const [damageRecords, setDamageRecords] = useState([]);
    const [damageSummary, setDamageSummary] = useState(null);
    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claimsLoading, setClaimsLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showReceivingModal, setShowReceivingModal] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [recordData, summaryData, goodsReceiptData] = await Promise.all([
                getDamageRecords({ page: 0, size: 20 }),
                getDamageSummary({}),
                getGoodsReceiptNotes({ page: 0, size: 100 }),
            ]);

            const nextRecords = toList(recordData);
            const nextGoodsReceipts = toList(goodsReceiptData).filter((goodsReceipt) => ['VERIFIED', 'COMPLETED'].includes(goodsReceipt.status));

            setDamageRecords(nextRecords);
            setDamageSummary(summaryData || null);
            setGoodsReceipts(nextGoodsReceipts);

            setClaimsLoading(true);
            const receivingCandidates = nextGoodsReceipts.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0);
            const claimResponses = await Promise.all(receivingCandidates.map(async (goodsReceipt) => {
                try {
                    const claimData = await getSupplierClaimsForGoodsReceipt(goodsReceipt.id);
                    return toList(claimData).map((claim) => ({ ...claim, goodsReceipt }));
                } catch (error) {
                    return [];
                }
            }));
            setClaims(claimResponses.flat());
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.loadFailed'));
        } finally {
            setLoading(false);
            setClaimsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const receivingCandidates = useMemo(
        () => goodsReceipts.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0),
        [goodsReceipts],
    );

    const claimTotals = useMemo(() => {
        const openClaims = claims.filter((claim) => claim.status === 'OPEN').length;
        const returnRequested = claims.filter((claim) => claim.status === 'RETURN_REQUESTED').length;
        const quantity = claims.reduce((sum, claim) => sum + sumClaimQuantity(claim), 0);
        const value = claims.reduce((sum, claim) => sum + (claim.items?.reduce((claimSum, item) => claimSum + Number(item.claimedAmount || 0), 0) || 0), 0);
        return { openClaims, returnRequested, quantity, value };
    }, [claims]);

    const recentIncidentColumns = [
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
            key: 'items',
            header: t('damageControl.columns.quantity'),
            render: (value) => formatDecimal(value?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0, formatNumber),
        },
        {
            key: 'createdAt',
            header: t('damageControl.columns.created'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
    ];

    const receivingColumns = [
        {
            key: 'grnNumber',
            header: t('damageControl.columns.receipt'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.supplierName} • {row.warehouseName}</div>
                </div>
            ),
        },
        {
            key: 'items',
            header: t('damageControl.columns.rejectedQuantity'),
            render: (_, row) => <Badge variant="warning">{formatNumber(sumRejectedQuantity(row))}</Badge>,
        },
        {
            key: 'receivedDate',
            header: t('damageControl.columns.receivedDate'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
    ];

    const claimsColumns = [
        {
            key: 'claimNumber',
            header: t('damageControl.columns.claimNumber'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.goodsReceiptNoteNumber} • {row.supplierName}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: t('damageControl.columns.status'),
            render: (value) => <Badge variant={getClaimStatusVariant(value)}>{t(`damageControl.enums.claimStatus.${value}`)}</Badge>,
        },
        {
            key: 'items',
            header: t('damageControl.columns.claimedQuantity'),
            render: (_, row) => formatNumber(sumClaimQuantity(row)),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background-light p-4 sm:p-6 lg:p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6 sm:gap-8">
                <ProcurementHero
                    eyebrow={t('damageControl.eyebrow')}
                    title={t('damageControl.title')}
                    description={t('damageControl.description')}
                    actions={(
                        <>
                            <Button variant="secondary" icon="sync" onClick={loadData}>
                                {t('damageControl.actions.refresh')}
                            </Button>
                            <Button variant="secondary" icon="local_shipping" onClick={() => navigate('/damage-control/claims/new')}>
                                {t('damageControl.actions.fileClaim')}
                            </Button>
                            <Button
                                variant="secondary"
                                icon="warehouse"
                                onClick={() => setShowReceivingModal(true)}
                                disabled={receivingCandidates.length === 0}
                            >
                                {t('damageControl.actions.captureReceivingDamage')}
                            </Button>
                            <Button icon="add_circle" onClick={() => navigate('/damage-control/incidents/new')}>
                                {t('damageControl.actions.logIncident')}
                            </Button>
                        </>
                    )}
                    accent="from-rose-500/15 via-transparent to-amber-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard title={t('damageControl.metrics.records')} value={formatNumber(damageSummary?.totalRecords || 0)} icon="inventory" tone="blue" info={t('damageControl.metricInfo.records')} caption={t('damageControl.metricCaption.records')} />
                    <MetricCard title={t('damageControl.metrics.pendingApproval')} value={formatNumber(damageSummary?.pendingApprovalRecords || 0)} icon="approval_delegation" tone="amber" info={t('damageControl.metricInfo.pendingApproval')} caption={t('damageControl.metricCaption.pendingApproval')} />
                    <MetricCard title={t('damageControl.metrics.quarantine')} value={formatDecimal(damageSummary?.quarantineQuantity || 0, formatNumber)} icon="shield" tone="violet" info={t('damageControl.metricInfo.quarantine')} caption={t('damageControl.metricCaption.quarantine')} />
                    <MetricCard title={t('damageControl.metrics.writeOff')} value={formatDecimal(damageSummary?.writeOffQuantity || 0, formatNumber)} icon="delete_forever" tone="rose" info={t('damageControl.metricInfo.writeOff')} caption={t('damageControl.metricCaption.writeOff')} />
                    <MetricCard title={t('damageControl.metrics.openClaims')} value={formatNumber(claimTotals.openClaims)} icon="receipt_long" tone="emerald" info={t('damageControl.metricInfo.openClaims')} caption={t('damageControl.metricCaption.openClaims')} />
                </div>

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title={t('damageControl.register.title')}
                    subtitle={t('damageControl.register.subtitle')}
                    action={(
                        <Button size="sm" variant="ghost" onClick={() => navigate('/damage-control/incidents')}>
                            {t('damageControl.actions.applyFilters') /* reuse generic label or replace via t key; placeholder navigates */}
                        </Button>
                    )}
                >
                    <DataTable
                        columns={recentIncidentColumns}
                        data={damageRecords.slice(0, 8)}
                        loading={loading}
                        emptyMessage={t('damageControl.register.empty')}
                        onRowClick={(row) => navigate(`/damage-control/incidents/${row.id}`)}
                    />
                </Card>

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title={t('damageControl.receiving.title')}
                    subtitle={t('damageControl.receiving.subtitle')}
                    action={<InfoTip text={t('damageControl.receiving.info')} />}
                >
                    <DataTable
                        columns={receivingColumns}
                        data={receivingCandidates.slice(0, 8)}
                        loading={loading}
                        emptyMessage={t('damageControl.receiving.empty')}
                        onRowClick={() => navigate('/damage-control/receiving')}
                    />
                </Card>

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title={t('damageControl.claims.title')}
                    subtitle={t('damageControl.claims.subtitle')}
                    action={<InfoTip text={t('damageControl.claims.info')} />}
                >
                    <DataTable
                        columns={claimsColumns}
                        data={claims.slice(0, 8)}
                        loading={claimsLoading}
                        emptyMessage={t('damageControl.claims.empty')}
                        onRowClick={(row) => navigate(`/damage-control/claims/${row.id}`)}
                    />
                </Card>
            </div>

            <ReceivingModal
                isOpen={showReceivingModal}
                onClose={() => setShowReceivingModal(false)}
                receivingCandidates={receivingCandidates}
                onAlert={showAlert}
                onCreated={(created) => {
                    loadData();
                    if (created?.id) navigate(`/damage-control/incidents/${created.id}`);
                }}
            />
        </div>
    );
};

export default Overview;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
} from '../../components/common';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import {
    createSupplierReturnFromClaim,
    getSupplierClaimsForGoodsReceipt,
} from '../../services/damageControlService';
import {
    getClaimStatusVariant,
    sumClaimQuantity,
    sumRejectedQuantity,
    toList,
} from './constants';

const Claims = () => {
    const navigate = useNavigate();
    const { t, formatNumber, formatDateTime } = useLanguage();

    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [actionLoading, setActionLoading] = useState('');
    const [hasReceivingCandidates, setHasReceivingCandidates] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadClaims = async () => {
        try {
            setLoading(true);
            const goodsReceiptData = await getGoodsReceiptNotes({ page: 0, size: 100 });
            const list = toList(goodsReceiptData).filter((goodsReceipt) => ['VERIFIED', 'COMPLETED'].includes(goodsReceipt.status));
            const receivingCandidates = list.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0);
            setHasReceivingCandidates(receivingCandidates.length > 0);

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
        }
    };

    useEffect(() => {
        loadClaims();
    }, []);

    const handleCreateSupplierReturn = async (claimId) => {
        try {
            setActionLoading(`return-${claimId}`);
            await createSupplierReturnFromClaim(claimId);
            showAlert('success', t('damageControl.messages.returnCreated'));
            await loadClaims();
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.returnCreateFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const columns = [
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
            key: 'claimType',
            header: t('damageControl.columns.claimType'),
            render: (value) => t(`damageControl.enums.claimType.${value}`),
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
        {
            key: 'claimedAt',
            header: t('damageControl.columns.claimedAt'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
        {
            key: 'supplierReturnNumber',
            header: t('damageControl.columns.supplierReturn'),
            render: (value, row) => (
                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    {value
                        ? <Badge variant="success">{value}</Badge>
                        : <span className="text-slate-400">{t('damageControl.labels.none')}</span>}
                    {!value && row.status === 'OPEN' ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            loading={actionLoading === `return-${row.id}`}
                            onClick={() => handleCreateSupplierReturn(row.id)}
                        >
                            {t('damageControl.actions.createReturn')}
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('damageControl.claims.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('damageControl.claims.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" icon="sync" onClick={loadClaims}>
                        {t('damageControl.actions.refresh')}
                    </Button>
                    <Button
                        icon="local_shipping"
                        onClick={() => navigate('/damage-control/claims/new')}
                        disabled={!hasReceivingCandidates}
                    >
                        {t('damageControl.actions.fileClaim')}
                    </Button>
                </div>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <Card padding="none" className="overflow-hidden">
                <DataTable
                    columns={columns}
                    data={claims}
                    loading={loading}
                    emptyMessage={t('damageControl.claims.empty')}
                    onRowClick={(row) => navigate(`/damage-control/claims/${row.id}`)}
                />
            </Card>
        </div>
    );
};

export default Claims;

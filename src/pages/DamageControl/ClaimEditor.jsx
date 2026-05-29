import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
} from '../../components/common';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import {
    createSupplierClaim,
    createSupplierReturnFromClaim,
    getDamageRecords,
    getSupplierClaim,
} from '../../services/damageControlService';
import {
    createClaimItems,
    createInitialClaimForm,
    getClaimStatusVariant,
    sumClaimQuantity,
    sumRejectedQuantity,
    toList,
} from './constants';
import ClaimBasicsCard from './Sections/ClaimBasicsCard';
import ClaimItemsCard from './Sections/ClaimItemsCard';

const ClaimEditor = () => {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const id = params.id || null;
    const mode = id ? 'edit' : 'create';
    const { t, formatNumber, formatDateTime } = useLanguage();

    const [form, setForm] = useState(createInitialClaimForm());
    const [claim, setClaim] = useState(null);
    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [damageRecords, setDamageRecords] = useState([]);
    const [loading, setLoading] = useState(mode === 'edit');
    const [refLoading, setRefLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    // Load reference data (goods receipts + damage records) for create mode
    useEffect(() => {
        let cancelled = false;
        const loadRef = async () => {
            try {
                setRefLoading(true);
                const [goodsReceiptData, damageData] = await Promise.all([
                    getGoodsReceiptNotes({ page: 0, size: 100 }),
                    getDamageRecords({ page: 0, size: 100 }),
                ]);
                if (cancelled) return;
                const list = toList(goodsReceiptData).filter((goodsReceipt) => ['VERIFIED', 'COMPLETED'].includes(goodsReceipt.status));
                setGoodsReceipts(list);
                setDamageRecords(toList(damageData));
            } catch (error) {
                if (!cancelled) showAlert('error', error.message || t('damageControl.messages.loadFailed'));
            } finally {
                if (!cancelled) setRefLoading(false);
            }
        };
        loadRef();
        return () => { cancelled = true; };
    }, []);

    const receivingCandidates = useMemo(
        () => goodsReceipts.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0),
        [goodsReceipts],
    );

    // Preselect goods receipt from query string or first candidate (create mode)
    useEffect(() => {
        if (mode !== 'create' || refLoading) return;
        if (form.goodsReceiptNoteId) return;
        const preferredId = searchParams.get('goodsReceiptId');
        const target = (preferredId && receivingCandidates.find((goodsReceipt) => goodsReceipt.id === preferredId))
            || receivingCandidates[0]
            || null;
        if (target) {
            setForm(createInitialClaimForm(target));
        }
    }, [mode, refLoading, receivingCandidates, searchParams, form.goodsReceiptNoteId]);

    const loadClaim = async () => {
        if (mode !== 'edit' || !id) return;
        try {
            setLoading(true);
            const data = await getSupplierClaim(id);
            setClaim(data);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.detailFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClaim();
    }, [id, mode]);

    const currentClaimReceipt = useMemo(
        () => receivingCandidates.find((goodsReceipt) => goodsReceipt.id === form.goodsReceiptNoteId) || null,
        [receivingCandidates, form.goodsReceiptNoteId],
    );

    const relatedDamageRecords = useMemo(() => {
        if (!currentClaimReceipt) return [];
        return damageRecords.filter((record) => record.sourceType === 'RECEIVING' && record.reference === currentClaimReceipt.grnNumber);
    }, [currentClaimReceipt, damageRecords]);

    const handleReceiptChange = (goodsReceiptNoteId) => {
        const next = receivingCandidates.find((goodsReceipt) => goodsReceipt.id === goodsReceiptNoteId) || null;
        setForm({
            goodsReceiptNoteId,
            damageRecordId: '',
            claimType: 'REJECTED_RECEIPT',
            reason: '',
            notes: '',
            items: createClaimItems(next),
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validItems = form.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
                goodsReceiptNoteItemId: item.goodsReceiptNoteItemId,
                quantity: Number(item.quantity),
                reason: item.reason || null,
            }));

        if (!form.goodsReceiptNoteId || validItems.length === 0) {
            showAlert('error', t('damageControl.messages.claimItemRequired'));
            return;
        }

        try {
            setSaving(true);
            const created = await createSupplierClaim(form.goodsReceiptNoteId, {
                damageRecordId: form.damageRecordId || null,
                claimType: form.damageRecordId ? 'DAMAGED_RECEIPT' : form.claimType,
                reason: form.reason || null,
                notes: form.notes || null,
                items: validItems,
            });
            showAlert('success', t('damageControl.messages.claimCreated'));
            if (created?.id) {
                navigate(`/damage-control/claims/${created.id}`);
            } else {
                navigate('/damage-control/claims');
            }
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.claimCreateFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleCreateReturn = async () => {
        if (!id) return;
        try {
            setActionLoading('return');
            await createSupplierReturnFromClaim(id);
            showAlert('success', t('damageControl.messages.returnCreated'));
            await loadClaim();
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.returnCreateFailed'));
        } finally {
            setActionLoading('');
        }
    };

    if (mode === 'edit' && loading && !claim) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
        );
    }

    if (mode === 'edit') {
        return (
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{claim?.claimNumber || t('damageControl.claims.title')}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {claim?.goodsReceiptNoteNumber} • {claim?.supplierName}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => navigate('/damage-control/claims')}>
                            {t('damageControl.actions.close')}
                        </Button>
                        {claim?.status === 'OPEN' && !claim?.supplierReturnNumber ? (
                            <Button loading={actionLoading === 'return'} onClick={handleCreateReturn}>
                                {t('damageControl.actions.createReturn')}
                            </Button>
                        ) : null}
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                {claim ? (
                    <>
                        <Card title={t('damageControl.detail.title')} subtitle={claim.claimNumber}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.columns.status')}</div>
                                    <div className="mt-2">
                                        <Badge variant={getClaimStatusVariant(claim.status)}>{t(`damageControl.enums.claimStatus.${claim.status}`)}</Badge>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.columns.claimType')}</div>
                                    <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{t(`damageControl.enums.claimType.${claim.claimType}`)}</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.columns.claimedQuantity')}</div>
                                    <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatNumber(sumClaimQuantity(claim))}</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.columns.claimedAt')}</div>
                                    <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{claim.claimedAt ? formatDateTime(claim.claimedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:col-span-2">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.columns.supplierReturn')}</div>
                                    <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                                        {claim.supplierReturnNumber
                                            ? <Badge variant="success">{claim.supplierReturnNumber}</Badge>
                                            : t('damageControl.labels.none')}
                                    </div>
                                </div>
                                {claim.reason ? (
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:col-span-2">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.forms.claimReason')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{claim.reason}</div>
                                    </div>
                                ) : null}
                                {claim.notes ? (
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:col-span-2">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.forms.notes')}</div>
                                        <div className="mt-2 text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{claim.notes}</div>
                                    </div>
                                ) : null}
                            </div>
                        </Card>

                        <Card title={t('damageControl.forms.claimLines')} subtitle={t('damageControl.forms.claimLinesInfo')}>
                            <div className="space-y-3">
                                {claim.items?.map((item) => (
                                    <div
                                        key={item.id || item.goodsReceiptNoteItemId}
                                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku}</div>
                                                {item.reason ? (
                                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.reason}</div>
                                                ) : null}
                                            </div>
                                            <Badge variant="default">{formatNumber(item.quantity)}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </>
                ) : null}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('damageControl.forms.claimTitle')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('damageControl.claims.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/damage-control/claims')}>
                        {t('damageControl.actions.close')}
                    </Button>
                    <Button type="submit" loading={saving} disabled={refLoading}>
                        {t('damageControl.actions.saveClaim')}
                    </Button>
                </div>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <ClaimBasicsCard
                form={form}
                setForm={setForm}
                receivingCandidates={receivingCandidates}
                relatedDamageRecords={relatedDamageRecords}
                onReceiptChange={handleReceiptChange}
            />
            <ClaimItemsCard form={form} setForm={setForm} />

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="secondary" onClick={() => navigate('/damage-control/claims')}>
                    {t('damageControl.actions.cancel')}
                </Button>
                <Button type="submit" loading={saving} disabled={refLoading}>
                    {t('damageControl.actions.saveClaim')}
                </Button>
            </div>
        </form>
    );
};

export default ClaimEditor;

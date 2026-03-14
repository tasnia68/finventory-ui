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
import ProcurementHero from '../../components/procurement/ProcurementHero';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import { getWarehouses } from '../../services/warehouseService';
import {
    approveDamageRecord,
    cancelDamageRecord,
    confirmDamageRecord,
    createDamageRecord,
    createDamageRecordFromGoodsReceipt,
    createSupplierClaim,
    createSupplierReturnFromClaim,
    deleteDamageDocument,
    getDamageDocumentFile,
    getDamageDocuments,
    getDamageRecord,
    getDamageRecords,
    getDamageSummary,
    getSupplierClaimsForGoodsReceipt,
    rejectDamageRecord,
    submitDamageRecordForApproval,
    uploadDamageDocument,
} from '../../services/damageControlService';
import { useLanguage } from '../../contexts/LanguageContext';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const createIncidentItem = () => ({
    id: crypto.randomUUID(),
    variant: null,
    quantity: '',
    disposition: 'QUARANTINE',
    serialNumbers: '',
});

const formatDecimal = (value, formatNumber) => formatNumber(Number(value || 0), { maximumFractionDigits: 2 });

const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

const getDamageStatusVariant = (status) => {
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

const getDispositionVariant = (value) => (value === 'WRITE_OFF' ? 'danger' : 'warning');

const getClaimStatusVariant = (status) => {
    switch (status) {
        case 'RETURN_REQUESTED':
            return 'warning';
        case 'RESOLVED':
            return 'success';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'primary';
    }
};

const sumRejectedQuantity = (goodsReceipt) => goodsReceipt.items?.reduce((sum, item) => sum + Number(item.rejectedQuantity || 0), 0) || 0;
const sumClaimQuantity = (claim) => claim.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

const DamageControl = () => {
    const { t, formatNumber, formatDateTime } = useLanguage();
    const [damageRecords, setDamageRecords] = useState([]);
    const [damageSummary, setDamageSummary] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [claims, setClaims] = useState([]);
    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [claimsLoading, setClaimsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ warehouseId: '', status: '', fromDate: '', toDate: '' });
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [showReceivingModal, setShowReceivingModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [incidentForm, setIncidentForm] = useState({
        warehouseId: '',
        sourceType: 'WAREHOUSE',
        reasonCode: 'DAMAGED',
        reference: '',
        notes: '',
        items: [createIncidentItem()],
    });
    const [receivingForm, setReceivingForm] = useState({
        goodsReceiptNoteId: '',
        reasonCode: 'DAMAGED',
        notes: '',
        createSupplierClaim: false,
        supplierClaimReason: '',
        supplierClaimNotes: '',
        items: [],
    });
    const [claimForm, setClaimForm] = useState({
        goodsReceiptNoteId: '',
        damageRecordId: '',
        claimType: 'REJECTED_RECEIPT',
        reason: '',
        notes: '',
        items: [],
    });
    const [documentForm, setDocumentForm] = useState({ documentType: 'PHOTO', notes: '', file: null });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadPage = async (activeFilters = filters, preferredSelectedId = selectedRecordId) => {
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

            const [recordData, summaryData, warehouseData, goodsReceiptData] = await Promise.all([
                getDamageRecords(params),
                getDamageSummary(params),
                getWarehouses(),
                getGoodsReceiptNotes({ page: 0, size: 100 }),
            ]);

            const nextRecords = toList(recordData);
            const nextWarehouses = toList(warehouseData);
            const nextGoodsReceipts = toList(goodsReceiptData).filter((goodsReceipt) => ['VERIFIED', 'COMPLETED'].includes(goodsReceipt.status));

            setDamageRecords(nextRecords);
            setDamageSummary(summaryData || null);
            setWarehouses(nextWarehouses);
            setGoodsReceipts(nextGoodsReceipts);

            if (preferredSelectedId) {
                const nextSelected = nextRecords.find((record) => record.id === preferredSelectedId);
                setSelectedRecordId(nextSelected?.id || null);
            }

            setClaimsLoading(true);
            const receivingCandidates = nextGoodsReceipts.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0);
            const claimResponses = await Promise.all(receivingCandidates.map(async (goodsReceipt) => {
                try {
                    const claimData = await getSupplierClaimsForGoodsReceipt(goodsReceipt.id);
                    return toList(claimData).map((claim) => ({
                        ...claim,
                        goodsReceipt,
                    }));
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

    const loadRecordDetail = async (recordId) => {
        if (!recordId) {
            setSelectedRecord(null);
            setDocuments([]);
            return;
        }

        try {
            setDetailLoading(true);
            const [recordData, documentData] = await Promise.all([
                getDamageRecord(recordId),
                getDamageDocuments(recordId),
            ]);
            setSelectedRecord(recordData);
            setDocuments(toList(documentData));
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.detailFailed'));
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        loadPage();
    }, []);

    useEffect(() => {
        loadRecordDetail(selectedRecordId);
    }, [selectedRecordId]);

    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })), [warehouses]);

    const receivingCandidates = useMemo(() => goodsReceipts.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0), [goodsReceipts]);

    const currentReceivingReceipt = useMemo(() => receivingCandidates.find((goodsReceipt) => goodsReceipt.id === receivingForm.goodsReceiptNoteId) || null, [receivingCandidates, receivingForm.goodsReceiptNoteId]);
    const currentClaimReceipt = useMemo(() => receivingCandidates.find((goodsReceipt) => goodsReceipt.id === claimForm.goodsReceiptNoteId) || null, [receivingCandidates, claimForm.goodsReceiptNoteId]);

    const relatedDamageRecordsForClaim = useMemo(() => {
        if (!currentClaimReceipt) return [];
        return damageRecords.filter((record) => record.sourceType === 'RECEIVING' && record.reference === currentClaimReceipt.grnNumber);
    }, [currentClaimReceipt, damageRecords]);

    const createReceivingItems = (goodsReceipt) => (goodsReceipt?.items || [])
        .filter((item) => Number(item.rejectedQuantity || 0) > 0)
        .map((item) => ({
            goodsReceiptNoteItemId: item.id,
            productVariantSku: item.productVariantSku,
            rejectedQuantity: Number(item.rejectedQuantity || 0),
            quantity: String(item.rejectedQuantity || 0),
            disposition: 'QUARANTINE',
        }));

    const createClaimItems = (goodsReceipt) => (goodsReceipt?.items || [])
        .filter((item) => Number(item.rejectedQuantity || 0) > 0)
        .map((item) => ({
            goodsReceiptNoteItemId: item.id,
            productVariantSku: item.productVariantSku,
            rejectedQuantity: Number(item.rejectedQuantity || 0),
            quantity: String(item.rejectedQuantity || 0),
            reason: item.rejectionReason || '',
        }));

    const openReceivingModal = (goodsReceipt = null) => {
        const targetReceipt = goodsReceipt || receivingCandidates[0] || null;
        setReceivingForm({
            goodsReceiptNoteId: targetReceipt?.id || '',
            reasonCode: 'DAMAGED',
            notes: '',
            createSupplierClaim: false,
            supplierClaimReason: '',
            supplierClaimNotes: '',
            items: createReceivingItems(targetReceipt),
        });
        setShowReceivingModal(true);
    };

    const openClaimModal = (goodsReceipt = null) => {
        const targetReceipt = goodsReceipt || receivingCandidates[0] || null;
        setClaimForm({
            goodsReceiptNoteId: targetReceipt?.id || '',
            damageRecordId: '',
            claimType: 'REJECTED_RECEIPT',
            reason: '',
            notes: '',
            items: createClaimItems(targetReceipt),
        });
        setShowClaimModal(true);
    };

    const applyFilters = () => loadPage(filters, selectedRecordId);

    const resetFilters = () => {
        const cleared = { warehouseId: '', status: '', fromDate: '', toDate: '' };
        setFilters(cleared);
        loadPage(cleared, selectedRecordId);
    };

    const handleIncidentItemChange = (itemId, key, value) => {
        setIncidentForm((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
        }));
    };

    const handleCreateIncident = async (event) => {
        event.preventDefault();
        const validItems = incidentForm.items.filter((item) => item.variant?.id && Number(item.quantity) > 0);

        if (!incidentForm.warehouseId) {
            showAlert('error', t('damageControl.messages.warehouseRequired'));
            return;
        }

        if (validItems.length === 0) {
            showAlert('error', t('damageControl.messages.itemRequired'));
            return;
        }

        try {
            setActionLoading('create-incident');
            const payload = {
                warehouseId: incidentForm.warehouseId,
                sourceType: incidentForm.sourceType,
                reasonCode: incidentForm.reasonCode,
                reference: incidentForm.reference || null,
                notes: incidentForm.notes || null,
                items: validItems.map((item) => ({
                    productVariantId: item.variant.id,
                    quantity: Number(item.quantity),
                    disposition: item.disposition,
                    serialNumbers: item.serialNumbers
                        ? item.serialNumbers.split(/[,\n]/).map((value) => value.trim()).filter(Boolean)
                        : [],
                })),
            };
            const created = await createDamageRecord(payload);
            showAlert('success', t('damageControl.messages.incidentCreated'));
            setShowIncidentModal(false);
            setIncidentForm({
                warehouseId: '',
                sourceType: 'WAREHOUSE',
                reasonCode: 'DAMAGED',
                reference: '',
                notes: '',
                items: [createIncidentItem()],
            });
            await loadPage(filters, created.id);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.createFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleReceivingReceiptChange = (goodsReceiptNoteId) => {
        const nextReceipt = receivingCandidates.find((goodsReceipt) => goodsReceipt.id === goodsReceiptNoteId) || null;
        setReceivingForm((current) => ({
            ...current,
            goodsReceiptNoteId,
            items: createReceivingItems(nextReceipt),
        }));
    };

    const handleClaimReceiptChange = (goodsReceiptNoteId) => {
        const nextReceipt = receivingCandidates.find((goodsReceipt) => goodsReceipt.id === goodsReceiptNoteId) || null;
        setClaimForm({
            goodsReceiptNoteId,
            damageRecordId: '',
            claimType: 'REJECTED_RECEIPT',
            reason: '',
            notes: '',
            items: createClaimItems(nextReceipt),
        });
    };

    const handleCreateReceivingDamage = async (event) => {
        event.preventDefault();
        const validItems = receivingForm.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
                goodsReceiptNoteItemId: item.goodsReceiptNoteItemId,
                quantity: Number(item.quantity),
                disposition: item.disposition,
            }));

        if (!receivingForm.goodsReceiptNoteId || validItems.length === 0) {
            showAlert('error', t('damageControl.messages.receivingItemRequired'));
            return;
        }

        try {
            setActionLoading('create-receiving');
            const created = await createDamageRecordFromGoodsReceipt(receivingForm.goodsReceiptNoteId, {
                reasonCode: receivingForm.reasonCode,
                notes: receivingForm.notes || null,
                createSupplierClaim: receivingForm.createSupplierClaim,
                supplierClaimReason: receivingForm.createSupplierClaim ? receivingForm.supplierClaimReason || null : null,
                supplierClaimNotes: receivingForm.createSupplierClaim ? receivingForm.supplierClaimNotes || null : null,
                items: validItems,
            });
            showAlert('success', t('damageControl.messages.receivingCreated'));
            setShowReceivingModal(false);
            await loadPage(filters, created.id);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.receivingCreateFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleCreateClaim = async (event) => {
        event.preventDefault();
        const validItems = claimForm.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
                goodsReceiptNoteItemId: item.goodsReceiptNoteItemId,
                quantity: Number(item.quantity),
                reason: item.reason || null,
            }));

        if (!claimForm.goodsReceiptNoteId || validItems.length === 0) {
            showAlert('error', t('damageControl.messages.claimItemRequired'));
            return;
        }

        try {
            setActionLoading('create-claim');
            await createSupplierClaim(claimForm.goodsReceiptNoteId, {
                damageRecordId: claimForm.damageRecordId || null,
                claimType: claimForm.damageRecordId ? 'DAMAGED_RECEIPT' : claimForm.claimType,
                reason: claimForm.reason || null,
                notes: claimForm.notes || null,
                items: validItems,
            });
            showAlert('success', t('damageControl.messages.claimCreated'));
            setShowClaimModal(false);
            await loadPage(filters, selectedRecordId);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.claimCreateFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleRecordAction = async (actionKey, action, successMessage) => {
        if (!selectedRecordId) return;
        try {
            setActionLoading(actionKey);
            const updated = await action(selectedRecordId);
            showAlert('success', successMessage);
            await loadPage(filters, updated.id || selectedRecordId);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.recordActionFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleUploadDocument = async (event) => {
        event.preventDefault();
        if (!selectedRecordId || !documentForm.file) {
            showAlert('error', t('damageControl.messages.documentRequired'));
            return;
        }

        try {
            setActionLoading('upload-document');
            await uploadDamageDocument(selectedRecordId, documentForm.file, documentForm.documentType, documentForm.notes);
            setDocumentForm({ documentType: 'PHOTO', notes: '', file: null });
            showAlert('success', t('damageControl.messages.documentUploaded'));
            await loadRecordDetail(selectedRecordId);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.documentUploadFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleDownloadDocument = async (documentId) => {
        try {
            setActionLoading(`download-${documentId}`);
            const file = await getDamageDocumentFile(documentId);
            downloadBlob(file.blob, file.filename);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.documentDownloadFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleDeleteDocument = async (documentId) => {
        try {
            setActionLoading(`delete-${documentId}`);
            await deleteDamageDocument(documentId);
            showAlert('success', t('damageControl.messages.documentDeleted'));
            await loadRecordDetail(selectedRecordId);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.documentDeleteFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleCreateSupplierReturn = async (claimId) => {
        try {
            setActionLoading(`return-${claimId}`);
            await createSupplierReturnFromClaim(claimId);
            showAlert('success', t('damageControl.messages.returnCreated'));
            await loadPage(filters, selectedRecordId);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.returnCreateFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const damageColumns = [
        {
            key: 'recordNumber',
            header: t('damageControl.columns.record'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t(`damageControl.enums.source.${row.sourceType}`)} • {row.warehouseName}</div>
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
            render: (value) => value ? <Badge variant="primary">{value}</Badge> : <span className="text-slate-400">{t('damageControl.labels.none')}</span>,
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
            key: 'receivedDate',
            header: t('damageControl.columns.receivedDate'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
        {
            key: 'items',
            header: t('damageControl.columns.rejectedQuantity'),
            render: (_, row) => <Badge variant="warning">{formatNumber(sumRejectedQuantity(row))}</Badge>,
        },
        {
            key: 'status',
            header: t('damageControl.columns.receiptStatus'),
            render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : 'warning'}>{value}</Badge>,
        },
        {
            key: 'actions',
            header: t('damageControl.columns.actions'),
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={(event) => {
                        event.stopPropagation();
                        openReceivingModal(row);
                    }}>
                        {t('damageControl.actions.capture')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(event) => {
                        event.stopPropagation();
                        openClaimModal(row);
                    }}>
                        {t('damageControl.actions.claim')}
                    </Button>
                </div>
            ),
        },
    ];

    const claimColumns = [
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
            render: (value, row) => formatNumber(sumClaimQuantity(row)),
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
                <div className="flex items-center gap-2">
                    {value ? <Badge variant="success">{value}</Badge> : <span className="text-slate-400">{t('damageControl.labels.none')}</span>}
                    {!value && row.status === 'OPEN' ? (
                        <Button size="sm" variant="ghost" loading={actionLoading === `return-${row.id}`} onClick={(event) => {
                            event.stopPropagation();
                            handleCreateSupplierReturn(row.id);
                        }}>
                            {t('damageControl.actions.createReturn')}
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    const claimTotals = useMemo(() => {
        const openClaims = claims.filter((claim) => claim.status === 'OPEN').length;
        const returnRequested = claims.filter((claim) => claim.status === 'RETURN_REQUESTED').length;
        const quantity = claims.reduce((sum, claim) => sum + sumClaimQuantity(claim), 0);
        const value = claims.reduce((sum, claim) => sum + (claim.items?.reduce((claimSum, item) => claimSum + Number(item.claimedAmount || 0), 0) || 0), 0);
        return { openClaims, returnRequested, quantity, value };
    }, [claims]);

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background-light p-4 sm:p-6 lg:p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6 sm:gap-8">
                <ProcurementHero
                    eyebrow={t('damageControl.eyebrow')}
                    title={t('damageControl.title')}
                    description={t('damageControl.description')}
                    actions={(
                        <>
                            <Button variant="secondary" icon="sync" onClick={() => loadPage(filters, selectedRecordId)}>
                                {t('damageControl.actions.refresh')}
                            </Button>
                            <Button variant="secondary" icon="local_shipping" onClick={() => openClaimModal()} disabled={receivingCandidates.length === 0}>
                                {t('damageControl.actions.fileClaim')}
                            </Button>
                            <Button variant="secondary" icon="warehouse" onClick={() => openReceivingModal()} disabled={receivingCandidates.length === 0}>
                                {t('damageControl.actions.captureReceivingDamage')}
                            </Button>
                            <Button icon="add_circle" onClick={() => setShowIncidentModal(true)}>
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

                <Card title={t('damageControl.filters.title')} subtitle={t('damageControl.filters.subtitle')}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                        <Select label={t('damageControl.filters.warehouse')} value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder={t('damageControl.filters.allWarehouses')} />
                        <Select label={t('damageControl.filters.status')} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((status) => ({ value: status, label: t(`damageControl.enums.status.${status}`) }))} placeholder={t('damageControl.filters.allStatuses')} />
                        <Input label={t('damageControl.filters.fromDate')} type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} />
                        <Input label={t('damageControl.filters.toDate')} type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} />
                        <div className="flex items-end gap-3 xl:col-span-2">
                            <Button variant="secondary" fullWidth onClick={resetFilters}>{t('damageControl.actions.resetFilters')}</Button>
                            <Button fullWidth onClick={applyFilters}>{t('damageControl.actions.applyFilters')}</Button>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
                    <div className="space-y-8">
                        <Card padding="none" className="overflow-hidden" title={t('damageControl.register.title')} subtitle={t('damageControl.register.subtitle')}>
                            <DataTable columns={damageColumns} data={damageRecords} loading={loading} emptyMessage={t('damageControl.register.empty')} onRowClick={(row) => setSelectedRecordId(row.id)} />
                        </Card>

                        <Card padding="none" className="overflow-hidden" title={t('damageControl.receiving.title')} subtitle={t('damageControl.receiving.subtitle')} action={<InfoTip text={t('damageControl.receiving.info')} />}>
                            <DataTable columns={receivingColumns} data={receivingCandidates} loading={loading} emptyMessage={t('damageControl.receiving.empty')} />
                        </Card>

                        <Card padding="none" className="overflow-hidden" title={t('damageControl.claims.title')} subtitle={t('damageControl.claims.subtitle')} action={<InfoTip text={t('damageControl.claims.info')} />}>
                            <DataTable columns={claimColumns} data={claims} loading={claimsLoading} emptyMessage={t('damageControl.claims.empty')} />
                        </Card>
                    </div>

                    <Card title={t('damageControl.detail.title')} subtitle={selectedRecord ? selectedRecord.recordNumber : t('damageControl.detail.subtitle')}>
                        {detailLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
                            </div>
                        ) : !selectedRecord ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                {t('damageControl.detail.empty')}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedRecord.recordNumber}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <Badge variant={getDamageStatusVariant(selectedRecord.status)}>{t(`damageControl.enums.status.${selectedRecord.status}`)}</Badge>
                                                <span>{t(`damageControl.enums.source.${selectedRecord.sourceType}`)}</span>
                                                <span>•</span>
                                                <span>{selectedRecord.warehouseName}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecord.status === 'DRAFT' ? (
                                                <>
                                                    <Button size="sm" loading={actionLoading === 'submit'} onClick={() => handleRecordAction('submit', submitDamageRecordForApproval, t('damageControl.messages.submitted'))}>{t('damageControl.actions.submit')}</Button>
                                                    <Button size="sm" variant="secondary" loading={actionLoading === 'cancel'} onClick={() => handleRecordAction('cancel', cancelDamageRecord, t('damageControl.messages.cancelled'))}>{t('damageControl.actions.cancel')}</Button>
                                                </>
                                            ) : null}
                                            {selectedRecord.status === 'PENDING_APPROVAL' ? (
                                                <>
                                                    <Button size="sm" loading={actionLoading === 'approve'} onClick={() => handleRecordAction('approve', approveDamageRecord, t('damageControl.messages.approved'))}>{t('damageControl.actions.approve')}</Button>
                                                    <Button size="sm" variant="danger" loading={actionLoading === 'reject'} onClick={() => handleRecordAction('reject', rejectDamageRecord, t('damageControl.messages.rejected'))}>{t('damageControl.actions.reject')}</Button>
                                                </>
                                            ) : null}
                                            {selectedRecord.status === 'APPROVED' ? (
                                                <>
                                                    <Button size="sm" loading={actionLoading === 'confirm'} onClick={() => handleRecordAction('confirm', confirmDamageRecord, t('damageControl.messages.confirmed'))}>{t('damageControl.actions.confirm')}</Button>
                                                    <Button size="sm" variant="secondary" loading={actionLoading === 'cancel'} onClick={() => handleRecordAction('cancel', cancelDamageRecord, t('damageControl.messages.cancelled'))}>{t('damageControl.actions.cancel')}</Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.reason')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{t(`damageControl.enums.reason.${selectedRecord.reasonCode}`)}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.created')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{selectedRecord.createdAt ? formatDateTime(selectedRecord.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.reference')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{selectedRecord.reference || t('damageControl.labels.none')}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.linkedClaim')}</div>
                                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{selectedRecord.supplierClaimNumber || t('damageControl.labels.noLinkedClaim')}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.detail.items')}</h3>
                                        <InfoTip text={t('damageControl.detail.itemsInfo')} />
                                    </div>
                                    <div className="space-y-3">
                                        {selectedRecord.items?.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku || item.productVariantId}</div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {item.batchNumber || t('damageControl.labels.noBatch')}
                                                            {item.sourceStorageLocationName ? ` • ${item.sourceStorageLocationName}` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={getDispositionVariant(item.disposition)}>{t(`damageControl.enums.disposition.${item.disposition}`)}</Badge>
                                                        <Badge variant="default">{formatDecimal(item.quantity, formatNumber)}</Badge>
                                                    </div>
                                                </div>
                                                {item.serialNumbers?.length ? (
                                                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{item.serialNumbers.join(', ')}</div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.detail.documents')}</h3>
                                        <InfoTip text={t('damageControl.detail.documentsInfo')} />
                                    </div>

                                    <form className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={handleUploadDocument}>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Select label={t('damageControl.forms.documentType')} value={documentForm.documentType} onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value }))} options={['PHOTO', 'INSPECTION_NOTE', 'VENDOR_EVIDENCE', 'OTHER'].map((value) => ({ value, label: value }))} placeholder={t('damageControl.forms.documentType')} />
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.file')}</label>
                                                <input type="file" onChange={(event) => setDocumentForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                                            <textarea value={documentForm.notes} onChange={(event) => setDocumentForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('damageControl.forms.documentNotesPlaceholder')} />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button type="submit" loading={actionLoading === 'upload-document'}>{t('damageControl.actions.uploadDocument')}</Button>
                                        </div>
                                    </form>

                                    <div className="mt-4 space-y-3">
                                        {documents.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('damageControl.detail.noDocuments')}</div>
                                        ) : documents.map((document) => (
                                            <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{document.filename}</div>
                                                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{document.documentType}{document.notes ? ` • ${document.notes}` : ''}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="ghost" loading={actionLoading === `download-${document.id}`} onClick={() => handleDownloadDocument(document.id)}>{t('damageControl.actions.download')}</Button>
                                                    <Button size="sm" variant="ghost" loading={actionLoading === `delete-${document.id}`} onClick={() => handleDeleteDocument(document.id)}>{t('damageControl.actions.delete')}</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} title={t('damageControl.forms.incidentTitle')} size="lg">
                <form className="space-y-5" onSubmit={handleCreateIncident}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select label={t('damageControl.forms.warehouse')} value={incidentForm.warehouseId} onChange={(event) => setIncidentForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder={t('damageControl.forms.selectWarehouse')} required />
                        <Select label={t('damageControl.forms.sourceType')} value={incidentForm.sourceType} onChange={(event) => setIncidentForm((current) => ({ ...current, sourceType: event.target.value }))} options={['WAREHOUSE', 'RECEIVING', 'SALES_RETURN', 'OTHER'].map((value) => ({ value, label: t(`damageControl.enums.source.${value}`) }))} placeholder={t('damageControl.forms.sourceType')} />
                        <Select label={t('damageControl.forms.reasonCode')} value={incidentForm.reasonCode} onChange={(event) => setIncidentForm((current) => ({ ...current, reasonCode: event.target.value }))} options={['DAMAGED', 'EXPIRED', 'SHRINKAGE', 'CONTAMINATED', 'INTERNAL_USE', 'OTHER'].map((value) => ({ value, label: t(`damageControl.enums.reason.${value}`) }))} placeholder={t('damageControl.forms.reasonCode')} />
                        <Input label={t('damageControl.forms.reference')} value={incidentForm.reference} onChange={(event) => setIncidentForm((current) => ({ ...current, reference: event.target.value }))} placeholder={t('damageControl.forms.referencePlaceholder')} />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                        <textarea value={incidentForm.notes} onChange={(event) => setIncidentForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('damageControl.forms.incidentNotesPlaceholder')} />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.forms.items')}</h3>
                                <InfoTip text={t('damageControl.forms.itemsInfo')} />
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setIncidentForm((current) => ({ ...current, items: [...current.items, createIncidentItem()] }))}>{t('damageControl.actions.addLine')}</Button>
                        </div>
                        {incidentForm.items.map((item, index) => (
                            <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('damageControl.forms.itemLine', { value: index + 1 })}</div>
                                    {incidentForm.items.length > 1 ? <Button size="sm" variant="ghost" onClick={() => setIncidentForm((current) => ({ ...current, items: current.items.filter((currentItem) => currentItem.id !== item.id) }))}>{t('damageControl.actions.remove')}</Button> : null}
                                </div>
                                <ProductVariantLookup label={t('damageControl.forms.variant')} placeholder={t('damageControl.forms.variantPlaceholder')} selectedVariant={item.variant} onSelect={(variant) => handleIncidentItemChange(item.id, 'variant', variant)} />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Input label={t('damageControl.forms.quantity')} type="number" min="0.000001" step="0.01" value={item.quantity} onChange={(event) => handleIncidentItemChange(item.id, 'quantity', event.target.value)} />
                                    <Select label={t('damageControl.forms.disposition')} value={item.disposition} onChange={(event) => handleIncidentItemChange(item.id, 'disposition', event.target.value)} options={['QUARANTINE', 'WRITE_OFF'].map((value) => ({ value, label: t(`damageControl.enums.disposition.${value}`) }))} placeholder={t('damageControl.forms.disposition')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.serialNumbers')}</label>
                                    <textarea value={item.serialNumbers} onChange={(event) => handleIncidentItemChange(item.id, 'serialNumbers', event.target.value)} rows={2} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('damageControl.forms.serialNumbersPlaceholder')} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowIncidentModal(false)}>{t('damageControl.actions.close')}</Button>
                        <Button type="submit" loading={actionLoading === 'create-incident'}>{t('damageControl.actions.saveIncident')}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showReceivingModal} onClose={() => setShowReceivingModal(false)} title={t('damageControl.forms.receivingTitle')} size="lg">
                <form className="space-y-5" onSubmit={handleCreateReceivingDamage}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select label={t('damageControl.forms.goodsReceipt')} value={receivingForm.goodsReceiptNoteId} onChange={(event) => handleReceivingReceiptChange(event.target.value)} options={receivingCandidates.map((goodsReceipt) => ({ value: goodsReceipt.id, label: `${goodsReceipt.grnNumber} • ${goodsReceipt.supplierName}` }))} placeholder={t('damageControl.forms.selectGoodsReceipt')} required />
                        <Select label={t('damageControl.forms.reasonCode')} value={receivingForm.reasonCode} onChange={(event) => setReceivingForm((current) => ({ ...current, reasonCode: event.target.value }))} options={['DAMAGED', 'EXPIRED', 'SHRINKAGE', 'CONTAMINATED', 'INTERNAL_USE', 'OTHER'].map((value) => ({ value, label: t(`damageControl.enums.reason.${value}`) }))} placeholder={t('damageControl.forms.reasonCode')} />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                        <textarea value={receivingForm.notes} onChange={(event) => setReceivingForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('damageControl.forms.receivingNotesPlaceholder')} />
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('damageControl.forms.createSupplierClaim')}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{t('damageControl.forms.createSupplierClaimHelp')}</div>
                            </div>
                            <button type="button" onClick={() => setReceivingForm((current) => ({ ...current, createSupplierClaim: !current.createSupplierClaim }))} className={`inline-flex min-w-[108px] items-center justify-between rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${receivingForm.createSupplierClaim ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                <span>{receivingForm.createSupplierClaim ? t('damageControl.labels.enabled') : t('damageControl.labels.disabled')}</span>
                                <span className={`size-5 rounded-full ${receivingForm.createSupplierClaim ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            </button>
                        </div>
                        {receivingForm.createSupplierClaim ? (
                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Input label={t('damageControl.forms.claimReason')} value={receivingForm.supplierClaimReason} onChange={(event) => setReceivingForm((current) => ({ ...current, supplierClaimReason: event.target.value }))} placeholder={t('damageControl.forms.claimReasonPlaceholder')} />
                                <Input label={t('damageControl.forms.claimNotes')} value={receivingForm.supplierClaimNotes} onChange={(event) => setReceivingForm((current) => ({ ...current, supplierClaimNotes: event.target.value }))} placeholder={t('damageControl.forms.claimNotesPlaceholder')} />
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.forms.receivingLines')}</h3>
                            <InfoTip text={t('damageControl.forms.receivingLinesInfo')} />
                        </div>
                        {receivingForm.items.map((item) => (
                            <div key={item.goodsReceiptNoteItemId} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[minmax(0,1.4fr)_120px_180px]">
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku}</div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('damageControl.labels.maxRejected', { value: formatNumber(item.rejectedQuantity) })}</div>
                                </div>
                                <Input type="number" min="0" max={item.rejectedQuantity} step="1" value={item.quantity} onChange={(event) => setReceivingForm((current) => ({ ...current, items: current.items.map((currentItem) => currentItem.goodsReceiptNoteItemId === item.goodsReceiptNoteItemId ? { ...currentItem, quantity: event.target.value } : currentItem) }))} label={t('damageControl.forms.quantity')} />
                                <Select label={t('damageControl.forms.disposition')} value={item.disposition} onChange={(event) => setReceivingForm((current) => ({ ...current, items: current.items.map((currentItem) => currentItem.goodsReceiptNoteItemId === item.goodsReceiptNoteItemId ? { ...currentItem, disposition: event.target.value } : currentItem) }))} options={['QUARANTINE', 'WRITE_OFF'].map((value) => ({ value, label: t(`damageControl.enums.disposition.${value}`) }))} placeholder={t('damageControl.forms.disposition')} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowReceivingModal(false)}>{t('damageControl.actions.close')}</Button>
                        <Button type="submit" loading={actionLoading === 'create-receiving'}>{t('damageControl.actions.saveReceivingDamage')}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} title={t('damageControl.forms.claimTitle')} size="lg">
                <form className="space-y-5" onSubmit={handleCreateClaim}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select label={t('damageControl.forms.goodsReceipt')} value={claimForm.goodsReceiptNoteId} onChange={(event) => handleClaimReceiptChange(event.target.value)} options={receivingCandidates.map((goodsReceipt) => ({ value: goodsReceipt.id, label: `${goodsReceipt.grnNumber} • ${goodsReceipt.supplierName}` }))} placeholder={t('damageControl.forms.selectGoodsReceipt')} required />
                        <Select label={t('damageControl.forms.linkedDamageRecord')} value={claimForm.damageRecordId} onChange={(event) => setClaimForm((current) => ({ ...current, damageRecordId: event.target.value, claimType: event.target.value ? 'DAMAGED_RECEIPT' : 'REJECTED_RECEIPT' }))} options={relatedDamageRecordsForClaim.map((record) => ({ value: record.id, label: `${record.recordNumber} • ${t(`damageControl.enums.status.${record.status}`)}` }))} placeholder={t('damageControl.forms.noLinkedDamageRecord')} />
                        <Select label={t('damageControl.forms.claimType')} value={claimForm.damageRecordId ? 'DAMAGED_RECEIPT' : claimForm.claimType} onChange={(event) => setClaimForm((current) => ({ ...current, claimType: event.target.value }))} options={['DAMAGED_RECEIPT', 'REJECTED_RECEIPT'].map((value) => ({ value, label: t(`damageControl.enums.claimType.${value}`) }))} placeholder={t('damageControl.forms.claimType')} disabled={Boolean(claimForm.damageRecordId)} />
                        <Input label={t('damageControl.forms.claimReason')} value={claimForm.reason} onChange={(event) => setClaimForm((current) => ({ ...current, reason: event.target.value }))} placeholder={t('damageControl.forms.claimReasonPlaceholder')} />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                        <textarea value={claimForm.notes} onChange={(event) => setClaimForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('damageControl.forms.claimNotesPlaceholder')} />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.forms.claimLines')}</h3>
                            <InfoTip text={t('damageControl.forms.claimLinesInfo')} />
                        </div>
                        {claimForm.items.map((item) => (
                            <div key={item.goodsReceiptNoteItemId} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[minmax(0,1.2fr)_120px_minmax(0,1fr)]">
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku}</div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('damageControl.labels.maxRejected', { value: formatNumber(item.rejectedQuantity) })}</div>
                                </div>
                                <Input type="number" min="0" max={item.rejectedQuantity} step="1" value={item.quantity} onChange={(event) => setClaimForm((current) => ({ ...current, items: current.items.map((currentItem) => currentItem.goodsReceiptNoteItemId === item.goodsReceiptNoteItemId ? { ...currentItem, quantity: event.target.value } : currentItem) }))} label={t('damageControl.forms.quantity')} />
                                <Input label={t('damageControl.forms.lineReason')} value={item.reason} onChange={(event) => setClaimForm((current) => ({ ...current, items: current.items.map((currentItem) => currentItem.goodsReceiptNoteItemId === item.goodsReceiptNoteItemId ? { ...currentItem, reason: event.target.value } : currentItem) }))} placeholder={t('damageControl.forms.lineReasonPlaceholder')} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowClaimModal(false)}>{t('damageControl.actions.close')}</Button>
                        <Button type="submit" loading={actionLoading === 'create-claim'}>{t('damageControl.actions.saveClaim')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DamageControl;
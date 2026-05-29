import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    InfoTip,
} from '../../components/common';
import {
    approveSalesRefund,
    cancelSalesRefund,
    completeSalesRefund,
    generateRefundCreditNote,
    getCustomerStoreCreditTransactions,
    getSalesRefund,
    rejectSalesRefund,
} from '../../services/salesRefundService';
import { useLanguage } from '../../contexts/LanguageContext';
import { getRefundStatusVariant, getRefundTypeVariant, toList } from './constants';

const RefundsExchangesDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { t, formatNumber, formatCurrency, formatDateTime } = useLanguage();

    const [refund, setRefund] = useState(null);
    const [creditTransactions, setCreditTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creditLoading, setCreditLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadDetail = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getSalesRefund(id);
            setRefund(data);

            if (data?.customerId) {
                try {
                    setCreditLoading(true);
                    const creditData = await getCustomerStoreCreditTransactions(data.customerId, { page: 0, size: 20 });
                    setCreditTransactions(toList(creditData));
                } finally {
                    setCreditLoading(false);
                }
            } else {
                setCreditTransactions([]);
            }
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.detailFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetail();
    }, [id]);

    const handleRefundAction = async (actionKey, action, successMessage) => {
        try {
            setActionLoading(actionKey);
            await action(id, {});
            showAlert('success', successMessage);
            await loadDetail();
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.actionFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleGenerateCreditNote = async () => {
        try {
            setActionLoading('credit-note');
            await generateRefundCreditNote(id);
            showAlert('success', t('refundsExchanges.messages.creditNoteGenerated'));
            await loadDetail();
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.creditNoteFailed'));
        } finally {
            setActionLoading('');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
        );
    }

    if (!refund) {
        return (
            <div className="flex-1 overflow-y-auto space-y-6 p-6">
                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}
                <Card title={t('refundsExchanges.detail.title')}>
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {t('refundsExchanges.detail.empty')}
                    </div>
                    <div className="mt-4">
                        <Button variant="secondary" onClick={() => navigate('/refunds-exchanges')}>
                            {t('refundsExchanges.actions.close')}
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('refundsExchanges.detail.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{refund.refundNumber}</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/refunds-exchanges')}>
                    {t('refundsExchanges.actions.close')}
                </Button>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <Card>
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{refund.refundNumber}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Badge variant={getRefundStatusVariant(refund.status)}>{t(`refundsExchanges.enums.status.${refund.status}`)}</Badge>
                                    <Badge variant={getRefundTypeVariant(refund.refundType)}>{t(`refundsExchanges.enums.type.${refund.refundType}`)}</Badge>
                                    <span>{refund.soNumber}</span>
                                    <span>•</span>
                                    <span>{refund.customerName}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {refund.status === 'PENDING_APPROVAL' ? (
                                    <>
                                        <Button size="sm" loading={actionLoading === 'approve'} onClick={() => handleRefundAction('approve', approveSalesRefund, t('refundsExchanges.messages.approved'))}>{t('refundsExchanges.actions.approve')}</Button>
                                        <Button size="sm" variant="danger" loading={actionLoading === 'reject'} onClick={() => handleRefundAction('reject', rejectSalesRefund, t('refundsExchanges.messages.rejected'))}>{t('refundsExchanges.actions.reject')}</Button>
                                    </>
                                ) : null}
                                {refund.status === 'APPROVED' ? (
                                    <Button size="sm" loading={actionLoading === 'complete'} onClick={() => handleRefundAction('complete', completeSalesRefund, t('refundsExchanges.messages.completed'))}>{t('refundsExchanges.actions.complete')}</Button>
                                ) : null}
                                {refund.status !== 'COMPLETED' && refund.status !== 'REJECTED' && refund.status !== 'CANCELLED' ? (
                                    <Button size="sm" variant="secondary" loading={actionLoading === 'cancel'} onClick={() => handleRefundAction('cancel', cancelSalesRefund, t('refundsExchanges.messages.cancelled'))}>{t('refundsExchanges.actions.cancel')}</Button>
                                ) : null}
                                <Button size="sm" variant="ghost" loading={actionLoading === 'credit-note'} onClick={handleGenerateCreditNote}>{t('refundsExchanges.actions.generateCreditNote')}</Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.method')}</div>
                            <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{t(`refundsExchanges.enums.method.${refund.refundMethod}`)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.requestedAt')}</div>
                            <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{refund.requestedAt ? formatDateTime(refund.requestedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.netRefund')}</div>
                            <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(Number(refund.netRefundAmount || 0))}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.labels.priceDifference')}</div>
                            <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(Number(refund.exchangePriceDifference || 0))}</div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('refundsExchanges.detail.items')}</h3>
                            <InfoTip text={t('refundsExchanges.detail.itemsInfo')} />
                        </div>
                        <div className="space-y-3">
                            {refund.items?.map((item) => (
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
                            {(refund.auditEntries || []).length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('refundsExchanges.detail.noAudit')}</div>
                            ) : refund.auditEntries.map((entry) => (
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
                        {refund.creditNoteNumber ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{refund.creditNoteNumber}</div>
                                    <Badge variant="success">{t('refundsExchanges.labels.generated')}</Badge>
                                </div>
                                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-600 dark:text-slate-300">{refund.documentContent || t('refundsExchanges.detail.documentPending')}</pre>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('refundsExchanges.detail.noCreditNote')}</div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default RefundsExchangesDetail;

import React from 'react';
import { Badge, Button, Card, InfoTip } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    formatDecimal,
    getDamageStatusVariant,
    getDispositionVariant,
} from '../constants';

const IncidentDetailCard = ({
    record,
    actionLoading,
    onAction,
    actions,
}) => {
    const { t, formatNumber, formatDateTime } = useLanguage();

    return (
        <Card title={t('damageControl.detail.title')} subtitle={record.recordNumber}>
            <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{record.recordNumber}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Badge variant={getDamageStatusVariant(record.status)}>{t(`damageControl.enums.status.${record.status}`)}</Badge>
                                <span>{t(`damageControl.enums.source.${record.sourceType}`)}</span>
                                <span>•</span>
                                <span>{record.warehouseName}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {record.status === 'DRAFT' ? (
                                <>
                                    <Button size="sm" loading={actionLoading === 'submit'} onClick={() => onAction('submit')}>{t('damageControl.actions.submit')}</Button>
                                    <Button size="sm" variant="secondary" loading={actionLoading === 'cancel'} onClick={() => onAction('cancel')}>{t('damageControl.actions.cancel')}</Button>
                                </>
                            ) : null}
                            {record.status === 'PENDING_APPROVAL' ? (
                                <>
                                    <Button size="sm" loading={actionLoading === 'approve'} onClick={() => onAction('approve')}>{t('damageControl.actions.approve')}</Button>
                                    <Button size="sm" variant="danger" loading={actionLoading === 'reject'} onClick={() => onAction('reject')}>{t('damageControl.actions.reject')}</Button>
                                </>
                            ) : null}
                            {record.status === 'APPROVED' ? (
                                <>
                                    <Button size="sm" loading={actionLoading === 'confirm'} onClick={() => onAction('confirm')}>{t('damageControl.actions.confirm')}</Button>
                                    <Button size="sm" variant="secondary" loading={actionLoading === 'cancel'} onClick={() => onAction('cancel')}>{t('damageControl.actions.cancel')}</Button>
                                </>
                            ) : null}
                            {actions}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.reason')}</div>
                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{t(`damageControl.enums.reason.${record.reasonCode}`)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.created')}</div>
                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{record.createdAt ? formatDateTime(record.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.reference')}</div>
                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{record.reference || t('damageControl.labels.none')}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('damageControl.labels.linkedClaim')}</div>
                        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{record.supplierClaimNumber || t('damageControl.labels.noLinkedClaim')}</div>
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.detail.items')}</h3>
                        <InfoTip text={t('damageControl.detail.itemsInfo')} />
                    </div>
                    <div className="space-y-3">
                        {record.items?.map((item) => (
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
            </div>
        </Card>
    );
};

export default IncidentDetailCard;

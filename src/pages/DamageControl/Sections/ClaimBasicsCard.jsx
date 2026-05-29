import React from 'react';
import { Card, Input, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CLAIM_TYPES } from '../constants';

const ClaimBasicsCard = ({
    form,
    setForm,
    receivingCandidates,
    relatedDamageRecords,
    onReceiptChange,
    disabled = false,
    disableReceiptChange = false,
}) => {
    const { t } = useLanguage();
    const claimType = form.damageRecordId ? 'DAMAGED_RECEIPT' : form.claimType;

    return (
        <Card title={t('damageControl.forms.claimTitle')} subtitle={t('damageControl.claims.subtitle')}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                    label={t('damageControl.forms.goodsReceipt')}
                    value={form.goodsReceiptNoteId}
                    onChange={(event) => onReceiptChange(event.target.value)}
                    options={receivingCandidates.map((goodsReceipt) => ({
                        value: goodsReceipt.id,
                        label: `${goodsReceipt.grnNumber} • ${goodsReceipt.supplierName}`,
                    }))}
                    placeholder={t('damageControl.forms.selectGoodsReceipt')}
                    required
                    disabled={disabled || disableReceiptChange}
                />
                <Select
                    label={t('damageControl.forms.linkedDamageRecord')}
                    value={form.damageRecordId}
                    onChange={(event) => setForm((current) => ({
                        ...current,
                        damageRecordId: event.target.value,
                        claimType: event.target.value ? 'DAMAGED_RECEIPT' : 'REJECTED_RECEIPT',
                    }))}
                    options={relatedDamageRecords.map((record) => ({
                        value: record.id,
                        label: `${record.recordNumber} • ${t(`damageControl.enums.status.${record.status}`)}`,
                    }))}
                    placeholder={t('damageControl.forms.noLinkedDamageRecord')}
                    disabled={disabled}
                />
                <Select
                    label={t('damageControl.forms.claimType')}
                    value={claimType}
                    onChange={(event) => setForm((current) => ({ ...current, claimType: event.target.value }))}
                    options={CLAIM_TYPES.map((value) => ({ value, label: t(`damageControl.enums.claimType.${value}`) }))}
                    placeholder={t('damageControl.forms.claimType')}
                    disabled={disabled || Boolean(form.damageRecordId)}
                />
                <Input
                    label={t('damageControl.forms.claimReason')}
                    value={form.reason}
                    onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    placeholder={t('damageControl.forms.claimReasonPlaceholder')}
                    disabled={disabled}
                />
            </div>
            <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                <textarea
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={3}
                    disabled={disabled}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
                    placeholder={t('damageControl.forms.claimNotesPlaceholder')}
                />
            </div>
        </Card>
    );
};

export default ClaimBasicsCard;

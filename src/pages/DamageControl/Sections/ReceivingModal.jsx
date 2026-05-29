import React, { useEffect, useMemo, useState } from 'react';
import { Button, InfoTip, Input, Modal, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    createDamageRecordFromGoodsReceipt,
} from '../../../services/damageControlService';
import {
    DAMAGE_DISPOSITIONS,
    DAMAGE_REASON_CODES,
    createInitialReceivingForm,
    createReceivingItems,
} from '../constants';

const ReceivingModal = ({
    isOpen,
    onClose,
    receivingCandidates,
    initialGoodsReceipt = null,
    onAlert,
    onCreated,
}) => {
    const { t, formatNumber } = useLanguage();
    const [form, setForm] = useState(() => createInitialReceivingForm(initialGoodsReceipt || receivingCandidates[0] || null));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const target = initialGoodsReceipt || receivingCandidates[0] || null;
        setForm(createInitialReceivingForm(target));
    }, [isOpen, initialGoodsReceipt, receivingCandidates]);

    const handleReceiptChange = (goodsReceiptNoteId) => {
        const next = receivingCandidates.find((goodsReceipt) => goodsReceipt.id === goodsReceiptNoteId) || null;
        setForm((current) => ({
            ...current,
            goodsReceiptNoteId,
            items: createReceivingItems(next),
        }));
    };

    const updateItem = (goodsReceiptNoteItemId, key, value) => {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) => item.goodsReceiptNoteItemId === goodsReceiptNoteItemId
                ? { ...item, [key]: value }
                : item),
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validItems = form.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
                goodsReceiptNoteItemId: item.goodsReceiptNoteItemId,
                quantity: Number(item.quantity),
                disposition: item.disposition,
            }));

        if (!form.goodsReceiptNoteId || validItems.length === 0) {
            onAlert?.('error', t('damageControl.messages.receivingItemRequired'));
            return;
        }

        try {
            setSubmitting(true);
            const created = await createDamageRecordFromGoodsReceipt(form.goodsReceiptNoteId, {
                reasonCode: form.reasonCode,
                notes: form.notes || null,
                createSupplierClaim: form.createSupplierClaim,
                supplierClaimReason: form.createSupplierClaim ? form.supplierClaimReason || null : null,
                supplierClaimNotes: form.createSupplierClaim ? form.supplierClaimNotes || null : null,
                items: validItems,
            });
            onAlert?.('success', t('damageControl.messages.receivingCreated'));
            await onCreated?.(created);
            onClose();
        } catch (error) {
            onAlert?.('error', error.message || t('damageControl.messages.receivingCreateFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('damageControl.forms.receivingTitle')} size="lg">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                        label={t('damageControl.forms.goodsReceipt')}
                        value={form.goodsReceiptNoteId}
                        onChange={(event) => handleReceiptChange(event.target.value)}
                        options={receivingCandidates.map((goodsReceipt) => ({
                            value: goodsReceipt.id,
                            label: `${goodsReceipt.grnNumber} • ${goodsReceipt.supplierName}`,
                        }))}
                        placeholder={t('damageControl.forms.selectGoodsReceipt')}
                        required
                    />
                    <Select
                        label={t('damageControl.forms.reasonCode')}
                        value={form.reasonCode}
                        onChange={(event) => setForm((current) => ({ ...current, reasonCode: event.target.value }))}
                        options={DAMAGE_REASON_CODES.map((value) => ({ value, label: t(`damageControl.enums.reason.${value}`) }))}
                        placeholder={t('damageControl.forms.reasonCode')}
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                    <textarea
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        rows={3}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder={t('damageControl.forms.receivingNotesPlaceholder')}
                    />
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('damageControl.forms.createSupplierClaim')}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{t('damageControl.forms.createSupplierClaimHelp')}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, createSupplierClaim: !current.createSupplierClaim }))}
                            className={`inline-flex min-w-[108px] items-center justify-between rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${form.createSupplierClaim ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
                        >
                            <span>{form.createSupplierClaim ? t('damageControl.labels.enabled') : t('damageControl.labels.disabled')}</span>
                            <span className={`size-5 rounded-full ${form.createSupplierClaim ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        </button>
                    </div>
                    {form.createSupplierClaim ? (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label={t('damageControl.forms.claimReason')}
                                value={form.supplierClaimReason}
                                onChange={(event) => setForm((current) => ({ ...current, supplierClaimReason: event.target.value }))}
                                placeholder={t('damageControl.forms.claimReasonPlaceholder')}
                            />
                            <Input
                                label={t('damageControl.forms.claimNotes')}
                                value={form.supplierClaimNotes}
                                onChange={(event) => setForm((current) => ({ ...current, supplierClaimNotes: event.target.value }))}
                                placeholder={t('damageControl.forms.claimNotesPlaceholder')}
                            />
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('damageControl.forms.receivingLines')}</h3>
                        <InfoTip text={t('damageControl.forms.receivingLinesInfo')} />
                    </div>
                    {form.items.map((item) => (
                        <div
                            key={item.goodsReceiptNoteItemId}
                            className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[minmax(0,1.4fr)_120px_180px]"
                        >
                            <div>
                                <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {t('damageControl.labels.maxRejected', { value: formatNumber(item.rejectedQuantity) })}
                                </div>
                            </div>
                            <Input
                                type="number"
                                min="0"
                                max={item.rejectedQuantity}
                                step="1"
                                value={item.quantity}
                                onChange={(event) => updateItem(item.goodsReceiptNoteItemId, 'quantity', event.target.value)}
                                label={t('damageControl.forms.quantity')}
                            />
                            <Select
                                label={t('damageControl.forms.disposition')}
                                value={item.disposition}
                                onChange={(event) => updateItem(item.goodsReceiptNoteItemId, 'disposition', event.target.value)}
                                options={DAMAGE_DISPOSITIONS.map((value) => ({ value, label: t(`damageControl.enums.disposition.${value}`) }))}
                                placeholder={t('damageControl.forms.disposition')}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('damageControl.actions.close')}</Button>
                    <Button type="submit" loading={submitting}>{t('damageControl.actions.saveReceivingDamage')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ReceivingModal;

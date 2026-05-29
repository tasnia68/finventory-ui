import React from 'react';
import { Card, InfoTip, Input } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';

const ClaimItemsCard = ({ form, setForm, disabled = false }) => {
    const { t, formatNumber } = useLanguage();

    const updateItem = (goodsReceiptNoteItemId, key, value) => {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) => item.goodsReceiptNoteItemId === goodsReceiptNoteItemId
                ? { ...item, [key]: value }
                : item),
        }));
    };

    return (
        <Card
            title={t('damageControl.forms.claimLines')}
            subtitle={t('damageControl.forms.claimLinesInfo')}
            action={<InfoTip text={t('damageControl.forms.claimLinesInfo')} />}
        >
            {form.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {t('damageControl.receiving.empty')}
                </div>
            ) : (
                <div className="space-y-3">
                    {form.items.map((item) => (
                        <div
                            key={item.goodsReceiptNoteItemId}
                            className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[minmax(0,1.2fr)_120px_minmax(0,1fr)]"
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
                                disabled={disabled}
                            />
                            <Input
                                label={t('damageControl.forms.lineReason')}
                                value={item.reason}
                                onChange={(event) => updateItem(item.goodsReceiptNoteItemId, 'reason', event.target.value)}
                                placeholder={t('damageControl.forms.lineReasonPlaceholder')}
                                disabled={disabled}
                            />
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default ClaimItemsCard;

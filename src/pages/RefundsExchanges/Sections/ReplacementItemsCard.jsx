import React from 'react';
import {
    Button,
    Card,
    InfoTip,
    Input,
    ProductVariantLookup,
} from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import { createReplacementItem } from '../constants';

const ReplacementItemsCard = ({ form, setForm, onReplacementItemChange }) => {
    const { t } = useLanguage();

    if (form.refundType !== 'EXCHANGE') {
        return null;
    }

    return (
        <Card
            title={t('refundsExchanges.sections.replacements.title')}
            subtitle={t('refundsExchanges.sections.replacements.subtitle')}
            action={(
                <div className="flex items-center gap-2">
                    <InfoTip text={t('refundsExchanges.forms.replacementItemsInfo')} />
                    <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => setForm((current) => ({
                            ...current,
                            replacementItems: [...current.replacementItems, createReplacementItem()],
                        }))}
                    >
                        {t('refundsExchanges.actions.addReplacement')}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-4">
                {form.replacementItems.map((item, index) => (
                    <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {t('refundsExchanges.forms.replacementLine', { value: index + 1 })}
                            </div>
                            {form.replacementItems.length > 1 ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setForm((current) => ({
                                        ...current,
                                        replacementItems: current.replacementItems.filter((currentItem) => currentItem.id !== item.id),
                                    }))}
                                >
                                    {t('refundsExchanges.actions.remove')}
                                </Button>
                            ) : null}
                        </div>
                        <ProductVariantLookup
                            label={t('refundsExchanges.forms.variant')}
                            placeholder={t('refundsExchanges.forms.variantPlaceholder')}
                            selectedVariant={item.variant}
                            onSelect={(variant) => onReplacementItemChange(item.id, 'variant', variant)}
                        />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label={t('refundsExchanges.forms.quantity')}
                                type="number"
                                min="0.000001"
                                step="0.01"
                                value={item.quantity}
                                onChange={(event) => onReplacementItemChange(item.id, 'quantity', event.target.value)}
                            />
                            <Input
                                label={t('refundsExchanges.forms.unitPrice')}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(event) => onReplacementItemChange(item.id, 'unitPrice', event.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default ReplacementItemsCard;

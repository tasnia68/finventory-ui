import React, { useMemo } from 'react';
import { Badge, Card } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getRefundTypeVariant } from '../constants';

const ReviewCard = ({ form, currentSalesOrder }) => {
    const { t, formatNumber, formatCurrency } = useLanguage();

    const validLines = useMemo(
        () => form.items.filter((item) => Number(item.quantity) > 0),
        [form.items]
    );

    const validReplacements = useMemo(
        () => form.replacementItems.filter((item) => item.variant?.id && Number(item.quantity) > 0 && Number(item.unitPrice) > 0),
        [form.replacementItems]
    );

    const refundTotal = useMemo(
        () => validLines.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
        [validLines]
    );

    const replacementTotal = useMemo(
        () => validReplacements.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0),
        [validReplacements]
    );

    return (
        <Card
            title={t('refundsExchanges.sections.review.title')}
            subtitle={t('refundsExchanges.sections.review.subtitle')}
        >
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getRefundTypeVariant(form.refundType)}>{t(`refundsExchanges.enums.type.${form.refundType}`)}</Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{t(`refundsExchanges.enums.method.${form.refundMethod}`)}</span>
                    {currentSalesOrder ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {currentSalesOrder.soNumber} • {currentSalesOrder.customerName}
                        </span>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.sections.review.linesCount')}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatNumber(validLines.length)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.sections.review.refundTotal')}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(refundTotal)}</div>
                    </div>
                    {form.refundType === 'EXCHANGE' ? (
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('refundsExchanges.sections.review.replacementTotal')}</div>
                            <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(replacementTotal)}</div>
                        </div>
                    ) : null}
                </div>

                {validLines.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
                        {t('refundsExchanges.sections.review.noLinesWarning')}
                    </div>
                ) : null}

                {form.refundType === 'EXCHANGE' && validReplacements.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
                        {t('refundsExchanges.sections.review.noReplacementsWarning')}
                    </div>
                ) : null}
            </div>
        </Card>
    );
};

export default ReviewCard;

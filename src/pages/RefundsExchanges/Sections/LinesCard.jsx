import React from 'react';
import {
    Badge,
    Card,
    InfoTip,
    Input,
    Select,
} from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import { RETURN_DISPOSITIONS } from '../constants';

const LinesCard = ({
    form,
    currentRma,
    storageLocationOptions,
    batchOptionsByVariant,
    onRefundItemChange,
}) => {
    const { t, formatNumber, formatCurrency } = useLanguage();

    const getEligibleQuantity = (item) => {
        const rmaItem = currentRma?.items?.find((rmaLine) => rmaLine.salesOrderItemId === item.salesOrderItemId);
        return Number(rmaItem?.quantity || item.shippedQuantity || 0);
    };

    return (
        <Card
            title={t('refundsExchanges.sections.lines.title')}
            subtitle={t('refundsExchanges.sections.lines.subtitle')}
            action={<InfoTip text={t('refundsExchanges.forms.itemsInfo')} />}
        >
            {!form.salesOrderId ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {t('refundsExchanges.sections.lines.empty')}
                </div>
            ) : form.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {t('refundsExchanges.sections.lines.noLines')}
                </div>
            ) : (
                <div className="space-y-4">
                    {form.items.map((item) => {
                        const batchOptions = (batchOptionsByVariant[item.productVariantId] || []).map((batch) => ({ value: batch.id, label: batch.batchNumber }));
                        return (
                            <div key={item.salesOrderItemId} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.sku}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{t('refundsExchanges.labels.maxReturnable', { value: formatNumber(getEligibleQuantity(item), { maximumFractionDigits: 2 }) })}</div>
                                    </div>
                                    <Badge variant="default">{formatCurrency(Number(item.unitPrice || 0))}</Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Input
                                        label={t('refundsExchanges.forms.quantity')}
                                        type="number"
                                        min="0"
                                        max={getEligibleQuantity(item)}
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'quantity', event.target.value)}
                                    />
                                    <Input
                                        label={t('refundsExchanges.forms.unitPrice')}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'unitPrice', event.target.value)}
                                    />
                                    <Select
                                        label={t('refundsExchanges.forms.disposition')}
                                        value={item.returnDisposition}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'returnDisposition', event.target.value)}
                                        options={RETURN_DISPOSITIONS.map((value) => ({ value, label: t(`refundsExchanges.enums.disposition.${value}`) }))}
                                        placeholder={t('refundsExchanges.forms.disposition')}
                                    />
                                    <Select
                                        label={t('refundsExchanges.forms.storageLocation')}
                                        value={item.storageLocationId}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'storageLocationId', event.target.value)}
                                        options={storageLocationOptions}
                                        placeholder={t('refundsExchanges.forms.optionalLocation')}
                                    />
                                    <Select
                                        label={t('refundsExchanges.forms.batch')}
                                        value={item.batchId}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'batchId', event.target.value)}
                                        options={batchOptions}
                                        placeholder={t('refundsExchanges.forms.optionalBatch')}
                                        className="xl:col-span-2"
                                    />
                                    <Input
                                        label={t('refundsExchanges.forms.lineReason')}
                                        value={item.reason}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'reason', event.target.value)}
                                        placeholder={t('refundsExchanges.forms.lineReasonPlaceholder')}
                                        className="xl:col-span-2"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('refundsExchanges.forms.serialNumbers')}</label>
                                    <textarea
                                        value={item.serialNumbers}
                                        onChange={(event) => onRefundItemChange(item.salesOrderItemId, 'serialNumbers', event.target.value)}
                                        rows={2}
                                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder={t('refundsExchanges.forms.serialNumbersPlaceholder')}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

export default LinesCard;

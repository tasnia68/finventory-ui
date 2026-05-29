import React from 'react';
import { Card, Input, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    REFUND_METHODS,
    REFUND_TYPES,
    createReplacementItem,
} from '../constants';

const ReasonMethodCard = ({ form, setForm }) => {
    const { t } = useLanguage();
    return (
        <Card
            title={t('refundsExchanges.sections.reason.title')}
            subtitle={t('refundsExchanges.sections.reason.subtitle')}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Select
                    label={t('refundsExchanges.forms.type')}
                    value={form.refundType}
                    onChange={(event) => setForm((current) => ({
                        ...current,
                        refundType: event.target.value,
                        replacementItems:
                            event.target.value === 'EXCHANGE' && current.replacementItems.length === 0
                                ? [createReplacementItem()]
                                : (event.target.value === 'EXCHANGE' ? current.replacementItems : []),
                    }))}
                    options={REFUND_TYPES.map((value) => ({ value, label: t(`refundsExchanges.enums.type.${value}`) }))}
                    placeholder={t('refundsExchanges.forms.type')}
                />
                <Select
                    label={t('refundsExchanges.forms.method')}
                    value={form.refundMethod}
                    onChange={(event) => setForm((current) => ({ ...current, refundMethod: event.target.value }))}
                    options={REFUND_METHODS.map((value) => ({ value, label: t(`refundsExchanges.enums.method.${value}`) }))}
                    placeholder={t('refundsExchanges.forms.method')}
                />
                <Input
                    label={t('refundsExchanges.forms.reason')}
                    value={form.reason}
                    onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    placeholder={t('refundsExchanges.forms.reasonPlaceholder')}
                />
            </div>
            <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('refundsExchanges.forms.notes')}</label>
                <textarea
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={3}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder={t('refundsExchanges.forms.notesPlaceholder')}
                />
            </div>
        </Card>
    );
};

export default ReasonMethodCard;

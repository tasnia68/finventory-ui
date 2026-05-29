import React from 'react';
import { Card, Input, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DAMAGE_REASON_CODES, DAMAGE_SOURCE_TYPES } from '../constants';

const IncidentBasicsCard = ({ form, setForm, warehouseOptions, disabled = false }) => {
    const { t } = useLanguage();
    return (
        <Card title={t('damageControl.forms.incidentTitle')} subtitle={t('damageControl.detail.subtitle')}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                    label={t('damageControl.forms.warehouse')}
                    value={form.warehouseId}
                    onChange={(event) => setForm((current) => ({ ...current, warehouseId: event.target.value }))}
                    options={warehouseOptions}
                    placeholder={t('damageControl.forms.selectWarehouse')}
                    required
                    disabled={disabled}
                />
                <Select
                    label={t('damageControl.forms.sourceType')}
                    value={form.sourceType}
                    onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}
                    options={DAMAGE_SOURCE_TYPES.map((value) => ({ value, label: t(`damageControl.enums.source.${value}`) }))}
                    placeholder={t('damageControl.forms.sourceType')}
                    disabled={disabled}
                />
                <Select
                    label={t('damageControl.forms.reasonCode')}
                    value={form.reasonCode}
                    onChange={(event) => setForm((current) => ({ ...current, reasonCode: event.target.value }))}
                    options={DAMAGE_REASON_CODES.map((value) => ({ value, label: t(`damageControl.enums.reason.${value}`) }))}
                    placeholder={t('damageControl.forms.reasonCode')}
                    disabled={disabled}
                />
                <Input
                    label={t('damageControl.forms.reference')}
                    value={form.reference}
                    onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                    placeholder={t('damageControl.forms.referencePlaceholder')}
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
                    placeholder={t('damageControl.forms.incidentNotesPlaceholder')}
                />
            </div>
        </Card>
    );
};

export default IncidentBasicsCard;

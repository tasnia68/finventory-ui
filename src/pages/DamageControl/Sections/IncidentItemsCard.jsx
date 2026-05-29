import React from 'react';
import { Button, Card, InfoTip, Input, ProductVariantLookup, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DAMAGE_DISPOSITIONS, createIncidentItem } from '../constants';

const IncidentItemsCard = ({ form, setForm, disabled = false }) => {
    const { t } = useLanguage();

    const handleItemChange = (itemId, key, value) => {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
        }));
    };

    const handleAddLine = () => setForm((current) => ({ ...current, items: [...current.items, createIncidentItem()] }));

    const handleRemoveLine = (itemId) => setForm((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
    }));

    return (
        <Card
            title={t('damageControl.forms.items')}
            subtitle={t('damageControl.forms.itemsInfo')}
            action={!disabled ? (
                <Button size="sm" variant="ghost" onClick={handleAddLine} type="button">
                    {t('damageControl.actions.addLine')}
                </Button>
            ) : null}
        >
            <div className="space-y-4">
                {form.items.map((item, index) => (
                    <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {t('damageControl.forms.itemLine', { value: index + 1 })}
                            </div>
                            {!disabled && form.items.length > 1 ? (
                                <Button size="sm" variant="ghost" onClick={() => handleRemoveLine(item.id)} type="button">
                                    {t('damageControl.actions.remove')}
                                </Button>
                            ) : null}
                        </div>
                        <ProductVariantLookup
                            label={t('damageControl.forms.variant')}
                            placeholder={t('damageControl.forms.variantPlaceholder')}
                            selectedVariant={item.variant}
                            onSelect={(variant) => handleItemChange(item.id, 'variant', variant)}
                            disabled={disabled}
                        />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label={t('damageControl.forms.quantity')}
                                type="number"
                                min="0.000001"
                                step="0.01"
                                value={item.quantity}
                                onChange={(event) => handleItemChange(item.id, 'quantity', event.target.value)}
                                disabled={disabled}
                            />
                            <Select
                                label={t('damageControl.forms.disposition')}
                                value={item.disposition}
                                onChange={(event) => handleItemChange(item.id, 'disposition', event.target.value)}
                                options={DAMAGE_DISPOSITIONS.map((value) => ({ value, label: t(`damageControl.enums.disposition.${value}`) }))}
                                placeholder={t('damageControl.forms.disposition')}
                                disabled={disabled}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.serialNumbers')}</label>
                            <textarea
                                value={item.serialNumbers}
                                onChange={(event) => handleItemChange(item.id, 'serialNumbers', event.target.value)}
                                rows={2}
                                disabled={disabled}
                                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
                                placeholder={t('damageControl.forms.serialNumbersPlaceholder')}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default IncidentItemsCard;

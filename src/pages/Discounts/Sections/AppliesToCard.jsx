import React, { useMemo } from 'react';
import { Button, Card, Select } from '../../../components/common';
import {
    APPLIES_TO_SCOPES,
    INCLUSION_MODES,
    INCLUSION_PRODUCT_SCOPES,
    buildInclusionOptions,
    optionsFrom,
} from '../constants';

const AppliesToCard = ({ form, setForm, refData }) => {
    const productTemplateOptions = useMemo(
        () => (refData.productTemplates || []).map((t) => ({ value: t.id, label: t.name || t.id })),
        [refData.productTemplates],
    );
    const productVariantOptions = useMemo(
        () => (refData.productVariants || []).map((v) => {
            const sku = v.sku || '';
            const name = v.name || '';
            let label;
            if (sku && name) label = `${sku} — ${name}`;
            else label = sku || name || v.id;
            return { value: v.id, label };
        }),
        [refData.productVariants],
    );
    const categoryOptions = useMemo(
        () => (refData.categories || []).map((c) => ({ value: c.id, label: c.name || c.id })),
        [refData.categories],
    );

    const getOptions = (scope) => {
        if (scope === 'PRODUCT') return productTemplateOptions;
        if (scope === 'VARIANT') return productVariantOptions;
        if (scope === 'CATEGORY') return categoryOptions;
        return [];
    };

    const addInclusion = () => setForm((f) => ({
        ...f,
        productInclusions: [...f.productInclusions, { scope: 'PRODUCT', entityId: '', mode: 'INCLUDE' }],
    }));
    const updateInclusion = (idx, key, value) => setForm((f) => ({
        ...f,
        productInclusions: f.productInclusions.map((p, i) => {
            if (i !== idx) return p;
            if (key === 'scope') return { ...p, scope: value, entityId: '' };
            return { ...p, [key]: value };
        }),
    }));
    const removeInclusion = (idx) => setForm((f) => ({
        ...f,
        productInclusions: f.productInclusions.filter((_, i) => i !== idx),
    }));

    return (
        <Card title="Applies To" subtitle="Limit the discount to specific products, variants, or categories.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                    label="Applies To Scope"
                    value={form.appliesToScope}
                    onChange={(e) => setForm((f) => ({ ...f, appliesToScope: e.target.value }))}
                    options={optionsFrom(APPLIES_TO_SCOPES)}
                />
            </div>

            <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Product Inclusions</h4>
                    <Button type="button" size="sm" variant="secondary" onClick={addInclusion}>Add</Button>
                </div>
                <div className="space-y-2">
                    {form.productInclusions.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No product inclusions.</p>
                    )}
                    {form.productInclusions.map((inc, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            <Select value={inc.scope}
                                onChange={(e) => updateInclusion(idx, 'scope', e.target.value)}
                                options={optionsFrom(INCLUSION_PRODUCT_SCOPES)} />
                            <Select
                                value={inc.entityId}
                                onChange={(e) => updateInclusion(idx, 'entityId', e.target.value)}
                                options={buildInclusionOptions(getOptions(inc.scope), inc.entityId, refData.refDataLoading)}
                                placeholder={inc.scope === 'PRODUCT' ? 'Select product' : inc.scope === 'VARIANT' ? 'Select variant' : 'Select category'}
                            />
                            <Select value={inc.mode}
                                onChange={(e) => updateInclusion(idx, 'mode', e.target.value)}
                                options={optionsFrom(INCLUSION_MODES)} />
                            <Button type="button" size="sm" variant="danger" onClick={() => removeInclusion(idx)}>Remove</Button>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default AppliesToCard;

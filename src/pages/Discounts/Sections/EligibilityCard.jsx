import React, { useMemo } from 'react';
import { Button, Card, Select } from '../../../components/common';
import {
    CUSTOMER_CATEGORY_VALUES,
    CUSTOMER_ELIGIBILITIES,
    INCLUSION_CUSTOMER_SCOPES,
    INCLUSION_MODES,
    buildInclusionOptions,
    optionsFrom,
} from '../constants';

const EligibilityCard = ({ form, setForm, refData }) => {
    const customerOptions = useMemo(
        () => (refData.customers || []).map((c) => {
            const name = c.name || c.fullName || c.displayName || '';
            const email = c.email || '';
            let label;
            if (name && email) label = `${name} — ${email}`;
            else label = name || email || c.id;
            return { value: c.id, label };
        }),
        [refData.customers],
    );
    const customerCategoryOptions = useMemo(
        () => CUSTOMER_CATEGORY_VALUES.map((v) => ({ value: v, label: v })),
        [],
    );

    const getOptions = (scope) => {
        if (scope === 'CUSTOMER') return customerOptions;
        if (scope === 'CUSTOMER_CATEGORY') return customerCategoryOptions;
        return [];
    };

    const addInclusion = () => setForm((f) => ({
        ...f,
        customerInclusions: [...f.customerInclusions, { scope: 'CUSTOMER', entityId: '', mode: 'INCLUDE' }],
    }));
    const updateInclusion = (idx, key, value) => setForm((f) => ({
        ...f,
        customerInclusions: f.customerInclusions.map((c, i) => {
            if (i !== idx) return c;
            if (key === 'scope') return { ...c, scope: value, entityId: '' };
            return { ...c, [key]: value };
        }),
    }));
    const removeInclusion = (idx) => setForm((f) => ({
        ...f,
        customerInclusions: f.customerInclusions.filter((_, i) => i !== idx),
    }));

    return (
        <Card title="Eligibility" subtitle="Choose which customers can use this discount.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                    label="Customer Eligibility"
                    value={form.customerEligibility}
                    onChange={(e) => setForm((f) => ({ ...f, customerEligibility: e.target.value }))}
                    options={optionsFrom(CUSTOMER_ELIGIBILITIES)}
                />
            </div>

            <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Customer Inclusions</h4>
                    <Button type="button" size="sm" variant="secondary" onClick={addInclusion}>Add</Button>
                </div>
                <div className="space-y-2">
                    {form.customerInclusions.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No customer inclusions.</p>
                    )}
                    {form.customerInclusions.map((inc, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            <Select value={inc.scope}
                                onChange={(e) => updateInclusion(idx, 'scope', e.target.value)}
                                options={optionsFrom(INCLUSION_CUSTOMER_SCOPES)} />
                            <Select
                                value={inc.entityId}
                                onChange={(e) => updateInclusion(idx, 'entityId', e.target.value)}
                                options={buildInclusionOptions(getOptions(inc.scope), inc.entityId, refData.refDataLoading)}
                                placeholder={inc.scope === 'CUSTOMER' ? 'Select customer' : 'Select customer category'}
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

export default EligibilityCard;

import React from 'react';
import { Button, Card, Input, Select } from '../../../components/common';
import { VALUE_TYPES, optionsFrom } from '../constants';

const ValueCard = ({ form, setForm }) => {
    const updateTier = (idx, key, value) => setForm((f) => ({
        ...f,
        tiers: f.tiers.map((t, i) => (i === idx ? { ...t, [key]: value } : t)),
    }));
    const addTier = () => setForm((f) => ({
        ...f,
        tiers: [...f.tiers, { minSubtotal: '', minQuantity: '', valueType: 'PERCENTAGE', value: '', sortOrder: f.tiers.length }],
    }));
    const removeTier = (idx) => setForm((f) => ({
        ...f,
        tiers: f.tiers.filter((_, i) => i !== idx),
    }));

    const isAmount = form.kind === 'AMOUNT_OFF_ORDER' || form.kind === 'AMOUNT_OFF_PRODUCTS';
    const isBogo = form.kind === 'BOGO';
    const isBundle = form.kind === 'BUNDLE';
    const isFreeShipping = form.kind === 'FREE_SHIPPING';
    const isTiered = form.kind === 'TIERED_AMOUNT_OFF_ORDER' || form.kind === 'TIERED_AMOUNT_OFF_PRODUCTS';

    return (
        <Card title="Value" subtitle="Define how the discount calculates its reward.">
            {isAmount && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Select
                        label="Value Type"
                        value={form.valueType}
                        onChange={(e) => setForm((f) => ({ ...f, valueType: e.target.value }))}
                        options={optionsFrom(VALUE_TYPES)}
                    />
                    <Input
                        label="Value"
                        type="number"
                        step="0.01"
                        value={form.value}
                        onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    />
                    <Input
                        label="Max Discount Amount"
                        type="number"
                        step="0.01"
                        value={form.maxDiscountAmount}
                        onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
                    />
                </div>
            )}

            {isBogo && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                        label="Buy Quantity"
                        type="number"
                        value={form.bogoBuyQuantity}
                        onChange={(e) => setForm((f) => ({ ...f, bogoBuyQuantity: e.target.value }))}
                    />
                    <Input
                        label="Get Quantity"
                        type="number"
                        value={form.bogoGetQuantity}
                        onChange={(e) => setForm((f) => ({ ...f, bogoGetQuantity: e.target.value }))}
                    />
                    <Select
                        label="Get Value Type"
                        value={form.bogoGetValueType}
                        onChange={(e) => setForm((f) => ({ ...f, bogoGetValueType: e.target.value }))}
                        options={optionsFrom(VALUE_TYPES)}
                    />
                    <Input
                        label="Get Value"
                        type="number"
                        step="0.01"
                        value={form.bogoGetValue}
                        onChange={(e) => setForm((f) => ({ ...f, bogoGetValue: e.target.value }))}
                    />
                </div>
            )}

            {isBundle && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                        label="Bundle Quantity"
                        type="number"
                        value={form.bundleQuantity}
                        onChange={(e) => setForm((f) => ({ ...f, bundleQuantity: e.target.value }))}
                    />
                    <Input
                        label="Bundle Price"
                        type="number"
                        step="0.01"
                        value={form.bundlePrice}
                        onChange={(e) => setForm((f) => ({ ...f, bundlePrice: e.target.value }))}
                    />
                </div>
            )}

            {isFreeShipping && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                        label="Max Amount"
                        type="number"
                        step="0.01"
                        value={form.freeShippingMaxAmount}
                        onChange={(e) => setForm((f) => ({ ...f, freeShippingMaxAmount: e.target.value }))}
                    />
                    <Input
                        label="Countries (CSV)"
                        value={form.freeShippingCountries}
                        onChange={(e) => setForm((f) => ({ ...f, freeShippingCountries: e.target.value }))}
                        placeholder="US, CA, GB"
                    />
                </div>
            )}

            {isTiered && (
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">Tiers</h4>
                        <Button type="button" size="sm" variant="secondary" onClick={addTier}>Add Tier</Button>
                    </div>
                    <div className="space-y-2">
                        {form.tiers.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No tiers configured.</p>
                        )}
                        {form.tiers.map((tier, idx) => (
                            <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-6 dark:border-slate-700">
                                <Input label="Min Subtotal" type="number" step="0.01" value={tier.minSubtotal}
                                    onChange={(e) => updateTier(idx, 'minSubtotal', e.target.value)} />
                                <Input label="Min Qty" type="number" value={tier.minQuantity}
                                    onChange={(e) => updateTier(idx, 'minQuantity', e.target.value)} />
                                <Select label="Value Type" value={tier.valueType}
                                    onChange={(e) => updateTier(idx, 'valueType', e.target.value)}
                                    options={optionsFrom(VALUE_TYPES)} />
                                <Input label="Value" type="number" step="0.01" value={tier.value}
                                    onChange={(e) => updateTier(idx, 'value', e.target.value)} />
                                <Input label="Sort Order" type="number" value={tier.sortOrder}
                                    onChange={(e) => updateTier(idx, 'sortOrder', e.target.value)} />
                                <div className="flex items-end">
                                    <Button type="button" size="sm" variant="danger" onClick={() => removeTier(idx)}>Remove</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default ValueCard;

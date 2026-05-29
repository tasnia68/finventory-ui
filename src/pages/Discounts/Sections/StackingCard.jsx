import React from 'react';
import { Card, Input } from '../../../components/common';

const StackingCard = ({ form, setForm }) => (
    <Card title="Stacking" subtitle="Control how this discount combines with other promotions.">
        <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.stackable}
                    onChange={(e) => setForm((f) => ({ ...f, stackable: e.target.checked }))}
                />
                Stackable
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.combineWithOrderDiscounts}
                    onChange={(e) => setForm((f) => ({ ...f, combineWithOrderDiscounts: e.target.checked }))}
                />
                Combine w/ Order
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.combineWithProductDiscounts}
                    onChange={(e) => setForm((f) => ({ ...f, combineWithProductDiscounts: e.target.checked }))}
                />
                Combine w/ Product
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.combineWithShippingDiscounts}
                    onChange={(e) => setForm((f) => ({ ...f, combineWithShippingDiscounts: e.target.checked }))}
                />
                Combine w/ Shipping
            </label>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
                label="Exclusion Group"
                value={form.exclusionGroup}
                onChange={(e) => setForm((f) => ({ ...f, exclusionGroup: e.target.value }))}
            />
        </div>
    </Card>
);

export default StackingCard;

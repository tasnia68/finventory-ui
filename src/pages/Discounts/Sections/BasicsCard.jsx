import React from 'react';
import { Card, Input, Select } from '../../../components/common';
import Field from '../Field';
import {
    DISCOUNT_KINDS,
    DISCOUNT_STATUSES,
    SALES_CHANNELS,
    inputClass,
    optionsFrom,
} from '../constants';

const BasicsCard = ({ form, setForm }) => (
    <Card title="Basics" subtitle="Identify and classify the discount campaign.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                options={optionsFrom(DISCOUNT_STATUSES)}
            />
            <Field label="Description" className="md:col-span-2">
                <textarea
                    className={inputClass}
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </Field>
            <Select
                label="Kind"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                options={optionsFrom(DISCOUNT_KINDS)}
            />
            <Select
                label="Sales Channel"
                value={form.salesChannel}
                onChange={(e) => setForm((f) => ({ ...f, salesChannel: e.target.value }))}
                options={optionsFrom(SALES_CHANNELS)}
            />
            <Input
                label="Priority"
                type="number"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.autoApply}
                    onChange={(e) => setForm((f) => ({ ...f, autoApply: e.target.checked }))}
                />
                Auto Apply
            </label>
        </div>
    </Card>
);

export default BasicsCard;

import React from 'react';
import { Card, Input, Select } from '../../../components/common';
import Field from '../Field';
import { DAYS_OF_WEEK, MIN_PURCHASE_TYPES, optionsFrom } from '../constants';

const ScheduleLimitsCard = ({ form, setForm }) => {
    const toggleDayOfWeek = (day) => setForm((f) => ({
        ...f,
        scheduleDaysOfWeek: f.scheduleDaysOfWeek.includes(day)
            ? f.scheduleDaysOfWeek.filter((d) => d !== day)
            : [...f.scheduleDaysOfWeek, day],
    }));

    return (
        <Card title="Schedule & Limits" subtitle="Control when the discount is active and how often it can be used.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                    label="Starts At"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
                <Input
                    label="Ends At"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
                <Field label="Schedule Days of Week" className="md:col-span-2">
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                            <button
                                type="button"
                                key={day}
                                onClick={() => toggleDayOfWeek(day)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.scheduleDaysOfWeek.includes(day)
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </Field>
                <Input
                    label="Schedule Start Time"
                    type="time"
                    value={form.scheduleStartTime}
                    onChange={(e) => setForm((f) => ({ ...f, scheduleStartTime: e.target.value }))}
                />
                <Input
                    label="Schedule End Time"
                    type="time"
                    value={form.scheduleEndTime}
                    onChange={(e) => setForm((f) => ({ ...f, scheduleEndTime: e.target.value }))}
                />
                <Input
                    label="Schedule Timezone"
                    value={form.scheduleTimezone}
                    onChange={(e) => setForm((f) => ({ ...f, scheduleTimezone: e.target.value }))}
                    placeholder="e.g. America/Los_Angeles"
                />
                <Select
                    label="Min Purchase Type"
                    value={form.minPurchaseType}
                    onChange={(e) => setForm((f) => ({ ...f, minPurchaseType: e.target.value }))}
                    options={optionsFrom(MIN_PURCHASE_TYPES)}
                />
                {form.minPurchaseType === 'AMOUNT' && (
                    <Input
                        label="Min Purchase Amount"
                        type="number"
                        step="0.01"
                        value={form.minPurchaseAmount}
                        onChange={(e) => setForm((f) => ({ ...f, minPurchaseAmount: e.target.value }))}
                    />
                )}
                {form.minPurchaseType === 'QUANTITY' && (
                    <Input
                        label="Min Purchase Quantity"
                        type="number"
                        value={form.minPurchaseQuantity}
                        onChange={(e) => setForm((f) => ({ ...f, minPurchaseQuantity: e.target.value }))}
                    />
                )}
                <Input
                    label="Usage Limit Total"
                    type="number"
                    value={form.usageLimitTotal}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimitTotal: e.target.value }))}
                />
                <Input
                    label="Usage Limit Per Customer"
                    type="number"
                    value={form.usageLimitPerCustomer}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimitPerCustomer: e.target.value }))}
                />
            </div>
        </Card>
    );
};

export default ScheduleLimitsCard;

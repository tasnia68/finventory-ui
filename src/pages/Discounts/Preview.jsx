import React, { useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Input,
    MetricCard,
    Select,
} from '../../components/common';
import { previewPricing } from '../../services/discountService';
import { optionsFrom, parseCsv, toNumberOrNull } from './constants';

const createPreviewLine = () => ({
    id: crypto.randomUUID(),
    productVariantId: '',
    categoryId: '',
    quantity: '1',
    unitPrice: '',
});

const createPreviewForm = () => ({
    customerId: '',
    salesChannel: 'ONLINE',
    discountCodes: '',
    giftCardCodes: '',
    referralCode: '',
    shippingAmount: '',
    items: [createPreviewLine()],
});

const DiscountsPreview = () => {
    const [form, setForm] = useState(createPreviewForm());
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const updateLine = (lineId, key, value) => {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === lineId ? { ...item, [key]: value } : item)),
        }));
    };
    const addLine = () => setForm((current) => ({ ...current, items: [...current.items, createPreviewLine()] }));
    const removeLine = (lineId) => setForm((current) => ({
        ...current,
        items: current.items.length > 1 ? current.items.filter((item) => item.id !== lineId) : current.items,
    }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        const items = form.items
            .filter((i) => Number(i.quantity) > 0)
            .map((i) => ({
                productVariantId: i.productVariantId || null,
                categoryId: i.categoryId || null,
                quantity: Number(i.quantity),
                unitPrice: toNumberOrNull(i.unitPrice) ?? 0,
            }));

        if (items.length === 0) {
            showAlert('error', 'Add at least one line item');
            return;
        }

        const payload = {
            customerId: form.customerId || null,
            salesChannel: form.salesChannel,
            discountCodes: parseCsv(form.discountCodes),
            giftCardCodes: parseCsv(form.giftCardCodes),
            referralCode: form.referralCode || null,
            shippingAmount: toNumberOrNull(form.shippingAmount) ?? 0,
            items,
        };

        try {
            setLoading(true);
            const data = await previewPricing(payload);
            setResult(data);
        } catch (error) {
            showAlert('error', error.message || 'Preview failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pricing preview</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Simulate cart pricing and discount application
                    </p>
                </div>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input
                            label="Customer ID"
                            value={form.customerId}
                            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                        />
                        <Select
                            label="Sales Channel"
                            value={form.salesChannel}
                            onChange={(e) => setForm((f) => ({ ...f, salesChannel: e.target.value }))}
                            options={optionsFrom(['ONLINE', 'POS'])}
                        />
                        <Input
                            label="Shipping Amount"
                            type="number"
                            step="0.01"
                            value={form.shippingAmount}
                            onChange={(e) => setForm((f) => ({ ...f, shippingAmount: e.target.value }))}
                        />
                        <Input
                            label="Discount Codes (comma-separated)"
                            value={form.discountCodes}
                            onChange={(e) => setForm((f) => ({ ...f, discountCodes: e.target.value }))}
                        />
                        <Input
                            label="Gift Card Codes (comma-separated)"
                            value={form.giftCardCodes}
                            onChange={(e) => setForm((f) => ({ ...f, giftCardCodes: e.target.value }))}
                        />
                        <Input
                            label="Referral Code"
                            value={form.referralCode}
                            onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value }))}
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold">Line Items</h3>
                            <Button type="button" size="sm" variant="secondary" onClick={addLine}>Add Line</Button>
                        </div>
                        <div className="space-y-2">
                            {form.items.map((item) => (
                                <div key={item.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-5 dark:border-slate-700">
                                    <Input
                                        label="Variant ID"
                                        value={item.productVariantId}
                                        onChange={(e) => updateLine(item.id, 'productVariantId', e.target.value)}
                                    />
                                    <Input
                                        label="Category ID"
                                        value={item.categoryId}
                                        onChange={(e) => updateLine(item.id, 'categoryId', e.target.value)}
                                    />
                                    <Input
                                        label="Qty"
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateLine(item.id, 'quantity', e.target.value)}
                                    />
                                    <Input
                                        label="Unit Price"
                                        type="number"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => updateLine(item.id, 'unitPrice', e.target.value)}
                                    />
                                    <div className="flex items-end">
                                        <Button type="button" size="sm" variant="danger" onClick={() => removeLine(item.id)}>
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button type="submit" loading={loading}>Preview Pricing</Button>
                </form>

                {result && (
                    <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <MetricCard title="Subtotal" value={result.subtotal ?? 0} icon="receipt_long" tone="slate" />
                            <MetricCard title="Total Discount" value={result.totalDiscount ?? 0} icon="local_offer" tone="rose" />
                            <MetricCard title="Shipping Discount" value={result.shippingDiscount ?? 0} icon="local_shipping" tone="violet" />
                            <MetricCard title="Grand Total" value={result.grandTotal ?? 0} icon="payments" tone="emerald" />
                        </div>
                        {Array.isArray(result.applied) && result.applied.length > 0 && (
                            <div>
                                <h4 className="mb-2 font-semibold">Applied</h4>
                                <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
                                    {JSON.stringify(result.applied, null, 2)}
                                </pre>
                            </div>
                        )}
                        {Array.isArray(result.rejectedCodes) && result.rejectedCodes.length > 0 && (
                            <div>
                                <h4 className="mb-2 font-semibold">Rejected Codes</h4>
                                <pre className="overflow-auto rounded-lg bg-red-50 p-3 text-xs dark:bg-red-900/20">
                                    {JSON.stringify(result.rejectedCodes, null, 2)}
                                </pre>
                            </div>
                        )}
                        {Array.isArray(result.warnings) && result.warnings.length > 0 && (
                            <div>
                                <h4 className="mb-2 font-semibold">Warnings</h4>
                                <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
                                    {result.warnings.map((w, i) => <li key={i}>{typeof w === 'string' ? w : JSON.stringify(w)}</li>)}
                                </ul>
                            </div>
                        )}
                        {Array.isArray(result.lines) && result.lines.length > 0 && (
                            <div>
                                <h4 className="mb-2 font-semibold">Lines</h4>
                                <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
                                    {JSON.stringify(result.lines, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DiscountsPreview;

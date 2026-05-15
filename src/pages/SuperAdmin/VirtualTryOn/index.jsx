import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, DataTable, Input } from '../../../components/common';
import {
    getVirtualTryOnTenants,
    updateVirtualTryOnTenant,
    getVirtualTryOnApiKeyStatus,
    setVirtualTryOnApiKey,
    setVirtualTryOnModel,
} from '../../../services/virtualTryOnSettingsService';

const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const VirtualTryOnAdmin = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
    const [apiKeyDraft, setApiKeyDraft] = useState('');
    const [model, setModel] = useState('');
    const [defaultModel, setDefaultModel] = useState('');
    const [modelDraft, setModelDraft] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const [savingModel, setSavingModel] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [drafts, setDrafts] = useState({});

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const [t, k] = await Promise.all([getVirtualTryOnTenants(), getVirtualTryOnApiKeyStatus()]);
            const list = toList(t);
            setTenants(list);
            const initialDrafts = {};
            list.forEach((row) => {
                initialDrafts[row.tenantId] = {
                    enabled: !!row.enabled,
                    maxPerCustomerPerDay: row.maxPerCustomerPerDay ?? 3,
                    maxPerTenantPerMonth: row.maxPerTenantPerMonth ?? 500,
                };
            });
            setDrafts(initialDrafts);
            const status = k?.data || k;
            setApiKeyConfigured(!!status?.configured);
            setModel(status?.model || '');
            setDefaultModel(status?.defaultModel || '');
            setModelDraft(status?.model || '');
        } catch (e) {
            setAlert({ type: 'error', message: e.message || 'Failed to load' });
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    };

    const updateDraft = (id, patch) =>
        setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

    const saveTenant = async (id) => {
        const draft = drafts[id];
        if (!draft) return;
        try {
            setSavingId(id);
            await updateVirtualTryOnTenant(id, draft);
            showAlert('success', 'Tenant settings saved');
            await load();
        } catch (e) {
            showAlert('error', e.message || 'Save failed');
        } finally {
            setSavingId(null);
        }
    };

    const saveApiKey = async () => {
        if (!apiKeyDraft.trim()) {
            showAlert('error', 'Enter a non-empty API key');
            return;
        }
        try {
            setSavingKey(true);
            await setVirtualTryOnApiKey(apiKeyDraft.trim());
            showAlert('success', 'Gemini API key saved');
            setApiKeyDraft('');
            setApiKeyConfigured(true);
        } catch (e) {
            showAlert('error', e.message || 'Failed to save key');
        } finally {
            setSavingKey(false);
        }
    };

    const saveModel = async () => {
        try {
            setSavingModel(true);
            await setVirtualTryOnModel(modelDraft.trim());
            showAlert('success', 'Model name saved');
            setModel(modelDraft.trim());
        } catch (e) {
            showAlert('error', e.message || 'Failed to save model');
        } finally {
            setSavingModel(false);
        }
    };

    const columns = [
        {
            key: 'tenantName',
            header: 'Tenant',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500">{row.subdomain}</div>
                </div>
            ),
        },
        {
            key: 'enabled',
            header: 'Enabled',
            render: (_, row) => {
                const draft = drafts[row.tenantId] || row;
                return (
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!draft.enabled}
                            onChange={(e) => updateDraft(row.tenantId, { enabled: e.target.checked })}
                        />
                        <span className="text-xs">{draft.enabled ? 'On' : 'Off'}</span>
                    </label>
                );
            },
        },
        {
            key: 'maxPerCustomerPerDay',
            header: 'Per customer / day',
            render: (_, row) => {
                const draft = drafts[row.tenantId] || row;
                return (
                    <input
                        type="number" min="0" step="1"
                        className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                        value={draft.maxPerCustomerPerDay ?? 0}
                        onChange={(e) => updateDraft(row.tenantId, { maxPerCustomerPerDay: Number(e.target.value) })}
                    />
                );
            },
        },
        {
            key: 'maxPerTenantPerMonth',
            header: 'Per tenant / month',
            render: (_, row) => {
                const draft = drafts[row.tenantId] || row;
                return (
                    <input
                        type="number" min="0" step="1"
                        className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                        value={draft.maxPerTenantPerMonth ?? 0}
                        onChange={(e) => updateDraft(row.tenantId, { maxPerTenantPerMonth: Number(e.target.value) })}
                    />
                );
            },
        },
        {
            key: 'actions',
            header: '',
            render: (_, row) => (
                <Button size="sm" variant="secondary" disabled={savingId === row.tenantId} onClick={() => saveTenant(row.tenantId)}>
                    {savingId === row.tenantId ? 'Saving…' : 'Save'}
                </Button>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-6 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Super Admin</div>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Virtual Try-On</h1>
                    <p className="mt-1 text-sm text-slate-500">Allow tenants to use AI try-on, set per-customer and per-tenant generation caps, and manage the platform Gemini API key.</p>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <Card title="Platform Gemini API key" subtitle="Used by every tenant that has try-on enabled. Stored once at the platform level.">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Input
                                label="API key"
                                type="password"
                                value={apiKeyDraft}
                                onChange={(e) => setApiKeyDraft(e.target.value)}
                                placeholder={apiKeyConfigured ? '•••••••• (set — paste new key to replace)' : 'Paste your Gemini API key'}
                            />
                        </div>
                        <Button onClick={saveApiKey} disabled={savingKey}>{savingKey ? 'Saving…' : 'Save key'}</Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Status: {apiKeyConfigured
                            ? <span className="text-emerald-600">configured</span>
                            : <span className="text-rose-600">not configured — try-on will fail until set</span>}
                    </p>

                    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model</label>
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                                {
                                    value: 'gemini-3.1-flash-image-preview',
                                    title: 'Gemini 3.1 Flash Image',
                                    blurb: 'High-efficiency successor — optimized for speed and high-volume use cases.',
                                },
                                {
                                    value: 'gemini-3-pro-image-preview',
                                    title: 'Gemini 3 Pro Image',
                                    blurb: 'Highest quality — slower per request, best for hero / showcase try-ons.',
                                },
                            ].map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors ${
                                        modelDraft === opt.value
                                            ? 'border-primary bg-primary/5 dark:border-primary'
                                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="vto-model"
                                            value={opt.value}
                                            checked={modelDraft === opt.value}
                                            onChange={(e) => setModelDraft(e.target.value)}
                                        />
                                        <span className="font-semibold">{opt.title}</span>
                                    </span>
                                    <span className="text-xs text-slate-500">{opt.blurb}</span>
                                    <span className="font-mono text-[11px] text-slate-400">{opt.value}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <Button variant="secondary" onClick={saveModel} disabled={savingModel || !modelDraft}>
                                {savingModel ? 'Saving…' : 'Save model'}
                            </Button>
                            <p className="text-xs text-slate-500">
                                Current: <span className="font-mono">{model || defaultModel}</span>
                            </p>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden" title="Tenant entitlements" subtitle="Toggle each tenant and adjust quota caps. New tenants default to disabled.">
                    <DataTable
                        columns={columns}
                        data={tenants}
                        loading={loading}
                        emptyMessage="No tenants found."
                    />
                </Card>
            </div>
        </div>
    );
};

export default VirtualTryOnAdmin;

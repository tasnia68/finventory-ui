import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '../../../components/common';
import * as superAdminService from '../../../services/superAdminService';

const PLAN_OPTIONS = [
    { value: 'FREE', label: 'Free' },
    { value: 'BASIC', label: 'Basic' },
    { value: 'PRO', label: 'Pro' },
    { value: 'ENTERPRISE', label: 'Enterprise' },
];

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
];

const emptyForm = {
    name: '',
    subdomain: '',
    plan: 'BASIC',
    adminEmail: '',
    adminPassword: '',
    status: 'ACTIVE',
};

const TenantsPage = () => {
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) || null;

    const loadTenants = async (tenantToSelect = selectedTenantId) => {
        setLoading(true);
        setError('');
        try {
            const data = await superAdminService.getTenants();
            setTenants(data);
            const nextSelected = tenantToSelect && data.some((tenant) => tenant.id === tenantToSelect)
                ? tenantToSelect
                : data[0]?.id || null;
            setSelectedTenantId(nextSelected);
            if (!nextSelected) {
                setForm(emptyForm);
            }
        } catch (err) {
            setError(err.message || 'Failed to load tenants.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTenants(null);
    }, []);

    useEffect(() => {
        if (selectedTenant) {
            setForm({
                name: selectedTenant.name,
                subdomain: selectedTenant.subdomain,
                plan: selectedTenant.subscriptionPlan,
                adminEmail: '',
                adminPassword: '',
                status: selectedTenant.status,
            });
        } else {
            setForm(emptyForm);
        }
    }, [selectedTenant, selectedTenantId]);

    const updateField = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const resetCreateForm = () => {
        setSelectedTenantId(null);
        setForm(emptyForm);
        setMessage('');
        setError('');
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const created = await superAdminService.createTenant({
                name: form.name,
                subdomain: form.subdomain,
                plan: form.plan,
                adminEmail: form.adminEmail,
                adminPassword: form.adminPassword,
            });
            setMessage(`Tenant ${created.subdomain} created.`);
            await loadTenants(created.id);
        } catch (err) {
            setError(err.message || 'Failed to create tenant.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        if (!selectedTenant) return;
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const updated = await superAdminService.updateTenant(selectedTenant.id, {
                name: form.name,
                subdomain: form.subdomain,
                plan: form.plan,
                status: form.status,
            });
            setMessage(`Tenant ${updated.subdomain} updated.`);
            await loadTenants(updated.id);
        } catch (err) {
            setError(err.message || 'Failed to update tenant.');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusAction = async (tenantId, action) => {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const result = action === 'activate'
                ? await superAdminService.activateTenant(tenantId)
                : await superAdminService.deactivateTenant(tenantId);
            setMessage(`Tenant ${result.subdomain} ${action}d.`);
            await loadTenants(tenantId);
        } catch (err) {
            setError(err.message || `Failed to ${action} tenant.`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (tenantId) => {
        if (!window.confirm('Remove this tenant? This deletes the tenant record.')) {
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await superAdminService.deleteTenant(tenantId);
            setMessage('Tenant removed.');
            await loadTenants(null);
        } catch (err) {
            setError(err.message || 'Failed to remove tenant.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Tenant Control</h1>
                <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                    Platform-only workspace for creating, configuring, activating, deactivating, and removing tenants.
                </p>
            </div>

            {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
            {message && <Alert type="success" message={message} onDismiss={() => setMessage('')} />}

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card
                    title="Tenants"
                    subtitle="All tenant workspaces currently registered on this platform."
                    action={<Button variant="secondary" icon="add_business" onClick={resetCreateForm}>New tenant</Button>}
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    <th className="pb-3 pr-4">Tenant</th>
                                    <th className="pb-3 pr-4">Workspace</th>
                                    <th className="pb-3 pr-4">Plan</th>
                                    <th className="pb-3 pr-4">Status</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {tenants.map((tenant) => (
                                    <tr
                                        key={tenant.id}
                                        className={`cursor-pointer transition-colors ${tenant.id === selectedTenantId ? 'bg-slate-50 dark:bg-slate-900/60' : 'hover:bg-slate-50/70 dark:hover:bg-slate-900/40'}`}
                                        onClick={() => setSelectedTenantId(tenant.id)}
                                    >
                                        <td className="py-4 pr-4">
                                            <div className="font-semibold text-slate-900 dark:text-white">{tenant.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{tenant.id}</div>
                                        </td>
                                        <td className="py-4 pr-4 text-sm text-slate-700 dark:text-slate-300">{tenant.subdomain}</td>
                                        <td className="py-4 pr-4 text-sm text-slate-700 dark:text-slate-300">{tenant.subscriptionPlan}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : tenant.status === 'INACTIVE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); handleStatusAction(tenant.id, 'activate'); }}>
                                                    Activate
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); handleStatusAction(tenant.id, 'deactivate'); }}>
                                                    Inactivate
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={(event) => { event.stopPropagation(); handleDelete(tenant.id); }}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && tenants.length === 0 && (
                            <div className="py-8 text-sm text-slate-500 dark:text-slate-400">No tenants found.</div>
                        )}
                        {loading && (
                            <div className="py-8 text-sm text-slate-500 dark:text-slate-400">Loading tenants...</div>
                        )}
                    </div>
                </Card>

                <Card
                    title={selectedTenant ? 'Tenant configuration' : 'Create tenant'}
                    subtitle={selectedTenant ? 'Edit the selected tenant and control its operational status.' : 'Provision a new tenant and its first admin user.'}
                >
                    <form className="space-y-4" onSubmit={selectedTenant ? handleUpdate : handleCreate}>
                        <Input label="Tenant name" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
                        <Input label="Workspace slug" value={form.subdomain} onChange={(event) => updateField('subdomain', event.target.value)} required />
                        <Select label="Plan" value={form.plan} onChange={(event) => updateField('plan', event.target.value)} options={PLAN_OPTIONS} required />

                        {selectedTenant ? (
                            <Select label="Status" value={form.status} onChange={(event) => updateField('status', event.target.value)} options={STATUS_OPTIONS} required />
                        ) : (
                            <>
                                <Input label="Admin email" type="email" value={form.adminEmail} onChange={(event) => updateField('adminEmail', event.target.value)} required />
                                <Input label="Admin password" type="password" value={form.adminPassword} onChange={(event) => updateField('adminPassword', event.target.value)} required />
                            </>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <Button type="submit" loading={saving}>
                                {selectedTenant ? 'Save tenant' : 'Create tenant'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={resetCreateForm}>
                                New tenant form
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default TenantsPage;

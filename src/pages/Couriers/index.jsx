import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Modal, Select } from '../../components/common';
import {
    getCourierProfiles,
    createCourierProfile,
    updateCourierProfile,
    deleteCourierProfile,
    getCourierBalance,
    getCourierProviders,
    syncSteadfastPayments,
} from '../../services/courierService';
import RateCardModal from './RateCardModal';

const CREDENTIAL_TEMPLATES = {
    STEADFAST: '{\n  "api_key": "",\n  "secret_key": ""\n}',
    PATHAO: '{\n  "client_id": "",\n  "client_secret": "",\n  "username": "",\n  "password": ""\n}',
    MANUAL: '',
};

const emptyForm = () => ({
    providerCode: '',
    displayName: '',
    credentialsJson: '',
    configJson: '',
    isDefault: false,
    isActive: true,
});

const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const Couriers = () => {
    const [profiles, setProfiles] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [rateCardProfile, setRateCardProfile] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const load = async () => {
        try {
            setLoading(true);
            const [profileData, providerData] = await Promise.all([getCourierProfiles(), getCourierProviders()]);
            setProfiles(toList(profileData));
            setProviders(toList(providerData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load courier profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const providerOptions = useMemo(
        () => providers.map((code) => ({ value: code, label: code })),
        [providers],
    );

    const summary = useMemo(
        () => ({
            total: profiles.length,
            active: profiles.filter((p) => p.isActive ?? p.active).length,
            defaultName: profiles.find((p) => p.isDefault ?? p.default)?.displayName || 'None',
        }),
        [profiles],
    );

    const openCreate = () => {
        setEditing(null);
        setFormData(emptyForm());
        setShowForm(true);
    };

    const openEdit = (profile) => {
        setEditing(profile);
        setFormData({
            providerCode: profile.providerCode,
            displayName: profile.displayName,
            credentialsJson: profile.credentialsJson || '',
            configJson: profile.configJson || '',
            isDefault: profile.isDefault ?? profile.default ?? false,
            isActive: profile.isActive ?? profile.active ?? true,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.providerCode || !formData.displayName) {
            showAlert('error', 'Provider and display name are required');
            return;
        }
        if (formData.credentialsJson) {
            try {
                JSON.parse(formData.credentialsJson);
            } catch (err) {
                showAlert('error', 'Credentials must be valid JSON: ' + err.message);
                return;
            }
        }
        try {
            setSaving(true);
            const payload = {
                providerCode: formData.providerCode,
                displayName: formData.displayName,
                credentialsJson: formData.credentialsJson || null,
                configJson: formData.configJson || null,
                isDefault: formData.isDefault,
                isActive: formData.isActive,
            };
            if (editing) {
                await updateCourierProfile(editing.id, payload);
                showAlert('success', 'Courier profile updated');
            } else {
                await createCourierProfile(payload);
                showAlert('success', 'Courier profile created');
            }
            setShowForm(false);
            load();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save courier profile');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (profile) => {
        if (!window.confirm(`Delete courier profile "${profile.displayName}"?`)) return;
        try {
            await deleteCourierProfile(profile.id);
            showAlert('success', 'Courier profile deleted');
            load();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete courier profile');
        }
    };

    const handleBalance = async (profile) => {
        try {
            const balance = await getCourierBalance(profile.id);
            showAlert('success', `${profile.displayName} balance: ${balance}`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to fetch balance');
        }
    };

    const columns = [
        { key: 'displayName', header: 'Name', render: (v, row) => (
            <div>
                <div className="font-semibold">{v}</div>
                <div className="text-xs text-slate-500">{row.providerCode}</div>
            </div>
        ) },
        { key: 'providerCode', header: 'Provider', render: (v) => <Badge variant="info">{v}</Badge> },
        { key: 'isDefault', header: 'Default', render: (v, row) => ((row.isDefault ?? row.default) ? <Badge variant="success">Default</Badge> : null) },
        { key: 'isActive', header: 'Active', render: (v, row) => ((row.isActive ?? row.active) ? <Badge variant="success">Active</Badge> : <Badge variant="default">Inactive</Badge>) },
        { key: 'actions', header: 'Actions', render: (_, row) => (
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => setRateCardProfile(row)}>Rate cards</Button>
                <Button size="sm" variant="ghost" onClick={() => handleBalance(row)}>Balance</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(row)}>Delete</Button>
            </div>
        ) },
    ];

    const applyProviderTemplate = (code) => {
        setFormData((current) => ({
            ...current,
            providerCode: code,
            credentialsJson: current.credentialsJson || CREDENTIAL_TEMPLATES[code] || '',
        }));
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-6 dark:bg-background-dark">
          <div className="mx-auto max-w-7xl space-y-6">
            {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Couriers</h1>
                    <p className="text-sm text-slate-500">Configure courier providers, credentials, and zone-based rates.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={async () => {
                        try {
                            const result = await syncSteadfastPayments();
                            showAlert('success', `Steadfast payments synced — fetched ${result.fetched}, posted ${result.posted}, skipped ${result.skipped}, failed ${result.failed}`);
                        } catch (e) {
                            showAlert('error', e.message || 'Sync failed');
                        }
                    }}>Sync Steadfast payments</Button>
                    <Button onClick={openCreate}>Add courier</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricCard title="Profiles" value={summary.total} caption="Configured courier providers" icon="local_shipping" tone="blue" />
                <MetricCard title="Active" value={summary.active} caption="Profiles available for booking" icon="check_circle" tone="emerald" />
                <MetricCard title="Default" value={summary.defaultName || '—'} caption="Used when no provider is set on a shipment" icon="star" tone="amber" />
            </div>

            <Card title="Courier profiles" padding="none" className="overflow-hidden">
                <DataTable columns={columns} data={profiles} loading={loading} emptyMessage="No courier profiles configured." />
            </Card>

            {showForm ? (
                <Modal
                    isOpen
                    onClose={() => setShowForm(false)}
                    title={editing ? 'Edit courier profile' : 'Add courier profile'}
                    size="lg"
                >
                    <div className="space-y-4">
                        <Select
                            label="Provider"
                            value={formData.providerCode}
                            onChange={(e) => applyProviderTemplate(e.target.value)}
                            options={[{ value: '', label: 'Select provider...' }, ...providerOptions]}
                            disabled={!!editing}
                        />
                        <Input
                            label="Display name"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            placeholder="Steadfast – Main account"
                        />
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Credentials (JSON)</label>
                            <textarea
                                className="mt-1 w-full min-h-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                                value={formData.credentialsJson}
                                onChange={(e) => setFormData({ ...formData, credentialsJson: e.target.value })}
                                placeholder='{"api_key": "...", "secret_key": "..."}'
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Config (JSON, optional)</label>
                            <textarea
                                className="mt-1 w-full min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                                value={formData.configJson}
                                onChange={(e) => setFormData({ ...formData, configJson: e.target.value })}
                                placeholder='{"base_url": "https://sandbox.example.com", "webhookSecret": "..."}'
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formData.isActive}
                                       onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                Active
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formData.isDefault}
                                       onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })} />
                                Default
                            </label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                        </div>
                    </div>
                </Modal>
            ) : null}

            {rateCardProfile ? (
                <RateCardModal
                    profile={rateCardProfile}
                    onClose={() => setRateCardProfile(null)}
                    onAlert={showAlert}
                />
            ) : null}
          </div>
        </div>
    );
};

export default Couriers;

import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Select } from '../../components/common';
import { getSettings } from '../../services/settingsService';
import { useSettings } from '../../contexts/SettingsContext';
import { SETTINGS_INDEX, SETTINGS_MAP, SETTINGS_SECTIONS } from './settingsRegistry';

const buildDefaultState = () => Object.fromEntries(SETTINGS_INDEX.map((setting) => [setting.key, setting.defaultValue]));

const coerceValue = (setting, value) => {
    if (value === undefined || value === null || value === '') {
        return setting.defaultValue;
    }

    switch (setting.type) {
        case 'BOOLEAN':
            return value === true || value === 'true';
        case 'NUMBER': {
            const numericValue = Number(value);
            return Number.isNaN(numericValue) ? setting.defaultValue : numericValue;
        }
        default:
            return String(value);
    }
};

const serializeValue = (setting, value) => {
    switch (setting.type) {
        case 'BOOLEAN':
            return value ? 'true' : 'false';
        case 'NUMBER':
            return String(value ?? 0);
        default:
            return String(value ?? '');
    }
};

const valuesEqual = (left, right) => String(left) === String(right);

const riskToVariant = (risk) => {
    switch (risk) {
        case 'critical':
            return 'danger';
        case 'standard':
            return 'warning';
        default:
            return 'default';
    }
};

const renderSettingControl = (setting, value, handleValueChange) => {
    if (setting.control === 'boolean') {
        return (
            <button
                type="button"
                onClick={() => handleValueChange(setting.key, !value)}
                className={`inline-flex min-w-[104px] items-center justify-between rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
            >
                <span>{value ? 'Enabled' : 'Disabled'}</span>
                <span className={`size-5 rounded-full ${value ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
            </button>
        );
    }

    if (setting.control === 'select') {
        return (
            <Select
                value={String(value)}
                onChange={(event) => handleValueChange(setting.key, setting.type === 'NUMBER' ? Number(event.target.value) : event.target.value)}
                options={setting.options}
                placeholder="Select an option"
            />
        );
    }

    if (setting.control === 'textarea') {
        return (
            <textarea
                value={value}
                onChange={(event) => handleValueChange(setting.key, event.target.value)}
                rows={4}
                placeholder={setting.placeholder}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
        );
    }

    if (setting.control === 'password') {
        return (
            <Input
                type="password"
                value={value}
                onChange={(event) => handleValueChange(setting.key, event.target.value)}
                placeholder={setting.placeholder}
                autoComplete="off"
            />
        );
    }

    return (
        <Input
            type={setting.type === 'NUMBER' ? 'number' : 'text'}
            value={value}
            onChange={(event) => handleValueChange(setting.key, setting.type === 'NUMBER' ? Number(event.target.value) : event.target.value)}
            placeholder={setting.placeholder}
            min={setting.min}
            max={setting.max}
            step={setting.step}
        />
    );
};

export { riskToVariant, renderSettingControl };

const SettingsShell = () => {
    const { saveSettings } = useSettings();
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const [values, setValues] = useState(buildDefaultState);
    const [initialValues, setInitialValues] = useState(buildDefaultState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [alert, setAlert] = useState(null);

    // Backward compat: redirect `/settings?section=foo` → `/settings/foo` once on mount.
    useEffect(() => {
        const requestedSection = searchParams.get('section');
        if (requestedSection && SETTINGS_SECTIONS.some((s) => s.id === requestedSection)) {
            navigate(`/settings/${requestedSection}`, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setLoading(true);
                const payload = await getSettings();
                const nextValues = buildDefaultState();

                payload.forEach((item) => {
                    const definition = SETTINGS_MAP[item.key];
                    if (!definition) {
                        return;
                    }

                    nextValues[item.key] = coerceValue(definition, item.value);
                });

                setValues(nextValues);
                setInitialValues(nextValues);
            } catch (error) {
                console.error('Failed to load settings:', error);
                setAlert({ type: 'error', message: error.message || 'Failed to load settings.' });
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const dirtyKeys = useMemo(() => SETTINGS_INDEX
        .filter((setting) => !valuesEqual(values[setting.key], initialValues[setting.key]))
        .map((setting) => setting.key), [initialValues, values]);

    const dirtyLookup = useMemo(() => new Set(dirtyKeys), [dirtyKeys]);

    const filteredSections = useMemo(() => {
        const query = search.trim().toLowerCase();

        return SETTINGS_SECTIONS.map((section) => {
            const sectionMatch = !query || [section.title, section.description].join(' ').toLowerCase().includes(query);
            const groups = section.groups.map((group) => {
                const groupMatch = !query || [group.title, group.description].join(' ').toLowerCase().includes(query);
                const settings = group.settings.filter((setting) => {
                    if (!query || sectionMatch || groupMatch) {
                        return true;
                    }

                    return [setting.label, setting.helpText, setting.key].filter(Boolean).join(' ').toLowerCase().includes(query);
                });

                return { ...group, settings };
            }).filter((group) => group.settings.length > 0);

            return { ...section, groups };
        }).filter((section) => section.groups.length > 0);
    }, [search]);

    const activeSection = params.sectionId;

    const sectionDirtyCount = (sectionId) => SETTINGS_INDEX.filter((setting) => setting.sectionId === sectionId && dirtyLookup.has(setting.key)).length;

    const handleValueChange = (key, nextValue) => {
        setValues((current) => ({
            ...current,
            [key]: nextValue,
        }));
    };

    const handleReset = () => {
        setValues(initialValues);
        setAlert(null);
    };

    const handleSave = async () => {
        if (dirtyKeys.length === 0) {
            setAlert({ type: 'info', message: 'No changes to save.' });
            return;
        }

        try {
            setSaving(true);
            const payload = dirtyKeys.map((key) => {
                const setting = SETTINGS_MAP[key];
                return {
                    key,
                    value: serializeValue(setting, values[key]),
                    type: setting.type,
                    category: setting.category,
                };
            });

            await saveSettings(payload);
            setInitialValues({ ...values });
            setAlert({ type: 'success', message: `${payload.length} setting${payload.length > 1 ? 's' : ''} updated successfully.` });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setAlert({ type: 'error', message: error.message || 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const outletContext = {
        values,
        handleValueChange,
        dirtyLookup,
        loading,
        filteredSections,
        sectionDirtyCount,
        riskToVariant,
        renderSettingControl: (setting) => renderSettingControl(setting, values[setting.key], handleValueChange),
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.12),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                Settings
                            </span>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white xl:text-[2.2rem]">
                                Centralized tenant configuration for operations, controls, and defaults.
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                All configurable rules live here. Use the section index to move between business areas, review policy-level changes, and save updates per section.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                            <Card className="!p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Sections</div>
                                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{SETTINGS_SECTIONS.length}</div>
                            </Card>
                            <Card className="!p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Configured Fields</div>
                                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{SETTINGS_INDEX.length}</div>
                            </Card>
                            <Card className="!p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pending Changes</div>
                                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{dirtyKeys.length}</div>
                            </Card>
                        </div>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="xl:sticky xl:top-6 xl:self-start">
                        <Card className="space-y-4">
                            <Input
                                label="Search settings"
                                placeholder="Search by label, help text, or key"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                icon="search"
                            />
                            <div className="space-y-2">
                                {filteredSections.map((section) => {
                                    const dirtyCount = sectionDirtyCount(section.id);
                                    const isActive = activeSection === section.id;
                                    return (
                                        <NavLink
                                            key={section.id}
                                            to={`/settings/${section.id}`}
                                            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors ${isActive
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold">{section.title}</div>
                                                <div className="mt-0.5 truncate text-xs text-slate-400">{section.groups.length} groups</div>
                                            </div>
                                            {dirtyCount ? <Badge variant="warning">{dirtyCount}</Badge> : null}
                                        </NavLink>
                                    );
                                })}
                                {filteredSections.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        No sections match your search.
                                    </div>
                                ) : null}
                            </div>
                        </Card>
                    </aside>

                    <div className="space-y-8">
                        <Outlet context={outletContext} />
                    </div>
                </div>
            </div>

            {dirtyKeys.length ? (
                <div className="fixed bottom-6 left-1/2 z-30 w-[min(960px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">Unsaved settings changes</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{dirtyKeys.length} setting{dirtyKeys.length > 1 ? 's' : ''} changed across settings.</div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={handleReset}>Reset changes</Button>
                            <Button icon="save" onClick={handleSave} loading={saving}>Save settings</Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default SettingsShell;

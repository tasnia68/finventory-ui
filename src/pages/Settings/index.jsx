import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const SettingsPage = () => {
    const { saveSettings } = useSettings();
    const [searchParams] = useSearchParams();
    const requestedSection = searchParams.get('section');
    const [values, setValues] = useState(buildDefaultState);
    const [initialValues, setInitialValues] = useState(buildDefaultState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [activeSection, setActiveSection] = useState(
        (requestedSection && SETTINGS_SECTIONS.some((s) => s.id === requestedSection))
            ? requestedSection
            : (SETTINGS_SECTIONS[0]?.id || 'general')
    );
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        if (requestedSection && SETTINGS_SECTIONS.some((s) => s.id === requestedSection)) {
            setActiveSection(requestedSection);
            // Wait a tick so the section list is rendered, then scroll.
            setTimeout(() => {
                const target = document.getElementById(`settings-section-${requestedSection}`);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    }, [requestedSection]);

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

    useEffect(() => {
        if (!filteredSections.some((section) => section.id === activeSection)) {
            setActiveSection(filteredSections[0]?.id || SETTINGS_SECTIONS[0]?.id || 'general');
        }
    }, [activeSection, filteredSections]);

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

    const scrollToSection = (sectionId) => {
        setActiveSection(sectionId);
        const target = document.getElementById(`settings-section-${sectionId}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const renderSettingControl = (setting) => {
        const value = values[setting.key];

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
                                All configurable rules live here in one page. Use the section index to move between business areas, review policy-level changes, and save updates in one flow.
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
                                    return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => scrollToSection(section.id)}
                                            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors ${activeSection === section.id
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold">{section.title}</div>
                                                <div className="mt-0.5 truncate text-xs text-slate-400">{section.groups.length} groups</div>
                                            </div>
                                            {dirtyCount ? <Badge variant="warning">{dirtyCount}</Badge> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </aside>

                    <div className="space-y-8">
                        {loading ? (
                            <Card className="flex items-center justify-center py-16">
                                <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
                            </Card>
                        ) : filteredSections.length ? filteredSections.map((section) => (
                            <section
                                key={section.id}
                                id={`settings-section-${section.id}`}
                                className="space-y-5 scroll-mt-8"
                            >
                                <div className={`overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800`}>
                                    <div className={`h-2 bg-gradient-to-r ${section.accent}`} />
                                    <div className="p-6">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{section.icon}</span>
                                                    <div>
                                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{section.title}</h2>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {sectionDirtyCount(section.id) ? <Badge variant="warning">{sectionDirtyCount(section.id)} unsaved</Badge> : null}
                                        </div>

                                        <div className="mt-6 grid grid-cols-1 gap-4 2xl:grid-cols-2">
                                            {section.groups.map((group) => (
                                                <Card key={group.id} className="h-full">
                                                    <div className="mb-4 space-y-1">
                                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{group.title}</h3>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {group.settings.map((setting) => {
                                                            const isDirty = dirtyLookup.has(setting.key);
                                                            return (
                                                                <div key={setting.key} className={`rounded-2xl border p-4 transition-colors ${isDirty
                                                                    ? 'border-primary/40 bg-primary/5'
                                                                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40'
                                                                    }`}>
                                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{setting.label}</p>
                                                                                {setting.risk ? <Badge variant={riskToVariant(setting.risk)}>{setting.risk}</Badge> : null}
                                                                                {isDirty ? <Badge variant="primary">modified</Badge> : null}
                                                                            </div>
                                                                            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{setting.helpText}</p>
                                                                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{setting.key}</p>
                                                                        </div>
                                                                    </div>
                                                                    {renderSettingControl(setting)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )) : (
                            <Card>
                                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No settings matched your search.
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {dirtyKeys.length ? (
                <div className="fixed bottom-6 left-1/2 z-30 w-[min(960px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">Unsaved settings changes</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{dirtyKeys.length} setting{dirtyKeys.length > 1 ? 's' : ''} changed across the page.</div>
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

export default SettingsPage;
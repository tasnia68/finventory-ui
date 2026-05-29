import React from 'react';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { Badge, Card } from '../../components/common';
import { SETTINGS_SECTIONS } from './settingsRegistry';

const SettingsSectionPage = () => {
    const { sectionId } = useParams();
    const {
        loading,
        filteredSections,
        dirtyLookup,
        sectionDirtyCount,
        riskToVariant,
        renderSettingControl,
    } = useOutletContext();

    // Validate sectionId against the registry; redirect unknown ids to the first section.
    const sectionExists = SETTINGS_SECTIONS.some((s) => s.id === sectionId);
    if (!sectionExists) {
        const fallbackId = SETTINGS_SECTIONS[0]?.id || 'general';
        return <Navigate to={`/settings/${fallbackId}`} replace />;
    }

    if (loading) {
        return (
            <Card className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
            </Card>
        );
    }

    // Use the filtered version of this section so search hides non-matching groups/fields.
    const section = filteredSections.find((s) => s.id === sectionId);

    if (!section) {
        return (
            <Card>
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No settings in this section matched your search.
                </div>
            </Card>
        );
    }

    return (
        <section className="space-y-5">
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
    );
};

export default SettingsSectionPage;

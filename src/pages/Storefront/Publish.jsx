import React, { useState } from 'react';
import {
  getStorefrontThemeEditor,
  publishStorefrontTheme,
  restoreStorefrontThemeRevision,
} from '../../services/storefrontService';

const formatDateTime = (value) => {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const StorefrontPublish = () => {
  const [state, setState] = useState(null);
  const [versions, setVersions] = useState([]);

  React.useEffect(() => {
    let active = true;
    getStorefrontThemeEditor().then((editor) => {
      if (active) {
        setState(editor);
        setVersions(editor.revisions || []);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!state) {
    return <div className="h-full overflow-y-auto bg-slate-50 px-8 py-8 dark:bg-slate-950" />;
  }

  const draftTheme = state.draftThemeDocument;
  const siteSettings = draftTheme?.settings?.site || {};
  const themeTemplates = draftTheme?.templates || {};
  const totalSections = Object.values(themeTemplates).reduce((sum, template) => sum + (template?.sections?.length || 0), 0);
  const publishedRevision = versions[0] || null;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-8 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publish center</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">Draft to live workflow.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Publish the current draft theme document, create immutable revisions, and restore older storefront states.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current status</div>
                <div className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{siteSettings.publishStatus || 'DRAFT'}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Draft sections</div>
                <div className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{totalSections}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await publishStorefrontTheme({ note: 'Published from publish center' });
                const editor = await getStorefrontThemeEditor();
                setState(editor);
                setVersions(editor.revisions || []);
              }}
              className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              Publish current storefront draft
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Version history</p>
            <div className="mt-5 space-y-4">
              {(versions.length ? versions : [{
                id: 'draft',
                label: siteSettings.publishedVersion || 'Draft workspace',
                publishedAt: siteSettings.lastPublishedAt || new Date().toISOString(),
                note: 'No published snapshot yet.',
                restoredFromVersionNumber: null,
                status: 'DRAFT',
              }]).map((version) => (
                <div key={version.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{version.label}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(version.publishedAt)}</div>
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{version.note || 'No note provided.'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {version.status || 'PUBLISHED'}
                      </span>
                      {version.id !== 'draft' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await restoreStorefrontThemeRevision(version.id, { note: `Restored ${version.label}` });
                            const editor = await getStorefrontThemeEditor();
                            setState(editor);
                            setVersions(editor.revisions || []);
                          }}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          Restore this revision
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {publishedRevision ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                Active published revision: <strong className="text-slate-900 dark:text-white">{publishedRevision.label}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorefrontPublish;

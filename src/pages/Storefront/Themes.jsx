import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStorefrontThemeRegistry,
  getStorefrontThemeEditor,
  activateStorefrontTheme,
} from '../../services/storefrontService';

const TAG_COLORS = {
  minimal: 'bg-slate-100 text-slate-700',
  monochrome: 'bg-zinc-100 text-zinc-700',
  'type-driven': 'bg-blue-50 text-blue-700',
  editorial: 'bg-amber-50 text-amber-800',
  magazine: 'bg-orange-50 text-orange-700',
  'content-first': 'bg-purple-50 text-purple-700',
  'blog-heavy': 'bg-pink-50 text-pink-700',
  boutique: 'bg-emerald-50 text-emerald-700',
  luxury: 'bg-yellow-50 text-yellow-700',
};

const ThemeCard = ({ theme, isActive, onActivate, busy }) => (
  <div className={`flex flex-col overflow-hidden rounded-3xl border ${isActive ? 'border-slate-900 ring-2 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900`}>
    <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
      {theme.screenshot ? (
        <img src={theme.screenshot} alt={`${theme.name} preview`} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-xs uppercase tracking-widest opacity-60">{theme.key}</div>
          <div className="mt-2 text-3xl font-bold opacity-80">{theme.name}</div>
        </div>
      </div>
      {isActive ? (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-md">Active</span>
      ) : null}
    </div>
    <div className="flex flex-1 flex-col gap-4 p-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{theme.name}</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">v{theme.version || '0.0.0'}</span>
        </div>
        {theme.description ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{theme.description}</p>
        ) : null}
      </div>
      {theme.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {theme.tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2 py-0.5 text-xs font-medium ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-700'}`}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex items-center gap-2">
        <button
          type="button"
          disabled={isActive || busy}
          onClick={() => onActivate(theme)}
          className="flex-1 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {isActive ? 'Currently active' : busy ? 'Activating…' : 'Activate'}
        </button>
      </div>
    </div>
  </div>
);

const Themes = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState([]);
  const [activeKey, setActiveKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [registry, editor] = await Promise.all([
          getStorefrontThemeRegistry(),
          getStorefrontThemeEditor(),
        ]);
        setThemes(Array.isArray(registry) ? registry : []);
        setActiveKey(editor?.draftThemeDocument?.templateKey || '');
      } catch (err) {
        setError(err.message || 'Failed to load themes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleActivate = async (theme) => {
    if (theme.key === activeKey) return;
    if (!window.confirm(`Activate ${theme.name}? Your theme tokens (colors, fonts) will switch to this theme's defaults. Your draft sections and brand settings stay.`)) {
      return;
    }
    setBusy(theme.key);
    setError('');
    setStatus('');
    try {
      await activateStorefrontTheme(theme.key);
      setActiveKey(theme.key);
      setStatus(`${theme.name} activated. Visit Pages to publish the change.`);
    } catch (err) {
      setError(err.message || 'Activation failed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-6 p-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Themes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pick a theme to define your storefront's look and section library. Activating a theme switches the visual identity; your sections, brand settings, and pages stay.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/storefront/pages')}
          className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
        >
          Back to editor
        </button>
      </header>

      {status ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{status}</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500">Loading themes…</div>
      ) : themes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          No themes are registered. Theme manifests live at <code>inventory/src/main/resources/storefront/themes/&lt;key&gt;/theme.manifest.json</code> on the backend.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.key}
              theme={theme}
              isActive={theme.key === activeKey}
              busy={busy === theme.key}
              onActivate={handleActivate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Themes;

import React, { useEffect, useState } from 'react';
import {
  getStorefrontThemeUpgradeStatus,
  applyStorefrontThemeUpgrade,
} from '../../services/storefrontService';

/**
 * Shows a "theme update available" banner when the active theme's bundled
 * manifest version is ahead of the version the tenant last published against.
 * Hidden silently when versions match (or backend errors).
 *
 * Drop this anywhere the user lands inside /storefront/* — it self-fetches.
 */
const ThemeUpgradeBanner = ({ onApplied }) => {
  const [status, setStatus] = useState(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getStorefrontThemeUpgradeStatus();
        if (!cancelled) setStatus(next);
      } catch {
        /* silent — banner just won't show */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!status || !status.hasUpgrade || dismissed) return null;

  const handleApply = async () => {
    setApplying(true);
    setError('');
    try {
      await applyStorefrontThemeUpgrade();
      setDismissed(true);
      if (onApplied) onApplied(status);
    } catch (err) {
      setError(err.message || 'Could not apply the upgrade.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs uppercase tracking-wider text-amber-900">Update</span>
            <span>{status.themeName || status.themeKey}</span>
            <span className="text-amber-700 dark:text-amber-300">
              v{status.activeVersion || '?'} → v{status.availableVersion}
            </span>
          </div>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            A newer version of your active theme is bundled. Apply to refresh theme tokens (colors, fonts, radius) from the latest defaults. Your section content and brand settings stay.
          </p>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-2xl px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="rounded-2xl bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-50 disabled:opacity-50 dark:bg-amber-100 dark:text-amber-900"
          >
            {applying ? 'Applying…' : 'Apply update'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeUpgradeBanner;

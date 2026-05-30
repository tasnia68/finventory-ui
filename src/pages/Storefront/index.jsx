import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  activateStorefrontDomain,
  addStorefrontDomain,
  getStorefrontThemeEditor,
  removeStorefrontDomain,
  verifyStorefrontDomain,
} from '../../services/storefrontService';
import { useStorefrontModule } from '../../hooks/useStorefrontModule';
import ThemeUpgradeBanner from '../../components/storefront/ThemeUpgradeBanner';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not published yet';
  }
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const statusTone = (value) => {
  switch (value) {
    case 'VERIFIED':
    case 'ISSUED':
      return 'text-emerald-700 dark:text-emerald-300';
    case 'READY':
      return 'text-blue-700 dark:text-blue-300';
    case 'FAILED':
      return 'text-rose-700 dark:text-rose-300';
    default:
      return 'text-amber-700 dark:text-amber-300';
  }
};

const StorefrontOverview = () => {
  const { storefrontEnabled } = useStorefrontModule();
  const [state, setState] = useState(null);
  const [hostname, setHostname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadState = async () => {
    const next = await getStorefrontThemeEditor();
    setState(next);
  };

  const enabledSections = useMemo(
    () => Object.values(state?.draftThemeDocument?.templates || {}).reduce((sum, template) => (
      sum + (template?.sections || []).filter((section) => section.enabled).length
    ), 0),
    [state],
  );

  useEffect(() => {
    let active = true;
    getStorefrontThemeEditor().then((next) => {
      if (active) {
        setState(next);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!state) {
    return <div className="h-full overflow-y-auto bg-slate-50 px-8 py-8 dark:bg-slate-950" />;
  }

  const site = state.draftThemeDocument?.settings?.site || {};
  const theme = state.draftThemeDocument?.settings?.theme || {};
  const revisions = state.revisions || [];
  const domains = state.domains || { domains: [] };

  const stats = [
    { label: 'Module license', value: storefrontEnabled ? 'Enabled' : 'Disabled', tone: storefrontEnabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300' },
    { label: 'Site publish state', value: site.enabled ? 'Live' : 'Draft only', tone: site.enabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' },
    { label: 'Publish status', value: site.publishStatus || 'DRAFT', tone: 'text-blue-700 dark:text-blue-300' },
    { label: 'Enabled sections', value: String(enabledSections), tone: 'text-slate-900 dark:text-white' },
    { label: 'Revisions', value: String(revisions.length), tone: 'text-slate-900 dark:text-white' },
  ];

  const workstreams = [
    { title: 'Theme settings', href: '/storefront/pages', description: 'Control brand, tokens, shell behavior, and shared storefront settings from the schema-driven editor.' },
    { title: 'Header and navigation', href: '/storefront/navigation', description: 'Edit announcement, navigation blocks, drawer labels, and header structure in the new theme editor.' },
    { title: 'Home and footer', href: '/storefront/pages?template=home', description: 'Manage sections, blocks, dynamic sources, and footer content with the real iframe preview.' },
    { title: 'Revision center', href: '/storefront/publish', description: 'Publish immutable revisions and restore previous storefront states from the theme workflow.' },
  ];

  const handleAddDomain = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      await addStorefrontDomain(hostname);
      setHostname('');
      setFeedback('Domain added. Verify DNS reachability before activation.');
      await loadState();
    } catch (requestError) {
      setError(requestError.message || 'Could not add storefront domain.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (key, handler, successMessage) => {
    setActionKey(key);
    setError('');
    setFeedback('');
    try {
      await handler();
      setFeedback(successMessage);
      await loadState();
    } catch (requestError) {
      setError(requestError.message || 'Domain action failed.');
    } finally {
      setActionKey('');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-8 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-7xl space-y-6">
        <ThemeUpgradeBanner />
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(15,90,229,0.15),_transparent_36%),radial-gradient(circle_at_80%_10%,_rgba(249,115,22,0.14),_transparent_26%)] px-8 py-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  Storefront module
                </span>
                <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white">
                  Shape the commerce experience from backoffice.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  The storefront workspace is now backed by a schema-driven theme document, real iframe preview, immutable revision flow,
                  and host-aware tenant routing for platform and custom storefront domains.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{stat.label}</div>
                    <div className={`mt-3 text-2xl font-black ${stat.tone}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Operational view</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Storefront workstreams</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Theme document active
                </span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {workstreams.map((item) => (
                  <Link
                    key={item.title}
                    to={item.href}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Domain routing</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Storefront domains</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Custom domains route through Caddy with automatic TLS. Verify DNS first, then activate the domain you want as primary.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Target: {domains.verificationTarget || 'Not configured'}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fallback storefront</p>
                  <div className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{domains.platformFallbackHost || 'Not available'}</div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 break-all">{domains.platformFallbackUrl || 'A tenant subdomain fallback URL will appear here.'}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Primary live domain</p>
                  <div className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{domains.primaryHostname || 'No custom primary domain yet'}</div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 break-all">{domains.primaryUrl || 'The fallback storefront URL stays available even without a custom domain.'}</p>
                </div>
              </div>

              <form className="mt-6 flex flex-col gap-3 md:flex-row" onSubmit={handleAddDomain}>
                <input
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  placeholder="store.customer.com"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  {submitting ? 'Adding...' : 'Add domain'}
                </button>
              </form>

              {feedback ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">{feedback}</div> : null}
              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

              <div className="mt-6 space-y-4">
                {(domains.domains || []).length ? (domains.domains || []).map((domain) => (
                  <div key={domain.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-bold text-slate-900 dark:text-white break-all">{domain.hostname}</div>
                          {domain.primary ? <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">Primary</span> : null}
                          {domain.active ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">Active</span> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <span className={statusTone(domain.verificationStatus)}>DNS: {domain.verificationStatus}</span>
                          <span className={statusTone(domain.tlsStatus)}>TLS: {domain.tlsStatus}</span>
                          <span className="text-slate-500 dark:text-slate-400">Checked: {domain.verificationCheckedAt ? formatDateTime(domain.verificationCheckedAt) : 'Pending'}</span>
                        </div>
                        {domain.lastError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{domain.lastError}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => runAction(`verify-${domain.id}`, () => verifyStorefrontDomain(domain.id), 'Domain verification complete.')}
                          disabled={actionKey === `verify-${domain.id}`}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                        >
                          {actionKey === `verify-${domain.id}` ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(`activate-${domain.id}`, () => activateStorefrontDomain(domain.id), 'Primary storefront domain updated.')}
                          disabled={domain.primary || actionKey === `activate-${domain.id}`}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionKey === `activate-${domain.id}` ? 'Activating...' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(`remove-${domain.id}`, () => removeStorefrontDomain(domain.id), 'Domain removed.')}
                          disabled={actionKey === `remove-${domain.id}`}
                          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        >
                          {actionKey === `remove-${domain.id}` ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                    No custom storefront domains yet. Add one above, point it to {domains.verificationTarget || 'your Caddy edge host'}, verify DNS, then activate it.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Storefront profile</p>
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{site.name}</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{site.tagline}</p>

              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Primary domain</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white text-right">{domains.primaryHostname || site.domain}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Commercial plan</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{site.modulePlan}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Current version</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{site.publishedVersion || 'Draft only'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Last publish</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{formatDateTime(site.lastPublishedAt)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Theme radius</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{theme.radius ? `${theme.radius}px` : 'N/A'}</dd>
                </div>
              </dl>

              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Routing note</p>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Admin stays on the platform domain. Storefront tenant selection now happens from the public request host,
                  so the custom domain you activate here becomes the runtime storefront identity at the edge.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorefrontOverview;

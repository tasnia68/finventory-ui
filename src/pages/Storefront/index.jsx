import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStorefrontThemeEditor } from '../../services/storefrontService';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not published yet';
  }
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const StorefrontOverview = () => {
  const [state, setState] = useState(null);

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

  const stats = [
    { label: 'Storefront status', value: site.enabled ? 'Enabled' : 'Disabled', tone: 'text-emerald-700 dark:text-emerald-300' },
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

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-8 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-7xl">
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
                  The storefront workspace is now backed by a schema-driven theme document, real iframe preview, and
                  immutable revision flow. Header, home, and footer all resolve from the same draft theme.
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Storefront profile</p>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{site.name}</div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{site.tagline}</p>

            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Primary domain</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{site.domain}</dd>
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Stitch-ready direction</p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                The runtime now resolves published storefront config from the theme document. The next layer is deeper
                template coverage and more complete block-level preview selection for Marland and Atelier.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorefrontOverview;

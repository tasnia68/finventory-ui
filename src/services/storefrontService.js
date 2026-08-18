import { request } from './api';
import { getStorefrontWorkbench } from './storefrontWorkbench';
import { getAuthorizationHeaders } from './authStorage';

const unwrap = async (promise) => {
  const response = await promise;
  return response?.data !== undefined ? response.data : response;
};

const toWorkbenchState = (config) => {
  const fallback = getStorefrontWorkbench();
  if (!config) {
    return fallback;
  }

  const fallbackSectionsByType = new Map(
    fallback.pages.home.sections.map((section) => [section.type, section]),
  );

  return {
    site: {
      ...fallback.site,
      ...(config.site || {}),
      templateKey: config.site?.templateKey || fallback.site.templateKey,
    },
    domains: config.domains || {
      platformFallbackHost: '',
      platformFallbackUrl: '',
      primaryHostname: config.site?.domain || '',
      primaryUrl: config.site?.domain ? `https://${config.site.domain}` : '',
      verificationTarget: '',
      domains: [],
    },
    theme: {
      ...fallback.theme,
      ...(config.theme || {}),
    },
    pages: {
      home: {
        ...fallback.pages.home,
        title: config.homePage?.title || fallback.pages.home.title,
        sections: config.homePage?.sections?.length
          ? config.homePage.sections.map((section) => ({
              ...(fallbackSectionsByType.get(section.type) || {}),
              ...section,
              config: {
                ...((fallbackSectionsByType.get(section.type) || {}).config || {}),
                ...(section.config || {}),
              },
            }))
          : fallback.pages.home.sections,
      },
    },
    navigation: {
      header: config.navigationItems?.length ? config.navigationItems : fallback.navigation.header,
      banners: config.banners?.length ? config.banners : fallback.navigation.banners,
    },
    publish: {
      ...fallback.publish,
      versions: fallback.publish.versions,
    },
  };
};

const toBackendPayload = (state) => ({
  site: state.site,
  theme: state.theme,
  navigationItems: state.navigation.header,
  banners: state.navigation.banners,
  homePage: {
    slug: 'home',
    title: state.pages.home.title,
    sections: state.pages.home.sections,
  },
});

export const getStorefrontConfig = async () => {
  const config = await unwrap(request('/storefront/config'));
  return toWorkbenchState(config);
};

export const saveStorefrontConfig = async (state) => {
  const config = await unwrap(request('/storefront/config', {
    method: 'PUT',
    body: toBackendPayload(state),
  }));
  return toWorkbenchState(config);
};

// Theme settings store asset URLs relative (e.g. /api/v1/storefront/assets/file?path=…) so a
// published snapshot stays portable across environments. Browsers resolve those against the app
// origin (5173), not the API, so every <img src> must run through this first.
// Mirrors productImageUrl() in productService.js.
export const resolveStorefrontAssetUrl = (url) => {
  if (!url || /^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  const { origin } = new URL(apiBaseUrl, window.location.origin);
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const listStorefrontAssets = async (assetType) => unwrap(request(
  assetType ? `/storefront/assets?assetType=${encodeURIComponent(assetType)}` : '/storefront/assets',
));

export const deleteStorefrontAsset = async (path) => unwrap(request(
  `/storefront/assets?path=${encodeURIComponent(path)}`,
  { method: 'DELETE' },
));

export const uploadStorefrontAsset = async (file, assetType = 'misc') => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('assetType', assetType);

  const response = await fetch(`${API_BASE_URL}/storefront/assets`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || 'Failed to upload storefront asset');
  }

  const payload = await response.json();
  return payload?.data !== undefined ? payload.data : payload;
};

export const getStorefrontThemeEditor = async () => unwrap(request('/storefront/admin/theme'));

export const saveStorefrontThemeDraft = async (themeDocument) => unwrap(request('/storefront/admin/theme/draft', {
  method: 'PUT',
  body: themeDocument,
}));

export const getStorefrontThemePreview = async () => unwrap(request('/storefront/admin/theme/preview'));

export const getStorefrontThemeRevisions = async () => unwrap(request('/storefront/admin/theme/revisions'));

export const publishStorefrontTheme = async (payload = {}) => unwrap(request('/storefront/admin/theme/revisions', {
  method: 'POST',
  body: payload,
}));

export const restoreStorefrontThemeRevision = async (versionId, payload = {}) => unwrap(request(`/storefront/admin/theme/revisions/${versionId}/restore`, {
  method: 'POST',
  body: payload,
}));

// Theme registry — Shopify-style folder-based themes registered via backend manifests.
// Used by the (Phase 6) /storefront/themes gallery page; safe to call earlier.
export const getStorefrontThemeRegistry = async () => unwrap(request('/storefront/admin/themes/registry'));

export const getStorefrontThemeManifest = async (themeKey) => unwrap(request(`/storefront/admin/themes/${themeKey}`));

export const activateStorefrontTheme = async (themeKey) => unwrap(request(`/storefront/admin/themes/${themeKey}/activate`, {
  method: 'POST',
}));

export const getStorefrontThemeUpgradeStatus = async () => unwrap(request('/storefront/admin/themes/active/upgrade'));

export const applyStorefrontThemeUpgrade = async () => unwrap(request('/storefront/admin/themes/active/upgrade', {
  method: 'POST',
}));

export const getStorefrontDomainContext = async () => unwrap(request('/storefront/admin/domains'));

export const addStorefrontDomain = async (hostname) => unwrap(request('/storefront/admin/domains', {
  method: 'POST',
  body: { hostname },
}));

export const verifyStorefrontDomain = async (domainId) => unwrap(request(`/storefront/admin/domains/${domainId}/verify`, {
  method: 'POST',
}));

export const activateStorefrontDomain = async (domainId) => unwrap(request(`/storefront/admin/domains/${domainId}/activate`, {
  method: 'POST',
}));

export const removeStorefrontDomain = async (domainId) => unwrap(request(`/storefront/admin/domains/${domainId}`, {
  method: 'DELETE',
}));

export const getStorefrontCustomers = async () => unwrap(request('/storefront/admin/customers'));

export const getStorefrontAnalytics = async (from, to) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const qs = params.toString();
  return unwrap(request(`/storefront/admin/analytics${qs ? '?' + qs : ''}`));
};

// CMS Pages
export const getStorefrontCmsPages = async () => unwrap(request('/storefront/admin/pages'));

export const createStorefrontCmsPage = async (data) => unwrap(request('/storefront/admin/pages', {
  method: 'POST',
  body: data,
}));

export const updateStorefrontCmsPage = async (id, data) => unwrap(request(`/storefront/admin/pages/${id}`, {
  method: 'PUT',
  body: data,
}));

export const deleteStorefrontCmsPage = async (id) => unwrap(request(`/storefront/admin/pages/${id}`, {
  method: 'DELETE',
}));

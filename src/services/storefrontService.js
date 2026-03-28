import { request } from './api';
import { getStorefrontWorkbench } from './storefrontWorkbench';

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
  try {
    const config = await unwrap(request('/storefront/config'));
    return toWorkbenchState(config);
  } catch (error) {
    console.error('Falling back to local storefront workbench state:', error);
    return getStorefrontWorkbench();
  }
};

export const saveStorefrontConfig = async (state) => {
  try {
    const config = await unwrap(request('/storefront/config', {
      method: 'PUT',
      body: toBackendPayload(state),
    }));
    return toWorkbenchState(config);
  } catch (error) {
    console.error('Storefront backend save failed, using local fallback state:', error);
    return state;
  }
};

export const uploadStorefrontAsset = async (file, assetType = 'misc') => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'default-tenant';
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('assetType', assetType);

  const response = await fetch(`${API_BASE_URL}/storefront/assets`, {
    method: 'POST',
    headers: {
      'X-Tenant-ID': TENANT_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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

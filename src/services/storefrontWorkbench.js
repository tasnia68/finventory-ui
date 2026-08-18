const STORAGE_KEY = 'logistra.storefront.workbench.v1';

const clone = (value) => JSON.parse(JSON.stringify(value));

const defaultState = {
  site: {
    enabled: true,
    templateKey: 'marland_manor',
    name: 'Marl & Manor',
    tagline: 'Everyday essentials with a sharper point of view.',
    announcement: 'Shop our latest arrivals!',
    domain: 'marlandmanor.store',
    modulePlan: 'Storefront Pro',
    logoUrl: '/logistra.svg',
    iconUrl: '/logistra.svg',
    logoWidth: 40,
    productCardHoverMode: 'SECOND_IMAGE',
    productCardHoverZoom: true,
    drawerButtonLabel: 'Categories',
    drawerLabel: 'Shop by category',
    drawerTitle: 'Catalog',
    drawerDescription: 'Browse Men, Women, Accessories, and all storefront subcategories.',
    allCollectionsLabel: 'All collections',
    searchPlaceholder: 'Search the catalog',
    cartLabel: 'Cart',
    footerCatalogLabel: 'Catalog',
    footerCollectionsLabel: 'Collections',
    footerTrackingLabel: 'Track order',
    publishStatus: 'DRAFT',
    publishedVersion: null,
    lastPublishedAt: null,
  },
  theme: {
    primary: '#00322d',
    secondary: '#004b44',
    accent: '#4a200e',
    surface: '#f8f9fa',
    text: '#191c1d',
    radius: 24,
    heroAlignment: 'left',
    headingFont: 'Manrope',
    bodyFont: 'Inter',
  },
  pages: {
    home: {
      title: 'Home page',
      sections: [
        {
          id: 'hero',
          label: 'Hero banner',
          type: 'hero_banner',
          enabled: true,
          variant: 'editorial-image',
          config: {
            eyebrow: 'New Arrivals',
            headline: 'New Arrivals',
            subheadline: 'Let your day be filled with what inspires you.',
            ctaLabel: 'Shop our latest arrivals!',
            ctaHref: '/products',
            secondaryCtaLabel: 'View collections',
            secondaryCtaHref: '/collections',
            imageUrl: '',
          },
        },
        {
          id: 'promo',
          label: 'Promo strip',
          type: 'promo_strip',
          enabled: true,
          variant: 'three-up',
          config: {
            items: ['Inventory-backed catalog', 'Config-managed merchandising', 'Optional storefront module'],
          },
        },
        {
          id: 'new-arrivals',
          label: 'New arrivals',
          type: 'featured_products',
          enabled: true,
          variant: 'new-arrivals',
          config: {
            source: 'newest',
            limit: 8,
            eyebrow: 'New Arrivals',
            title: 'New Arrivals',
            description: 'Let your day be filled with what inspires you.',
            ctaLabel: 'Shop all products',
          },
        },
        {
          id: 'bestsellers',
          label: 'Best sellers',
          type: 'featured_products',
          enabled: true,
          variant: 'bestsellers',
          config: {
            source: 'featured',
            limit: 4,
            eyebrow: 'Our Bestsellers',
            title: 'OUR BESTSELLERS',
            description: 'FUNCTIONAL EVERYDAY ESSENTIALS',
            ctaLabel: 'View all products',
          },
        },
        {
          id: 'collections',
          label: 'Collection list',
          type: 'featured_collections',
          enabled: true,
          variant: 'cards',
          config: {
            collectionSlugs: [],
            limit: 4,
            eyebrow: 'Collections',
            title: 'Collections',
            description: 'Choose which collections to feature on the homepage.',
            ctaLabel: 'Browse all collections',
            collectionKickerLabel: 'Curated space',
            collectionCardCtaLabel: 'Explore collection',
          },
        },
      ],
    },
  },
  navigation: {
    header: [
      { id: 'nav-1', label: 'Home', href: '/' },
      { id: 'nav-2', label: 'Collections', href: '/collections' },
      { id: 'nav-3', label: 'Products', href: '/products' },
      { id: 'nav-4', label: 'Contact', href: '/contact' },
    ],
    banners: [
      { id: 'banner-1', label: 'Spring campaign', placement: 'hero', enabled: true },
      { id: 'banner-2', label: 'Warehouse bundle promo', placement: 'between-sections', enabled: true },
    ],
  },
  publish: {
    draftSummary: 'Theme and homepage sections are configured in the frontend workbench.',
    previewUrl: 'http://localhost:4173',
    versions: [
      {
        id: 'draft',
        label: 'Draft workspace',
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }
    return {
      ...clone(defaultState),
      ...JSON.parse(raw),
    };
  } catch (error) {
    console.error('Failed to load storefront workbench:', error);
    return clone(defaultState);
  }
};

const save = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return clone(state);
};

export const getStorefrontWorkbench = () => load();

export const updateStorefrontTheme = (payload) => {
  const state = load();
  state.theme = { ...state.theme, ...payload };
  state.site.publishStatus = 'DRAFT';
  return save(state);
};

export const updateStorefrontSite = (payload) => {
  const state = load();
  state.site = { ...state.site, ...payload };
  state.site.publishStatus = 'DRAFT';
  return save(state);
};

export const toggleStorefrontSection = (sectionId) => {
  const state = load();
  state.pages.home.sections = state.pages.home.sections.map((section) => (
    section.id === sectionId
      ? { ...section, enabled: !section.enabled }
      : section
  ));
  state.site.publishStatus = 'DRAFT';
  return save(state);
};

export const moveStorefrontSection = (sectionId, direction) => {
  const state = load();
  const sections = [...state.pages.home.sections];
  const index = sections.findIndex((section) => section.id === sectionId);
  if (index < 0) {
    return state;
  }

  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= sections.length) {
    return state;
  }

  const [section] = sections.splice(index, 1);
  sections.splice(nextIndex, 0, section);
  state.pages.home.sections = sections;
  state.site.publishStatus = 'DRAFT';
  return save(state);
};

export const updateStorefrontNavigation = (items) => {
  const state = load();
  state.navigation.header = items;
  state.site.publishStatus = 'DRAFT';
  return save(state);
};

export const updateStorefrontBanners = (items) => {
  const state = load();
  state.navigation.banners = items;
  state.site.publishStatus = 'DRAFT';
  return save(state);
};

export const publishStorefrontWorkbench = () => {
  const state = load();
  const publishedAt = new Date().toISOString();
  const version = {
    id: `version-${Date.now()}`,
    label: `Publish ${state.publish.versions.length}`,
    status: 'PUBLISHED',
    createdAt: publishedAt,
  };
  state.publish.versions.unshift(version);
  state.site.publishStatus = 'PUBLISHED';
  state.site.publishedVersion = version.label;
  state.site.lastPublishedAt = publishedAt;
  return save(state);
};

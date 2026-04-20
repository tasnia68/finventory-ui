import { getCachedSetting, useSettings } from '../contexts/SettingsContext';

const STOREFRONT_MODULE_KEY = 'tenant.modules.storefront.enabled';

const readCachedState = () => {
  const raw = getCachedSetting(STOREFRONT_MODULE_KEY);
  if (raw === undefined) {
    return null;
  }
  return raw === true || raw === 'true';
};

export const useStorefrontModule = () => {
  const cachedState = readCachedState();
  const { loading, getBooleanSetting } = useSettings();

  const enabled = loading
    ? cachedState ?? false
    : getBooleanSetting(STOREFRONT_MODULE_KEY, false);

  const resolved = !loading;

  return { storefrontEnabled: enabled, storefrontResolved: resolved };
};

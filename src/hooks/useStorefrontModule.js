import { useEffect, useState } from 'react';
import { request } from '../services/api';

const STORE_FRONT_CACHE_KEY = 'logistra.storefront.module.enabled';

const readCachedState = () => {
  try {
    const raw = window.localStorage.getItem(STORE_FRONT_CACHE_KEY);
    if (raw === null) {
      return null;
    }
    return raw === 'true';
  } catch {
    return null;
  }
};

const writeCachedState = (value) => {
  try {
    window.localStorage.setItem(STORE_FRONT_CACHE_KEY, String(Boolean(value)));
  } catch {
    // ignore cache failures
  }
};

export const useStorefrontModule = () => {
  const [enabled, setEnabled] = useState(() => readCachedState() ?? false);
  const [resolved, setResolved] = useState(() => readCachedState() !== null);

  useEffect(() => {
    let active = true;

    request('/storefront/config')
      .then((response) => {
        const config = response?.data !== undefined ? response.data : response;
        const nextEnabled = Boolean(config?.site?.enabled);
        if (active) {
          setEnabled(nextEnabled);
          setResolved(true);
        }
        writeCachedState(nextEnabled);
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
          setResolved(true);
        }
        writeCachedState(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { storefrontEnabled: enabled, storefrontResolved: resolved };
};

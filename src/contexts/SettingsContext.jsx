import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings as fetchSettings, updateSettings as persistSettings } from '../services/settingsService';

const SETTINGS_CACHE_KEY_PREFIX = 'tenantSettingsCache';
const TENANT_CONTEXT_CHANGED_EVENT = 'tenant-context-changed';

const readCurrentTenantId = () => {
    const tenantId = localStorage.getItem('tenantId');
    return tenantId && tenantId.trim() ? tenantId.trim() : 'anonymous';
};

const getSettingsCacheKey = (tenantId = readCurrentTenantId()) => `${SETTINGS_CACHE_KEY_PREFIX}:${tenantId}`;

const readSettingsCache = (tenantId = readCurrentTenantId()) => {
    try {
        const raw = localStorage.getItem(getSettingsCacheKey(tenantId));
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.error('Failed to read cached settings:', error);
        return {};
    }
};

const writeSettingsCache = (tenantId, settingsMap) => {
    localStorage.setItem(getSettingsCacheKey(tenantId), JSON.stringify(settingsMap));
};

const mergeSettingsEntries = (currentSettings, entries) => {
    const next = { ...currentSettings };
    entries.forEach((entry) => {
        next[entry.key] = entry.value;
    });
    return next;
};

const SettingsContext = createContext(null);

export const getCachedSetting = (key, fallbackValue = undefined) => {
    const cached = readSettingsCache();
    return cached[key] ?? fallbackValue;
};

export const SettingsProvider = ({ children }) => {
    const [tenantId, setTenantId] = useState(() => readCurrentTenantId());
    const [settings, setSettings] = useState(() => readSettingsCache(readCurrentTenantId()));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleTenantContextChanged = (event) => {
            const nextTenantId = event?.detail?.tenantId && event.detail.tenantId.trim()
                ? event.detail.tenantId.trim()
                : readCurrentTenantId();
            setTenantId(nextTenantId);
            setSettings(readSettingsCache(nextTenantId));
        };

        window.addEventListener(TENANT_CONTEXT_CHANGED_EVENT, handleTenantContextChanged);
        return () => window.removeEventListener(TENANT_CONTEXT_CHANGED_EVENT, handleTenantContextChanged);
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token || tenantId === 'anonymous') {
                setSettings(readSettingsCache(tenantId));
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const payload = await fetchSettings();
                const next = payload.reduce((accumulator, item) => {
                    accumulator[item.key] = item.value;
                    return accumulator;
                }, {});

                setSettings(next);
                writeSettingsCache(tenantId, next);
            } catch (error) {
                console.error('Failed to load tenant settings:', error);
                setSettings(readSettingsCache(tenantId));
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [tenantId]);

    const applySettings = (entries) => {
        setSettings((current) => {
            const next = mergeSettingsEntries(current, entries);
            writeSettingsCache(tenantId, next);
            return next;
        });
    };

    const saveSettings = async (entries) => {
        await persistSettings(entries);
        applySettings(entries);
    };

    const getSetting = (key, fallbackValue = undefined) => settings[key] ?? fallbackValue;

    const getBooleanSetting = (key, fallbackValue = false) => {
        const value = getSetting(key);
        if (value === undefined) {
            return fallbackValue;
        }

        return value === true || value === 'true';
    };

    const getNumberSetting = (key, fallbackValue = 0) => {
        const value = Number(getSetting(key));
        return Number.isNaN(value) ? fallbackValue : value;
    };

    const value = useMemo(() => ({
        settings,
        loading,
        applySettings,
        saveSettings,
        getSetting,
        getBooleanSetting,
        getNumberSetting,
    }), [settings, loading]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
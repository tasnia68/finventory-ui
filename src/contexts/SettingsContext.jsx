import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings as fetchSettings, updateSettings as persistSettings } from '../services/settingsService';

const SETTINGS_CACHE_KEY = 'tenantSettingsCache';

const readSettingsCache = () => {
    try {
        const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
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

const writeSettingsCache = (settingsMap) => {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settingsMap));
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
    const [settings, setSettings] = useState(() => readSettingsCache());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const payload = await fetchSettings();
                const next = payload.reduce((accumulator, item) => {
                    accumulator[item.key] = item.value;
                    return accumulator;
                }, {});

                setSettings(next);
                writeSettingsCache(next);
            } catch (error) {
                console.error('Failed to load tenant settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const applySettings = (entries) => {
        setSettings((current) => {
            const next = mergeSettingsEntries(current, entries);
            writeSettingsCache(next);
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
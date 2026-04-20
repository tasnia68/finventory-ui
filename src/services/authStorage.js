const AUTH_KEYS = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    tenantId: 'tenantId',
    tenantSubdomain: 'tenantSubdomain',
};

const REMEMBER_ME_KEY = 'rememberMe';
const REMEMBERED_WORKSPACE_KEY = 'rememberedWorkspace';
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

const getStorage = (type) => {
    if (typeof window === 'undefined') {
        return null;
    }

    return type === 'local' ? window.localStorage : window.sessionStorage;
};

const readStorageValue = (storage, key) => {
    if (!storage) {
        return '';
    }

    const value = storage.getItem(key);
    return typeof value === 'string' ? value : '';
};

const writeStorageValue = (storage, key, value) => {
    if (!storage) {
        return;
    }

    if (value === undefined || value === null || value === '') {
        storage.removeItem(key);
        return;
    }

    storage.setItem(key, value);
};

const clearStorageValue = (key) => {
    const localStorageRef = getStorage('local');
    const sessionStorageRef = getStorage('session');

    localStorageRef?.removeItem(key);
    sessionStorageRef?.removeItem(key);
};

const readValue = (key) => {
    const localValue = readStorageValue(getStorage('local'), key);
    if (localValue) {
        return localValue;
    }

    return readStorageValue(getStorage('session'), key);
};

const getActiveAuthStorageType = () => {
    if (readStorageValue(getStorage('local'), AUTH_KEYS.accessToken)) {
        return 'local';
    }

    if (readStorageValue(getStorage('session'), AUTH_KEYS.accessToken)) {
        return 'session';
    }

    return null;
};

const writeAuthValue = (storageType, key, value) => {
    writeStorageValue(getStorage(storageType), key, value);
};

export const getAccessToken = () => readValue(AUTH_KEYS.accessToken);

export const getRefreshToken = () => readValue(AUTH_KEYS.refreshToken);

export const getTenantId = () => readValue(AUTH_KEYS.tenantId);

export const getTenantSubdomain = () => readValue(AUTH_KEYS.tenantSubdomain);

export const isRememberMeEnabled = () => readStorageValue(getStorage('local'), REMEMBER_ME_KEY) === 'true';

export const getRememberedLogin = () => ({
    rememberMe: isRememberMeEnabled(),
    workspace: readStorageValue(getStorage('local'), REMEMBERED_WORKSPACE_KEY),
    email: readStorageValue(getStorage('local'), REMEMBERED_EMAIL_KEY),
});

export const persistRememberedLogin = ({ workspace = '', email = '', rememberMe = false }) => {
    const localStorageRef = getStorage('local');
    if (!localStorageRef) {
        return;
    }

    localStorageRef.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

    if (!rememberMe) {
        localStorageRef.removeItem(REMEMBERED_WORKSPACE_KEY);
        localStorageRef.removeItem(REMEMBERED_EMAIL_KEY);
        return;
    }

    writeStorageValue(localStorageRef, REMEMBERED_WORKSPACE_KEY, workspace.trim());
    writeStorageValue(localStorageRef, REMEMBERED_EMAIL_KEY, email.trim());
};

export const clearAuthSession = () => {
    Object.values(AUTH_KEYS).forEach(clearStorageValue);
};

export const persistAuthSession = (session, { rememberMe = false } = {}) => {
    const storageType = rememberMe ? 'local' : 'session';
    clearAuthSession();

    writeAuthValue(storageType, AUTH_KEYS.accessToken, session?.accessToken || '');
    writeAuthValue(storageType, AUTH_KEYS.refreshToken, session?.refreshToken || '');
    writeAuthValue(storageType, AUTH_KEYS.tenantId, session?.tenantId || '');
    writeAuthValue(storageType, AUTH_KEYS.tenantSubdomain, session?.tenantSubdomain || '');
};

export const syncAuthSessionMetadata = ({ tenantId = '', tenantSubdomain = '' } = {}) => {
    const storageType = getActiveAuthStorageType() || (isRememberMeEnabled() ? 'local' : 'session');
    writeAuthValue(storageType, AUTH_KEYS.tenantId, tenantId);
    writeAuthValue(storageType, AUTH_KEYS.tenantSubdomain, tenantSubdomain);
};

export const getAuthorizationHeaders = () => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
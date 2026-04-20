import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';
import * as userService from '../services/userService';
import {
    clearAuthSession,
    getAccessToken,
    getTenantId,
    persistAuthSession,
    persistRememberedLogin,
    syncAuthSessionMetadata,
} from '../services/authStorage';

const AuthContext = createContext(null);
const TENANT_CONTEXT_CHANGED_EVENT = 'tenant-context-changed';

const notifyTenantContextChanged = (tenantId) => {
    window.dispatchEvent(new CustomEvent(TENANT_CONTEXT_CHANGED_EVENT, {
        detail: { tenantId: tenantId && tenantId.trim() ? tenantId.trim() : 'anonymous' },
    }));
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            const token = getAccessToken();
            if (token) {
                try {
                    // Verify token/get profile
                    const userProfile = await userService.getProfile();
                    syncAuthSessionMetadata({
                        tenantId: userProfile?.tenantId || '',
                        tenantSubdomain: userProfile?.tenantSubdomain || '',
                    });
                    setUser(userProfile);
                    setIsAuthenticated(true);
                    notifyTenantContextChanged(userProfile?.tenantId || getTenantId());
                } catch (error) {
                    console.error('Failed to restore session:', error);
                    clearAuthSession();
                    notifyTenantContextChanged(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (workspace, email, password, rememberMe = false) => {
        try {
            const response = await authService.login(workspace, email, password);
            persistAuthSession(response, { rememberMe });
            persistRememberedLogin({ workspace, email, rememberMe });

            // Fetch user profile immediately after login
            const userProfile = await userService.getProfile();
            syncAuthSessionMetadata({
                tenantId: userProfile?.tenantId || response?.tenantId || '',
                tenantSubdomain: userProfile?.tenantSubdomain || response?.tenantSubdomain || '',
            });
            setUser(userProfile);
            setIsAuthenticated(true);
            notifyTenantContextChanged(response.tenantId || userProfile?.tenantId || getTenantId());
            return userProfile;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        clearAuthSession();
        notifyTenantContextChanged(null);
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    const updateProfile = async (data) => {
        const updatedUser = await userService.updateProfile(data);
        setUser(updatedUser);
        return updatedUser;
    }

    // Check user permissions (from backend user profile)
    const hasPermission = (permission) => {
        if (!user || !permission) return false;

        // 1. If backend provides permissions, use them
        if (user.permissions && Array.isArray(user.permissions)) {
            return user.permissions.includes(permission);
        }

        // 2. Fallback: platform and tenant admins always have access
        const userRoles = user.roles || [];
        if (userRoles.some(r => r === 'ROLE_SUPER_ADMIN' || r.name === 'ROLE_SUPER_ADMIN')) return true;
        if (userRoles.some(r => r === 'ROLE_ADMIN' || r.name === 'ROLE_ADMIN')) return true;

        // 3. Last valid fallback: Dashboard is always open
        if (permission === 'MENU:DASHBOARD') return true;

        return false;
    };

    const isSuperAdmin = Boolean(
        user?.roles?.some((role) => role === 'ROLE_SUPER_ADMIN' || role?.name === 'ROLE_SUPER_ADMIN')
    );

    const value = {
        user,
        loading,
        isAuthenticated,
        isSuperAdmin,
        login,
        logout,
        updateProfile,
        hasPermission
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

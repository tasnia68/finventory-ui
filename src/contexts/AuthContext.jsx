import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';
import * as userService from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    // Verify token/get profile
                    const userProfile = await userService.getProfile();
                    setUser(userProfile);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('Failed to restore session:', error);
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authService.login(email, password);
            localStorage.setItem('accessToken', response.accessToken);
            if (response.refreshToken) {
                localStorage.setItem('refreshToken', response.refreshToken);
            }

            // Fetch user profile immediately after login
            const userProfile = await userService.getProfile();
            setUser(userProfile);
            setIsAuthenticated(true);
            return userProfile;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    const updateProfile = async (data) => {
        const updatedUser = await userService.updateProfile(data);
        setUser(updatedUser);
        return updatedUser;
    }

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateProfile
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

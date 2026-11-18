import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    if (!api.isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const userData = await api.getMe();
      if (userData && userData.user_id) {
        setUser(userData);
        return userData;
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Session verification note:', err.message);
      api.clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('bidkaro:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bidkaro:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    const me = await api.getMe();
    setUser(me);
    return { tokenData: data, user: me };
  };

  const register = async ({ companyName, name, email, password, gstin, marketingOptIn = true }) => {
    const data = await api.register(companyName, name, email, password, gstin, marketingOptIn);
    const me = await api.getMe();
    setUser(me);
    return { tokenData: data, user: me };
  };

  const sendOtp = async (email) => {
    return await api.sendOtp(email);
  };

  const verifyOtp = async (email, otp, companyName, marketingOptIn = true) => {
    const data = await api.verifyOtp(email, otp, companyName, marketingOptIn);
    const me = await api.getMe();
    setUser(me);
    return { tokenData: data, user: me };
  };

  const loginWithGoogle = async (credential, companyName, marketingOptIn = true) => {
    const data = await api.loginWithGoogle(credential, companyName, marketingOptIn);
    const me = await api.getMe();
    setUser(me);
    return { tokenData: data, user: me };
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const forgotPassword = async (email) => {
    return await api.forgotPassword(email);
  };

  const resetPassword = async (email, otp, newPassword) => {
    return await api.resetPassword(email, otp, newPassword);
  };

  const migrateGuestSession = async (guestTenderId = null, anonSessionId = null) => {
    return await api.migrateGuestSession(guestTenderId, anonSessionId);
  };

  // Called by OnboardingWizard after completion
  const markOnboardingComplete = async () => {
    try {
      await api.completeOnboarding();
      setUser((prev) => prev ? { ...prev, onboarding_complete: true } : prev);
    } catch (_) {
      setUser((prev) => prev ? { ...prev, onboarding_complete: true } : prev);
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user && !user.is_anonymous),
    isLoading,
    // Derived: show wizard if authenticated, not anonymous, and onboarding not done
    showOnboarding: Boolean(
      user &&
      !user.is_anonymous &&
      !user.onboarding_complete &&
      api.isAuthenticated()
    ),
    login,
    register,
    sendOtp,
    verifyOtp,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    migrateGuestSession,
    logout,
    refreshUser: fetchCurrentUser,
    markOnboardingComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Safe fallback state for React Fast Refresh / HMR transitions
const DEFAULT_AUTH_STATE = {
  user: null,
  tenant: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isGuestTrial: false,
  needsOnboarding: false,
  login: async () => {},
  register: async () => {},
  sendOtp: async () => {},
  verifyOtp: async () => {},
  loginWithGoogle: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  migrateGuestSession: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  markOnboardingComplete: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // During Fast Refresh or unmount/remount ticks, context might be briefly unavailable
    return DEFAULT_AUTH_STATE;
  }
  return context;
}

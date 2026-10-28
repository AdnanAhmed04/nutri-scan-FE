import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api, { authApi, setSessionExpiredHandler } from '../services/api';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOffline: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  logoutAllDevices: async () => {},
  changePassword: async () => {},
  updateUser: async () => {},
  refreshUser: async () => null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while restoring a saved session
  const [isOffline, setIsOffline] = useState(false);
  const userRef = useRef(null);

  const applyUser = useCallback((nextUser) => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  // Restore the saved session on app start
  useEffect(() => {
    let cancelled = false;

    // If the server rejects the session at any point, drop back to the login screen
    setSessionExpiredHandler(() => {
      applyUser(null);
      setIsOffline(false);
    });

    (async () => {
      try {
        const { user: restored, offline } = await authApi.restoreSession();
        if (cancelled) return;
        applyUser(restored || null);
        setIsOffline(Boolean(offline));
      } catch (e) {
        console.log('Session restore error:', e.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setSessionExpiredHandler(null);
    };
  }, [applyUser]);

  const login = useCallback(
    async (email, password) => {
      const loggedIn = await authApi.login(email, password); // throws with a readable message
      setIsOffline(false);
      applyUser(loggedIn);
      return loggedIn;
    },
    [applyUser]
  );

  const register = useCallback(
    async (name, email, password) => {
      const created = await authApi.register(name, email, password);
      setIsOffline(false);
      applyUser(created);
      return created;
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applyUser(null);
      setIsOffline(false);
    }
  }, [applyUser]);

  const logoutAllDevices = useCallback(async () => {
    await authApi.logoutAllDevices(); // throws if the server couldn't be reached
    applyUser(null);
    setIsOffline(false);
  }, [applyUser]);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const updated = await authApi.changePassword(currentPassword, newPassword);
      applyUser(updated);
      return updated;
    },
    [applyUser]
  );

  // Reloads the profile from the server; keeps the current user if offline
  const refreshUser = useCallback(async () => {
    const profile = await api.getUserProfile();
    if (profile) {
      applyUser(profile);
      setIsOffline(false);
      return profile;
    }
    return userRef.current;
  }, [applyUser]);

  // Saves profile changes. If the server is unreachable the change is kept locally for this session.
  const updateUser = useCallback(
    async (updates) => {
      const saved = await api.updateUserProfile(updates);
      if (saved) {
        applyUser(saved);
        return saved;
      }
      if (!userRef.current) return null; // signed out while saving
      const merged = { ...userRef.current, ...updates };
      applyUser(merged);
      setIsOffline(true);
      return merged;
    },
    [applyUser]
  );

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isOffline,
      login,
      register,
      logout,
      logoutAllDevices,
      changePassword,
      updateUser,
      refreshUser,
    }),
    [user, isLoading, isOffline, login, register, logout, logoutAllDevices, changePassword, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;

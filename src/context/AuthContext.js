import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext({
  user: null,
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // default true for demo

  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const profile = await api.getUserProfile();
      setUser(profile);
      return profile;
    } catch (e) {
      console.log('Error loading user profile:', e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    // Prepared for future JWT auth flow
    const profile = await api.getUserProfile();
    setUser(profile);
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback(async (updates) => {
    const updated = await api.updateUserProfile(updates);
    setUser(updated);
    return updated;
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      updateUser,
      refreshUser: loadUser,
    }),
    [user, isAuthenticated, isLoading, login, logout, updateUser, loadUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const profile = await api.getUserProfile();
      setUser(profile);
    } catch (e) {
      console.log('Error loading user profile:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    // Prepared for future JWT auth flow
    const profile = await api.getUserProfile();
    setUser(profile);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates) => {
    const updated = await api.updateUserProfile(updates);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;

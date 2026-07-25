import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { logout as apiLogout } from '../services/authService';

const AuthContext = createContext(null);

const readStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null };
  }

  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    return { user: null };
  }

  try {
    return { user: JSON.parse(storedUser) };
  } catch (e) {
    console.error('Failed to parse user from local storage');
    return { user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { user: storedUser } = readStoredAuth();
    setUser(storedUser);
    setLoading(false);
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

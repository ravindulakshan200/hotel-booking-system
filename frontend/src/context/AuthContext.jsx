import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext(null);

const readStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  const storedUser = localStorage.getItem('user');
  const storedToken = localStorage.getItem('token');

  if (!storedToken) {
    return { user: null, token: null };
  }

  if (!storedUser) {
    return { user: null, token: storedToken };
  }

  try {
    return { user: JSON.parse(storedUser), token: storedToken };
  } catch (e) {
    console.error('Failed to parse user from local storage');
    return { user: null, token: storedToken };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { user: storedUser, token: storedToken } = readStoredAuth();
    setUser(storedUser);
    setToken(storedToken);
    setLoading(false);
  }, []);

  const login = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

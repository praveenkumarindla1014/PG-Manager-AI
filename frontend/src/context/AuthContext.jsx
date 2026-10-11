import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const res = await apiFetch('/auth/me');
    setUser(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('pg_chat_session');
    setUser(null);
  }, []);

  // Any 401 from the API (expired token) signs the user out cleanly.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('pg:unauthorized', onUnauthorized);
    return () => window.removeEventListener('pg:unauthorized', onUnauthorized);
  }, [logout]);

  const startSession = async (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    return refreshUser();
  };

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return startSession(res.data.token);
  };

  const register = async (userData) => {
    const res = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
    return startSession(res.data.token);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser, login, register, logout, loading, isOwner: user?.role === 'owner' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabaseAuth, isSupabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronize profile on load if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const res = await api.employees.getMyProfile();
          setEmployee(res.data);
          localStorage.setItem('auth_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginWithSupabase = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await supabaseAuth.signInWithPassword(email, password);
      const sessionToken = data.session.access_token;
      
      localStorage.setItem('auth_token', sessionToken);
      setToken(sessionToken);

      // Fetch employee profile derived by backend
      const res = await api.employees.getMyProfile();
      setEmployee(res.data);
      localStorage.setItem('auth_user', JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithDev = async (email, role = 'employee', fullName = '') => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.devLogin({
        email,
        role,
        full_name: fullName
      });
      const receivedToken = res.data.access_token;
      localStorage.setItem('auth_token', receivedToken);
      setToken(receivedToken);

      // Verify and load full employee profile
      const profRes = await api.employees.getMyProfile();
      setEmployee(profRes.data);
      localStorage.setItem('auth_user', JSON.stringify(profRes.data));
      return profRes.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Dev login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabaseAuth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setEmployee(null);
  };

  const isAdmin = employee?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        employee,
        token,
        loading,
        error,
        isAdmin,
        isSupabaseConfigured,
        loginWithSupabase,
        loginWithDev,
        logout,
        refreshProfile: async () => {
          if (token) {
            const res = await api.employees.getMyProfile();
            setEmployee(res.data);
            localStorage.setItem('auth_user', JSON.stringify(res.data));
          }
        }
      }}
    >
      {children}
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

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
      let sessionToken = null;
      // No silent fallback: a failed password is a failed login.
      const data = await supabaseAuth.signInWithPassword(email, password);
      sessionToken = data.session?.access_token;

      if (!sessionToken) {
        throw new Error('No access token returned from authentication provider.');
      }
      
      localStorage.setItem('auth_token', sessionToken);
      setToken(sessionToken);

      // Fetch employee profile derived by backend
      try {
        const res = await api.employees.getMyProfile();
        setEmployee(res.data);
        localStorage.setItem('auth_user', JSON.stringify(res.data));
        return res.data;
      } catch (profErr) {
        // Never invent a local profile/role: the backend is the only source of authorization.
        localStorage.removeItem('auth_token');
        setToken(null);
        throw profErr;
      }
    } catch (err) {
      const msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response.data : null) || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Development-only shortcut. The backend returns 404 outside development and
  // always uses the role stored in the database.
  const loginWithDev = async (email, fullName = '') => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.devLogin({
        email,
        full_name: fullName
      });
      const receivedToken = res.data.access_token;
      localStorage.setItem('auth_token', receivedToken);
      setToken(receivedToken);

      // Verify and load full employee profile
      try {
        const profRes = await api.employees.getMyProfile();
        setEmployee(profRes.data);
        localStorage.setItem('auth_user', JSON.stringify(profRes.data));
        return profRes.data;
      } catch (profErr) {
        localStorage.removeItem('auth_token');
        setToken(null);
        throw profErr;
      }
    } catch (err) {
      let msg = err.response?.data?.detail;
      if (!msg && typeof err.response?.data === 'string') {
        msg = err.response.data;
      }
      if (!msg) {
        msg = err.message || 'Dev login failed';
      }
      if (msg.includes('500') || msg.includes('Network Error')) {
        msg = 'Cannot reach backend server. Please verify FastAPI is running on http://127.0.0.1:8000.';
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithMfa = async (verifyData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.mfa.verifyChallenge(verifyData);
      const receivedToken = res.data.access_token;
      localStorage.setItem('auth_token', receivedToken);
      setToken(receivedToken);

      const profRes = await api.employees.getMyProfile();
      setEmployee(profRes.data);
      localStorage.setItem('auth_user', JSON.stringify(profRes.data));
      return profRes.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'MFA verification failed';
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

  // Permissions come from the backend (/employees/me). UI checks are cosmetic;
  // the API enforces every permission server-side.
  const permissions = employee?.permissions || [];
  const can = (perm) => permissions.includes(perm);
  const isSuperAdmin = employee?.role === 'super_admin';
  const isAdmin = can('admin:portal');
  const isManager = can('manager:portal');

  return (
    <AuthContext.Provider
      value={{
        employee,
        token,
        loading,
        error,
        isAdmin,
        isSuperAdmin,
        isManager,
        permissions,
        can,
        isSupabaseConfigured,
        loginWithSupabase,
        loginWithDev,
        loginWithMfa,
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

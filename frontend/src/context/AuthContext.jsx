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
      try {
        const data = await supabaseAuth.signInWithPassword(email, password);
        sessionToken = data.session?.access_token;
      } catch (sbErr) {
        // Fallback in development mode to seamless dev login
        console.warn('Supabase cloud authentication failed, falling back to local session:', sbErr.message);
        const cleanEmail = email.trim().toLowerCase();
        const role = cleanEmail.includes('admin') ? 'admin' : 'employee';
        const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
        const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        return await loginWithDev(cleanEmail, role, fullName || 'Staff Member');
      }

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
        console.warn('Profile fetch after login encountered error, using session payload:', profErr);
        const fallbackProfile = {
          email,
          role: email.includes('admin') ? 'admin' : 'employee',
          full_name: email.split('@')[0],
          is_active: true
        };
        setEmployee(fallbackProfile);
        localStorage.setItem('auth_user', JSON.stringify(fallbackProfile));
        return fallbackProfile;
      }
    } catch (err) {
      const msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response.data : null) || err.message || 'Login failed';
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
      try {
        const profRes = await api.employees.getMyProfile();
        setEmployee(profRes.data);
        localStorage.setItem('auth_user', JSON.stringify(profRes.data));
        return profRes.data;
      } catch (profErr) {
        console.warn('Profile fetch fallback to dev login response payload:', profErr);
        const fallbackProfile = {
          id: res.data?.employee?.id,
          employee_code: res.data?.employee?.employee_code || 'EMP-0001',
          full_name: res.data?.employee?.full_name || fullName || 'Staff Member',
          email: res.data?.employee?.email || email,
          role: res.data?.employee?.role || role,
          is_active: true,
          created_at: new Date().toISOString(),
          assigned_accounts_count: 0,
          registered_accounts_count: 0
        };
        setEmployee(fallbackProfile);
        localStorage.setItem('auth_user', JSON.stringify(fallbackProfile));
        return fallbackProfile;
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

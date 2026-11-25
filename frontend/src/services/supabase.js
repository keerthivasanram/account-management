import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseAuth = {
  isConfigured: isSupabaseConfigured,

  signInWithPassword: async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase URL and Anon Key are not yet configured in environment variables.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Google sign-in through Supabase. The Google client ID/secret live in
  // Supabase (Authentication -> Providers -> Google), never in this bundle.
  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Sign-in is not configured. Please contact your administrator.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  },

  // "Continue with email": Supabase emails a one-time sign-in link that returns to
  // /auth/callback. Access is still decided by the backend: the email must belong to
  // an invited/active employee, and the role comes from that employee record.
  signInWithEmailLink: async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Sign-in is not configured. Please contact your administrator.');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  },

  signUp: async (email, password, fullName = '') => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  getSession: async () => {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  }
};

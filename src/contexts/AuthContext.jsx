import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true);

  const logDev = (msg, ...args) => {
    if (import.meta.env.DEV) console.log(`[Auth] ${msg}`, ...args);
  };

  const refreshSecurityStatus = useCallback(async (userId) => {
    if (!userId) { setHasSecurityQuestion(false); return; }
    try {
      const { data, error } = await supabase
        .from('security_questions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      setHasSecurityQuestion(error ? true : !!data);
    } catch {
      setHasSecurityQuestion(true);
    }
  }, []);

  const fetchAndSetRole = useCallback(async (userId) => {
    if (!userId) { setRole(null); return; }
    try {
      const { data, error } = await supabase.rpc('get_user_role', { p_user_id: userId });
      setRole(error ? null : data || null);
    } catch {
      setRole(null);
    }
  }, []);

  const clearLocalAuth = useCallback(() => {
    try {
      setUser(null);
      setRole(null);
      setHasSecurityQuestion(true);
      const keys = ['vsxpress-auth-token', 'supabase.auth.token', 'sb-access-token', 'sb-refresh-token'];
      keys.forEach(k => window.localStorage.removeItem(k));
    } catch (e) {
      console.warn('Error clearing local auth:', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          const msg = String(error.message || '').toLowerCase();
          const isStale =
            msg.includes('refresh_token_not_found') ||
            msg.includes('invalid refresh token') ||
            msg.includes('not logged in');
          if (isStale) clearLocalAuth();
        }
        if (mounted) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await Promise.all([
              fetchAndSetRole(currentUser.id),
              refreshSecurityStatus(currentUser.id),
            ]);
          }
        }
      } catch (e) {
        logDev('Session check exception:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      logDev(`Auth state change: ${event}`);
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        clearLocalAuth();
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await Promise.all([
            fetchAndSetRole(currentUser.id),
            refreshSecurityStatus(currentUser.id),
          ]);
        }
        setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [refreshSecurityStatus, fetchAndSetRole, clearLocalAuth]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      clearLocalAuth();
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        const msg = String(error.message || '');
        const isIgnorable =
          error.status === 403 ||
          error.status === 401 ||
          msg.includes('session_not_found') ||
          msg.includes('jwt') ||
          msg.includes('refresh_token_not_found');
        if (!isIgnorable) logDev('SignOut warning:', error);
      }
    } catch (e) {
      logDev('SignOut exception (ignored):', e);
    }
  }, [clearLocalAuth]);

  const getUserRole = useCallback(() => role, [role]);

  const value = useMemo(() => ({
    user,
    role,
    loading,
    signIn,
    signOut,
    getUserRole,
    hasSecurityQuestion,
    refreshSecurityStatus: (uid) => refreshSecurityStatus(uid || user?.id),
  }), [user, role, loading, signIn, signOut, getUserRole, hasSecurityQuestion, refreshSecurityStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { useAuth } from '@/hooks/useAuth';
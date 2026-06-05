import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { session, user, isLoading, setSession, setUser, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const profile = await authService.getUserProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          setUser(profile);
        } else {
          clearAuth();
        }
        if (event === 'SIGNED_OUT') {
          clearAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isLoading };
}

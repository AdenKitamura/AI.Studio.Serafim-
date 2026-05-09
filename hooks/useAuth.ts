import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { logger } from '../services/logger';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check local session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      // Try to save token if it exists initially (rare but possible on direct redirect)
      if (session?.provider_token) {
          localStorage.setItem('google_access_token', session.provider_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // CRITICAL: Persist Google Token because Supabase drops it on refresh
      if (session?.provider_token) {
          localStorage.setItem('google_access_token', session.provider_token);
          logger.log('Auth', 'Google Token refreshed and saved', 'success');
      }

      if (session && window.location.hash && window.location.hash.includes('access_token')) {
         window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userName = session?.user?.user_metadata?.full_name || userEmail?.split('@')[0] || 'User';

  return { session, authLoading, userId, userEmail, userName };
};

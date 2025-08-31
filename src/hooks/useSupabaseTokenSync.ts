import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mirrors the Supabase session into the app's localStorage keys that api.ts expects
function mirrorSessionToLocalStorage(session: any | null) {
  if (!session) {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('app_session');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('app_user');
    return;
  }

  const mirrored = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
  };

  localStorage.setItem('auth_session', JSON.stringify(mirrored));
  localStorage.setItem('app_session', JSON.stringify(mirrored));
  localStorage.setItem('auth_user', JSON.stringify(session.user));
  localStorage.setItem('app_user', JSON.stringify(session.user));
}

export function useSupabaseTokenSync() {
  useEffect(() => {
    // Initial sync
    supabase.auth.getSession().then(({ data }) => {
      mirrorSessionToLocalStorage(data.session ?? null);
    });

    // Keep in sync on any auth change
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      mirrorSessionToLocalStorage(session ?? null);
    });

    return () => {
      listener.subscription?.unsubscribe?.();
    };
  }, []);
}

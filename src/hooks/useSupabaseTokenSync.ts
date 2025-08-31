import { useEffect } from 'react';

// DISABLED: No longer syncing Supabase tokens for local backend
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
    // DISABLED: Not syncing with Supabase when using local backend
    console.log('Supabase token sync disabled - using local backend');
  }, []);
}

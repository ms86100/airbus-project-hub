import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to clean up auth state
export const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user role from API service
  const fetchUserRole = async (userId: string) => {
    try {
      const response = await apiClient.getUserRole(userId);
      if (response.success && response.data) {
        setUserRole(response.data.role || null);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  // Refresh user data from API service
  const refreshUser = async () => {
    if (!session?.access_token || !user?.id) return;
    
    try {
      const response = await apiClient.getCurrentSession();
      if (response.success && response.data) {
        setUserRole(response.data.role || null);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener for Supabase session management
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to avoid deadlocks
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      // Clean up any existing auth state first
      cleanupAuthState();
      
      // Use API service for login
      const response = await apiClient.login(email, password);
      
      if (!response.success) {
        return { error: response.error || 'Login failed' };
      }

      // The auth state change listener will handle setting user/session
      // Force page refresh for clean state
      if (response.data?.session) {
        window.location.href = '/';
      }

      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error?: string; message?: string }> => {
    try {
      // Clean up any existing auth state first
      cleanupAuthState();
      
      // Use API service for registration
      const response = await apiClient.register(email, password, fullName);
      
      if (!response.success) {
        return { error: response.error || 'Registration failed' };
      }

      return { message: response.data?.message || 'Registration successful' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Use API service for logout
      await apiClient.logout();
      
      // Clean up local state
      setSession(null);
      setUser(null);
      setUserRole(null);
      
      // Clean up auth state and force sign out from Supabase client
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      // Force page refresh for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out properly",
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthService() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthService must be used within an AuthProvider');
  }
  return context;
}
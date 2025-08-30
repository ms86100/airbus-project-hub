import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🎯 AUTH HOOK V2 - Setting up auth from localStorage...');
    
    // Check for stored session first
    const storedSession = localStorage.getItem('auth_session');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedSession && storedUser) {
      try {
        const session = JSON.parse(storedSession);
        const user = JSON.parse(storedUser);
        console.log('📱 Found stored session for:', user.email);
        
        setSession(session);
        setUser(user);
      } catch (error) {
        console.error('Error parsing stored auth:', error);
        localStorage.removeItem('auth_session');
        localStorage.removeItem('auth_user');
      }
    }
    
    setLoading(false);
    console.log('✅ Auth initialization complete');
  }, []);

  // Auth state cleanup utility
  const cleanupAuthState = () => {
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      console.log('🔐 Starting microservice login for:', email);
      
      const response = await apiClient.login(email, password);
      console.log('📡 Login response:', response);
      
      if (!response.success) {
        console.log('❌ Login failed:', response.error);
        return { error: response.error || 'Login failed' };
      }

      // Set auth state from API response
      if (response.data?.session && response.data?.user) {
        console.log('✅ Setting auth state for user:', response.data.user.email);
        setSession(response.data.session);
        setUser(response.data.user);
        
        // Store session in localStorage for persistence
        localStorage.setItem('auth_session', JSON.stringify(response.data.session));
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
        
        console.log('🏠 Redirecting to dashboard');
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
      const response = await apiClient.register(email, password, fullName);
      
      if (!response.success) {
        return { error: response.error || 'Registration failed' };
      }

      // Update local state with the response
      if (response.data?.session) {
        setSession(response.data.session);
        setUser(response.data.user);
      }

      return { message: response.data?.message };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Starting microservice logout...');
      
      // Clear local state first
      setSession(null);
      setUser(null);
      
      // Remove from localStorage
      localStorage.removeItem('auth_session');
      localStorage.removeItem('auth_user');
      
      // Attempt API logout
      try {
        await apiClient.logout();
        console.log('✅ API logout successful');
      } catch (err) {
        console.log('⚠️ API logout failed, continuing with cleanup');
      }
      
      // Force redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force cleanup even if there's an error
      localStorage.removeItem('auth_session');
      localStorage.removeItem('auth_user');
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useApiAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useApiAuth must be used within an AuthProvider');
  }
  return context;
}
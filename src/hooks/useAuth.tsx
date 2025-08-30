import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/services/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    console.log('🎯 Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change detected:', event);
        console.log('📱 Session:', session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User found, fetching role...');
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          console.log('👤 No user, clearing role');
          setUserRole(null);
        }
        
        setLoading(false);
        console.log('✅ Auth state updated, loading:', false);
      }
    );

    // Check for existing session
    console.log('🔍 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📱 Initial session check:', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('👤 Initial user found, fetching role...');
        fetchUserRole(session.user.id);
      }
      setLoading(false);
      console.log('✅ Initial auth check complete, loading:', false);
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 useAuth.signIn() called');
      console.log('📧 Email:', email);
      
      cleanupAuthState();
      console.log('🧹 Auth state cleaned');
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('🚪 Global signout completed');
      } catch (err) {
        console.log('⚠️ Global signout failed:', err);
        // Continue even if this fails
      }

      console.log('📡 Calling apiClient.login...');
      const response = await apiClient.login(email, password);
      console.log('📡 API Response:', response);
      
      if (!response.success) {
        console.log('❌ Login failed:', response.error);
        return { error: response.error || 'Login failed' };
      }
      
      console.log('✅ Login successful');
      console.log('👤 User data:', response.data?.user);
      
      if (response.data?.user) {
        console.log('🔄 Redirecting to /');
        window.location.href = '/';
      } else {
        console.log('⚠️ No user data in response');
      }
      
      return { error: null };
    } catch (error) {
      console.error('💥 Exception in signIn:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      cleanupAuthState();
      
      const response = await apiClient.register(email, password, fullName);
      
      if (!response.success) {
        return { error: response.error || 'Registration failed' };
      }
      
      return { error: null, message: response.data?.message || "Registration successful" };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Use API service for logout
      await apiClient.logout();
      
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
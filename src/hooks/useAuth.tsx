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
    console.log('🎯 AUTH HOOK V2 - Setting up auth from localStorage...');
    
    // Check for stored session in localStorage
    const storedSession = localStorage.getItem('app_session');
    const storedUser = localStorage.getItem('app_user');
    
    if (storedSession && storedUser) {
      try {
        const session = JSON.parse(storedSession);
        const user = JSON.parse(storedUser);
        console.log('📱 Found stored session for:', user.email);
        
        setSession(session);
        setUser(user);
        
        // Fetch user role
        setTimeout(() => {
          fetchUserRole(user.id);
        }, 0);
      } catch (err) {
        console.log('❌ Error parsing stored session:', err);
        localStorage.removeItem('app_session');
        localStorage.removeItem('app_user');
      }
    } else {
      console.log('📱 No stored session found');
    }
    
    setLoading(false);
    console.log('✅ Auth initialization complete');
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AUTH HOOK V2 - useAuth.signIn() called');
      console.log('📧 Email:', email);
      
      cleanupAuthState();
      // Clear app storage
      localStorage.removeItem('app_session');
      localStorage.removeItem('app_user');
      console.log('🧹 Auth state and app storage cleaned');

      console.log('📡 Calling apiClient.login...');
      const response = await apiClient.login(email, password);
      console.log('📡 API Response:', response);
      
      if (!response.success) {
        console.log('❌ Login failed:', response.error);
        return { error: response.error || 'Login failed' };
      }
      
      console.log('✅ Login successful');
      console.log('👤 User data:', response.data?.user);
      console.log('📱 Session data:', response.data?.session);
      
      if (response.data?.user && response.data?.session) {
        // Store session and user data in localStorage
        localStorage.setItem('app_session', JSON.stringify(response.data.session));
        localStorage.setItem('app_user', JSON.stringify(response.data.user));
        
        // Update state
        setSession(response.data.session);
        setUser(response.data.user);
        
        // Fetch user role
        setTimeout(() => {
          fetchUserRole(response.data.user.id);
        }, 0);
        
        console.log('🔄 Auth state updated, redirecting to /');
        window.location.href = '/';
      } else {
        console.log('⚠️ No user/session data in response');
        return { error: 'Invalid response data' };
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
      console.log('🚪 Signing out...');
      
      // Use API service for logout
      await apiClient.logout();
      
      // Clear app storage
      localStorage.removeItem('app_session');
      localStorage.removeItem('app_user');
      
      // Clear state
      setSession(null);
      setUser(null);
      setUserRole(null);
      
      cleanupAuthState();
      console.log('✅ Logout complete, redirecting to auth');
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force cleanup even if there's an error
      localStorage.removeItem('app_session');
      localStorage.removeItem('app_user');
      setSession(null);
      setUser(null);
      setUserRole(null);
      cleanupAuthState();
      window.location.href = '/auth';
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
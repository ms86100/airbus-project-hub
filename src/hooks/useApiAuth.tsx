import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api_backend';

// Define custom User interface for microservice auth
interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Define custom Session interface for microservice auth
interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  refresh_token?: string;
  user: User;
}

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
    console.log('🎯 AUTH HOOK V3 - Initializing microservice auth...');
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for stored session first
      const storedSession = localStorage.getItem('auth_session');
      const storedUser = localStorage.getItem('auth_user');
      
      console.log('📱 Checking stored auth...', { 
        hasSession: !!storedSession, 
        hasUser: !!storedUser 
      });
      
      if (storedSession && storedUser) {
        try {
          const sessionData = JSON.parse(storedSession);
          const userData = JSON.parse(storedUser);
          
          console.log('✅ Found stored auth for:', userData.email);
          
          setSession(sessionData);
          setUser(userData);
        } catch (error) {
          console.error('❌ Error parsing stored auth:', error);
          localStorage.removeItem('auth_session');
          localStorage.removeItem('auth_user');
        }
      } else {
        console.log('❌ No stored authentication found');
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
    } finally {
      setLoading(false);
      console.log('✅ Auth initialization complete');
    }
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
        
        const sessionData = response.data.session;
        const userData = response.data.user;
        
        setSession(sessionData);
        setUser(userData);
        
        // Store session in localStorage for persistence
        console.log('💾 Storing session and user data');
        localStorage.setItem('auth_session', JSON.stringify(sessionData));
        localStorage.setItem('auth_user', JSON.stringify(userData));
        
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
        
        // Store session in localStorage
        localStorage.setItem('auth_session', JSON.stringify(response.data.session));
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
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
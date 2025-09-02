import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApiAuth } from '@/hooks/useApiAuth';
import DashboardLayout from '@/components/DashboardLayout';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useApiAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🏠 Index page loaded');
    console.log('👤 Current user:', user?.email || 'No user');
    console.log('⏳ Loading state:', loading);
    
    // Only redirect if not already on auth page and no user found after loading
    if (!loading && !user && location.pathname !== '/auth') {
      console.log('🔄 No user detected, redirecting to auth');
      navigate('/auth');
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

export default Index;

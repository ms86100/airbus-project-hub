import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApiAuth } from '@/hooks/useApiAuth';
import DashboardLayout from '@/components/DashboardLayout';
import Dashboard from '@/components/Dashboard';

// Wrapper component that handles navigation logic
const IndexNavigation = ({ user, loading }: { user: any; loading: boolean }) => {
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

  return null;
};

const Index = () => {
  const { user, loading } = useApiAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <IndexNavigation user={user} loading={loading} />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

export default Index;

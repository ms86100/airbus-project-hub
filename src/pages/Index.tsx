import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🏠 Index page loaded');
    console.log('👤 Current user:', user?.email || 'No user');
    console.log('⏳ Loading state:', loading);
    
    if (!loading && !user) {
      console.log('🔄 No user detected, redirecting to auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

import React, { useEffect } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import DashboardLayout from '@/components/DashboardLayout';
import Dashboard from '@/components/Dashboard';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';

const Index = () => {
  const { user, loading } = useApiAuth();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🏠 Index page loaded');
    console.log('👤 Current user:', user?.email || 'No user');
    console.log('⏳ Loading state:', loading);
    
    // Add a small delay to prevent race conditions with auth state
    const timer = setTimeout(() => {
      // Only redirect if not already on auth page and no user found after loading
      if (!loading && !user && window.location.pathname !== '/auth') {
        console.log('🔄 No user detected after delay, redirecting to auth');
        // Use window.location to avoid Router context issues during auth state
        window.location.href = '/auth';
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading]);

  // One-time seed trigger per browser session (requested by user)
  useEffect(() => {
    const runSeed = async () => {
      try {
        const marker = localStorage.getItem('demo_seed_last_run');
        if (loading || !user || marker) return;

        // Mark immediately to avoid duplicate triggers
        localStorage.setItem('demo_seed_last_run', String(Date.now()));
        toast({ title: 'Seeding demo data…', description: 'Resetting and loading Airbus/Aerospace projects.' });

        const result = await apiClient.resetAndSeedDemo(true);
        if (result?.success) {
          toast({ title: 'Seed complete', description: `${result.data?.projects?.length || 0} projects created.` });
        } else {
          // Clear marker to allow retry if it failed
          localStorage.removeItem('demo_seed_last_run');
          toast({ title: 'Seed failed', description: result?.error || 'Unknown error', variant: 'destructive' });
        }
      } catch (e: any) {
        localStorage.removeItem('demo_seed_last_run');
        toast({ title: 'Seed error', description: String(e), variant: 'destructive' });
      }
    };

    runSeed();
  }, [user, loading, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

export default Index;

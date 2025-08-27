import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { ProjectWorkspaceContent } from '@/components/ProjectWorkspaceContent';

const ProjectWorkspace = () => {
  const { id: projectId, module = 'roadmap' } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
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

  if (!user || !projectId) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProjectSidebar projectId={projectId} />
        <main className="flex-1">
          <ProjectWorkspaceContent projectId={projectId} currentModule={module} />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ProjectWorkspace;
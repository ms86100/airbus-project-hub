import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface ProjectContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  isProjectSelected: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const location = useLocation();

  // Auto-detect project from URL
  useEffect(() => {
    console.log('🔍 ProjectContext - Current path:', location.pathname);
    const projectMatch = location.pathname.match(/\/project\/([^\/]+)/);
    console.log('🔍 ProjectContext - Project match:', projectMatch);
    if (projectMatch) {
      console.log('🔍 ProjectContext - Setting project ID:', projectMatch[1]);
      setSelectedProjectId(projectMatch[1]);
    } else if (!location.pathname.startsWith('/project/')) {
      console.log('🔍 ProjectContext - Clearing project ID');
      setSelectedProjectId(null);
    }
  }, [location.pathname]);

  const isProjectSelected = !!selectedProjectId;

  return (
    <ProjectContext.Provider value={{
      selectedProjectId,
      setSelectedProjectId,
      isProjectSelected
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
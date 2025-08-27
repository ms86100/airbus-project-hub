import React from 'react';
import { RoadmapView } from '@/components/workspace/RoadmapView';
import { KanbanView } from '@/components/workspace/KanbanView';
import { StakeholdersView } from '@/components/workspace/StakeholdersView';
import { StatusManagementView } from '@/components/workspace/StatusManagementView';

interface ProjectWorkspaceContentProps {
  projectId: string;
  currentModule?: string;
}

export function ProjectWorkspaceContent({ projectId, currentModule = 'roadmap' }: ProjectWorkspaceContentProps) {
  const renderModule = () => {
    switch (currentModule) {
      case 'roadmap':
        return <RoadmapView />;
      case 'kanban':
        return <KanbanView projectId={projectId} />;
      case 'stakeholders':
        return <StakeholdersView projectId={projectId} />;
      case 'status':
        return <StatusManagementView projectId={projectId} />;
      default:
        return <RoadmapView />;
    }
  };

  return (
    <div className="flex-1 overflow-hidden">
      {renderModule()}
    </div>
  );
}
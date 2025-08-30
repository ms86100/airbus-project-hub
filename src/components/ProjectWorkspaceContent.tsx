import React from 'react';
import { RoadmapView } from '@/components/workspace/RoadmapView';
import { KanbanView } from '@/components/workspace/KanbanView';
import { StakeholdersView } from '@/components/workspace/StakeholdersView';
import { StatusManagementView } from '@/components/workspace/StatusManagementView';
import { RiskRegisterView } from '@/components/workspace/RiskRegisterView';
import { DiscussionLog } from '@/components/workspace/DiscussionLog';
import { TaskBacklog } from '@/components/workspace/TaskBacklog';

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
      case 'discussions':
        return <DiscussionLog projectId={projectId} projectName="Current Project" />;
      case 'backlog':
        return <TaskBacklog projectId={projectId} />;
      case 'status':
        return <StatusManagementView projectId={projectId} />;
      case 'risks':
        return <RiskRegisterView projectId={projectId} />;
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
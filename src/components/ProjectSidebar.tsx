import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutGrid, Users, Settings, ArrowLeft, AlertTriangle, MessageCircle, BarChart3, RotateCcw, Shield, Activity } from 'lucide-react';
import { AccessControlDialog } from '@/components/access-control/AccessControlDialog';
import { AuditLogView } from '@/components/audit/AuditLogView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useModulePermissions, ModuleName } from '@/hooks/useModulePermissions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

interface ProjectSidebarProps {
  projectId: string;
}

const sidebarItems: Array<{
  id: string;
  title: string;
  icon: any;
  path: string;
  description: string;
  module: ModuleName;
}> = [
  { 
    id: 'overview', 
    title: 'Overview', 
    icon: LayoutGrid, 
    path: 'overview',
    description: 'Project overview and dashboard',
    module: 'overview' as ModuleName
  },
  { 
    id: 'tasks', 
    title: 'Tasks & Milestones', 
    icon: Calendar, 
    path: 'status',
    description: 'Manage tasks and milestones',
    module: 'tasks_milestones' as ModuleName
  },
  { 
    id: 'roadmap', 
    title: 'Roadmap', 
    icon: Calendar, 
    path: 'roadmap',
    description: 'Timeline view of milestones and tasks',
    module: 'roadmap' as ModuleName
  },
  { 
    id: 'kanban', 
    title: 'Kanban', 
    icon: LayoutGrid, 
    path: 'kanban',
    description: 'Drag and drop tasks by status',
    module: 'kanban' as ModuleName
  },
  { 
    id: 'stakeholders', 
    title: 'Stakeholders', 
    icon: Users, 
    path: 'stakeholders',
    description: 'Project stakeholder registry',
    module: 'stakeholders' as ModuleName
  },
  { 
    id: 'risks', 
    title: 'Risk Register', 
    icon: AlertTriangle, 
    path: 'risks',
    description: 'Identify and manage project risks',
    module: 'risk_register' as ModuleName
  },
  { 
    id: 'discussions', 
    title: 'Discussions', 
    icon: MessageCircle, 
    path: 'discussions',
    description: 'Project discussions and meetings',
    module: 'discussions' as ModuleName
  },
  { 
    id: 'backlog', 
    title: 'Task Backlog', 
    icon: Settings, 
    path: 'backlog',
    description: 'Manage task backlog',
    module: 'task_backlog' as ModuleName
  },
  { 
    id: 'capacity', 
    title: 'Team Capacity', 
    icon: BarChart3, 
    path: 'capacity',
    description: 'Manage team capacity planning',
    module: 'team_capacity' as ModuleName
  },
  { 
    id: 'retrospective', 
    title: 'Retrospectives', 
    icon: RotateCcw, 
    path: 'retrospective',
    description: 'Sprint retrospectives and team feedback',
    module: 'retrospectives' as ModuleName
  },
];

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;
  const [showAuditLog, setShowAuditLog] = useState(false);
  const { isProjectOwner, canRead, loading } = useModulePermissions(projectId);

  console.log('ProjectSidebar - isProjectOwner:', isProjectOwner, 'loading:', loading);

  const isActive = (path: string) => currentPath.includes(`/project/${projectId}/${path}`);
  const hasActiveRoute = sidebarItems.some((item) => isActive(item.path));

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  return (
    <Sidebar className="w-60" collapsible="none">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
          </div>
          <div className="mt-3">
            <h2 className="text-lg font-semibold text-sidebar-foreground">Project Workspace</h2>
            <p className="text-sm text-sidebar-foreground/60">Navigate project modules</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide">
            Modules
          </SidebarGroupLabel>
          
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {sidebarItems.map((item) => {
                const itemIsActive = isActive(item.path);
                
                // Check if user has permission to view this module
                if (!canRead(item.module)) {
                  return null; // Hide modules user doesn't have access to
                }

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink 
                        to={`/project/${projectId}/${item.path}`} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${getNavCls({ isActive: itemIsActive })}`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="font-medium text-sm truncate w-full">{item.title}</span>
                          <span className="text-xs opacity-60 truncate w-full">{item.description}</span>
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide">
            Project
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full">
                  <button 
                    onClick={() => navigate(`/project/${projectId}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground w-full text-left"
                  >
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="font-medium text-sm truncate w-full">Project Settings</span>
                      <span className="text-xs opacity-60 truncate w-full">Edit project details</span>
                    </div>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              
              <SidebarMenuItem>
                <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
                  <DialogTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground w-full text-left">
                        <Activity className="h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="font-medium text-sm truncate w-full">Activity History</span>
                          <span className="text-xs opacity-60 truncate w-full">View project changes</span>
                        </div>
                      </button>
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Project Activity History</DialogTitle>
                    </DialogHeader>
                    <AuditLogView projectId={projectId} />
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
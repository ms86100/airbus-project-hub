import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutGrid, Users, Settings, ArrowLeft, AlertTriangle } from 'lucide-react';
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

const sidebarItems = [
  { 
    id: 'roadmap', 
    title: 'Roadmap', 
    icon: Calendar, 
    path: 'roadmap',
    description: 'Timeline view of milestones and tasks'
  },
  { 
    id: 'kanban', 
    title: 'Kanban', 
    icon: LayoutGrid, 
    path: 'kanban',
    description: 'Drag and drop tasks by status'
  },
  { 
    id: 'stakeholders', 
    title: 'Stakeholders', 
    icon: Users, 
    path: 'stakeholders',
    description: 'Project stakeholder registry'
  },
  { 
    id: 'status', 
    title: 'Status Management', 
    icon: Settings, 
    path: 'status',
    description: 'Configure task statuses'
  },
  { 
    id: 'risks', 
    title: 'Risk Register', 
    icon: AlertTriangle, 
    path: 'risks',
    description: 'Identify and manage project risks'
  },
];

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
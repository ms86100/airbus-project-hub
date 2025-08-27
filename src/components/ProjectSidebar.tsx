import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, LayoutGrid, Users, Settings } from 'lucide-react';
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
];

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
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
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <SidebarTrigger className="ml-auto" />
          {!collapsed && (
            <div className="mt-2">
              <h2 className="text-lg font-semibold text-sidebar-foreground">Project Workspace</h2>
              <p className="text-sm text-sidebar-foreground/60">Navigate project modules</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const itemIsActive = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={`/project/${projectId}/${item.path}`} 
                        className={getNavCls({ isActive: itemIsActive })}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <div className="flex flex-col">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs opacity-60">{item.description}</span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
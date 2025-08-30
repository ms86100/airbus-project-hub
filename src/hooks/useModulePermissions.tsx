import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ModuleName = 
  | 'overview'
  | 'tasks_milestones'
  | 'roadmap'
  | 'kanban'
  | 'stakeholders'
  | 'risk_register'
  | 'discussions'
  | 'task_backlog'
  | 'team_capacity'
  | 'retrospectives';

export type AccessLevel = 'read' | 'write';

interface ModulePermissions {
  [key: string]: AccessLevel | null;
}

export function useModulePermissions(projectId: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermissions>({});
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    checkPermissions();
  }, [user, projectId]);

  const checkPermissions = async () => {
    if (!user) return;

    console.log('Checking permissions for user:', user.id, 'project:', projectId);

    try {
      // Check if user is project owner or admin
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        setLoading(false);
        return;
      }

      const isOwner = projectData.created_by === user.id;
      console.log('User is project owner:', isOwner);
      setIsProjectOwner(isOwner);

      // If user is project owner or admin, they have full access
      if (isOwner) {
        // Grant full access to all modules
        const fullPermissions: ModulePermissions = {
          overview: 'write',
          tasks_milestones: 'write',
          roadmap: 'write',
          kanban: 'write',
          stakeholders: 'write',
          risk_register: 'write',
          discussions: 'write',
          task_backlog: 'write',
          team_capacity: 'write',
          retrospectives: 'write',
        };
        setPermissions(fullPermissions);
        setLoading(false);
        return;
      }

      // Fetch specific module permissions for this user
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('module_permissions')
        .select('module, access_level')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
        setLoading(false);
        return;
      }

      const userPermissions: ModulePermissions = {};
      console.log('Fetched permissions data:', permissionsData);
      permissionsData.forEach(permission => {
        userPermissions[permission.module] = permission.access_level as AccessLevel;
      });

      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: ModuleName, requiredAccess: AccessLevel = 'read'): boolean => {
    if (isProjectOwner) return true;
    
    const modulePermission = permissions[module];
    if (!modulePermission) return false;
    
    if (requiredAccess === 'read') {
      return modulePermission === 'read' || modulePermission === 'write';
    }
    
    return modulePermission === 'write';
  };

  const canRead = (module: ModuleName): boolean => hasPermission(module, 'read');
  const canWrite = (module: ModuleName): boolean => hasPermission(module, 'write');

  return {
    permissions,
    isProjectOwner,
    loading,
    hasPermission,
    canRead,
    canWrite,
    refreshPermissions: checkPermissions,
  };
}
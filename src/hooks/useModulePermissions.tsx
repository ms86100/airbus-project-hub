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
  const [isAdmin, setIsAdmin] = useState(false);
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
      // Check if user is project owner
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

      // Check if user is admin
      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdminUser = userRoleData?.role === 'admin';
      console.log('User is admin:', isAdminUser);
      setIsAdmin(isAdminUser);

      // If user is project owner or admin, they have full access
      if (isOwner || isAdminUser) {
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
      console.log('Fetched permissions data for user:', user.id, 'project:', projectId, 'data:', permissionsData);
      
      if (permissionsData && permissionsData.length > 0) {
        permissionsData.forEach(permission => {
          userPermissions[permission.module] = permission.access_level as AccessLevel;
          console.log('Setting permission:', permission.module, '=', permission.access_level);
        });
      } else {
        console.log('No module permissions found for user:', user.id, 'in project:', projectId);
      }

      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: ModuleName, requiredAccess: AccessLevel = 'read'): boolean => {
    console.log('Checking permission for module:', module, 'requiredAccess:', requiredAccess, 'isProjectOwner:', isProjectOwner, 'isAdmin:', isAdmin, 'loading:', loading);
    
    // During loading, deny access to prevent showing unauthorized modules
    if (loading) {
      console.log('Still loading permissions - denying access');
      return false;
    }
    
    if (isProjectOwner || isAdmin) {
      console.log('User has owner/admin access - granted');
      return true;
    }
    
    const modulePermission = permissions[module];
    console.log('Module permission for', module, ':', modulePermission);
    
    if (!modulePermission) {
      console.log('No permission found for module:', module);
      return false;
    }
    
    if (requiredAccess === 'read') {
      const hasAccess = modulePermission === 'read' || modulePermission === 'write';
      console.log('Read access check for', module, ':', hasAccess);
      return hasAccess;
    }
    
    const hasWriteAccess = modulePermission === 'write';
    console.log('Write access check for', module, ':', hasWriteAccess);
    return hasWriteAccess;
  };

  const canRead = (module: ModuleName): boolean => {
    const result = hasPermission(module, 'read');
    console.log('canRead result for', module, ':', result, 'loading:', loading);
    return result;
  };
  
  const canWrite = (module: ModuleName): boolean => {
    const result = hasPermission(module, 'write');
    console.log('canWrite result for', module, ':', result, 'loading:', loading);
    return result;
  };

  return {
    permissions,
    isProjectOwner,
    isAdmin,
    loading,
    hasPermission,
    canRead,
    canWrite,
    refreshPermissions: checkPermissions,
  };
}
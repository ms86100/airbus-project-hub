import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Project {
  id: string;
  name: string;
}

interface ModulePermission {
  id: string;
  project_id: string;
  project_name: string;
  user_id: string;
  user_email: string;
  module: string;
  access_level: 'read' | 'write';
  granted_by: string;
  created_at: string;
}

const MODULES = [
  { name: 'overview', label: 'Overview' },
  { name: 'tasks_milestones', label: 'Tasks & Milestones' },
  { name: 'roadmap', label: 'Roadmap' },
  { name: 'kanban', label: 'Kanban' },
  { name: 'stakeholders', label: 'Stakeholders' },
  { name: 'risk_register', label: 'Risk Register' },
  { name: 'discussions', label: 'Discussions' },
  { name: 'task_backlog', label: 'Task Backlog' },
  { name: 'team_capacity', label: 'Team Capacity' },
  { name: 'retrospectives', label: 'Retrospectives' },
];

export default function AccessControl() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAccess, setSelectedAccess] = useState<'read' | 'write'>('read');

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchPermissions();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      // Only fetch projects the user owns if not admin
      let query = supabase.from('projects').select('id, name');
      
      if (userRole !== 'admin') {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('module_permissions')
        .select(`
          *,
          projects!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails for the permissions
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const permissionsWithDetails = data?.map(permission => ({
        ...permission,
        project_name: permission.projects.name,
        user_email: profiles?.find(p => p.id === permission.user_id)?.email || 'Unknown'
      })) || [];

      setPermissions(permissionsWithDetails);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive",
      });
    }
  };

  const grantAccess = async () => {
    if (!userEmail || !selectedProject || !selectedModule) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError) {
        toast({
          title: "Error",
          description: "User not found. They must sign up first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Add module permission
      const { error: permissionError } = await supabase
        .from('module_permissions')
        .upsert({
          project_id: selectedProject,
          user_id: userData.id,
          module: selectedModule as any,
          access_level: selectedAccess,
          granted_by: user?.id,
        });

      if (permissionError) throw permissionError;

      toast({
        title: "Success",
        description: "Access granted successfully",
      });

      // Reset form
      setUserEmail('');
      setSelectedProject('');
      setSelectedModule('');
      setSelectedAccess('read');

      // Refresh permissions
      fetchPermissions();
    } catch (error) {
      console.error('Error granting access:', error);
      toast({
        title: "Error",
        description: "Failed to grant access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('module_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission removed successfully",
      });

      fetchPermissions();
    } catch (error) {
      console.error('Error removing permission:', error);
      toast({
        title: "Error",
        description: "Failed to remove permission",
        variant: "destructive",
      });
    }
  };

  if (userRole !== 'admin' && projects.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-brand-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Access Control</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Projects Found</CardTitle>
            <CardDescription>
              You must be a project owner or administrator to manage access control.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-brand-primary" />
        <h1 className="text-3xl font-bold text-text-primary">Access Control</h1>
      </div>

      {/* Grant Access Form */}
      <Card>
        <CardHeader>
          <CardTitle>Grant Module Access</CardTitle>
          <CardDescription>
            Invite collaborators and assign specific module permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="User email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((module) => (
                  <SelectItem key={module.name} value={module.name}>
                    {module.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAccess} onValueChange={(value: 'read' | 'write') => setSelectedAccess(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="write">Write</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={grantAccess} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Grant Access
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Permissions</CardTitle>
          <CardDescription>
            Manage existing module permissions for all projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Granted Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-medium">{permission.user_email}</TableCell>
                  <TableCell>{permission.project_name}</TableCell>
                  <TableCell>
                    {MODULES.find(m => m.name === permission.module)?.label || permission.module}
                  </TableCell>
                  <TableCell>
                    <Badge variant={permission.access_level === 'write' ? 'default' : 'secondary'}>
                      {permission.access_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(permission.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePermission(permission.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {permissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-muted">
                    No permissions granted yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
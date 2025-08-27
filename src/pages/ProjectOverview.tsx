import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Edit3, Trash2, Calendar, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Layout from '@/components/Layout';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: string;
  description: string;
  project_id: string;
  created_by: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  owner_id: string;
  milestone_id: string;
  project_id: string;
  created_by: string;
}

const ProjectOverview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);
      setEditForm({
        name: projectData.name,
        description: projectData.description || '',
        start_date: projectData.start_date || '',
        end_date: projectData.end_date || ''
      });

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('due_date');

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('created_at');

      if (tasksError) throw tasksError;
      setTasks(tasksData);

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async () => {
    if (!project || !user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editForm.name,
          description: editForm.description,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null
        })
        .eq('id', project.id);

      if (error) throw error;

      setProject({
        ...project,
        name: editForm.name,
        description: editForm.description,
        start_date: editForm.start_date,
        end_date: editForm.end_date
      });

      setEditingProject(false);
      toast({
        title: "Project Updated",
        description: "Project details have been saved.",
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project.",
        variant: "destructive",
      });
    }
  };

  const deleteProject = async () => {
    if (!project || !user || deleteConfirmText !== project.name) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project Deleted",
        description: "The project has been permanently deleted.",
      });
      navigate('/');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'planning': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-text-muted">Loading project...</div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-text-muted">Project not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-lg space-y-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-md">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-sm">
            <Button
              variant="outline"
              onClick={() => setEditingProject(true)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-status-error border-status-error hover:bg-status-error hover:text-white">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Type the project name "{project.name}" to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type project name"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteProject}
                    disabled={deleteConfirmText !== project.name}
                    className="bg-status-error hover:bg-status-error/90"
                  >
                    Delete Project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Project Header */}
        <div className="space-y-md">
          {editingProject ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-md">
                <div>
                  <label className="text-sm font-medium text-text-primary mb-xs block">Project Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary mb-xs block">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Project description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-xs block">Start Date</label>
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-xs block">End Date</label>
                    <Input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-sm">
                  <Button onClick={updateProject}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditingProject(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              <h1 className="text-3xl font-bold text-text-primary">{project.name}</h1>
              <p className="text-text-muted mt-xs">{project.description}</p>
              <div className="flex items-center gap-md mt-md">
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {React.createElement(getStatusIcon(project.status), { className: "h-3 w-3 mr-1" })}
                  {project.status.replace('_', ' ')}
                </Badge>
                {project.start_date && (
                  <div className="flex items-center gap-xs text-sm text-text-muted">
                    <Calendar className="h-4 w-4" />
                    {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-lg">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-text-primary">{tasks.length}</div>
                  <p className="text-sm text-text-muted">
                    {tasks.filter(t => t.status === 'completed').length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-text-primary">{milestones.length}</div>
                  <p className="text-sm text-text-muted">
                    {milestones.filter(m => m.status === 'completed').length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-text-primary">1</div>
                  <p className="text-sm text-text-muted">Project creator</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-lg">
            <div className="space-y-sm">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-text-primary">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-text-muted mt-xs">{task.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-sm">
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.due_date && (
                          <span className="text-sm text-text-muted">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <Card>
                  <CardContent className="p-lg text-center">
                    <p className="text-text-muted">No tasks found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-lg">
            <div className="space-y-sm">
              {milestones.map((milestone) => {
                const milestoneTasks = tasks.filter(t => t.milestone_id === milestone.id);
                return (
                  <Card key={milestone.id}>
                    <CardContent className="p-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-text-primary">{milestone.name}</h3>
                          {milestone.description && (
                            <p className="text-sm text-text-muted mt-xs">{milestone.description}</p>
                          )}
                          <p className="text-xs text-text-muted mt-xs">
                            {milestoneTasks.length} tasks
                          </p>
                        </div>
                        <div className="flex items-center gap-sm">
                          <Badge variant={getStatusBadgeVariant(milestone.status)}>
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-text-muted">
                            Due: {new Date(milestone.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {milestones.length === 0 && (
                <Card>
                  <CardContent className="p-lg text-center">
                    <p className="text-text-muted">No milestones found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectOverview;
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
import { ArrowLeft, Edit3, Trash2, Calendar, Users, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RoadmapView } from '@/components/workspace/RoadmapView';
import { KanbanView } from '@/components/workspace/KanbanView';
import { StakeholdersManagement } from '@/components/workspace/StakeholdersManagement';
import { TaskCard } from '@/components/workspace/TaskManagement';
import { AddTaskDialog } from '@/components/workspace/AddTaskDialog';

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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Project not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6" style={{ width: '100%' }}>
          {/* Header */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/projects')} className="shrink-0">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/project/${id}/edit`)}
                  className="w-full sm:w-auto"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto text-status-error border-status-error hover:bg-status-error hover:text-white">
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
          </div>

          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6">
              <div className="border-l-4 border-airbus-primary pl-4">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <p className="text-muted-foreground mt-2 text-lg">{project.description}</p>
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <Badge variant={getStatusBadgeVariant(project.status)} className="text-sm">
                    {React.createElement(getStatusIcon(project.status), { className: "h-3 w-3 mr-1" })}
                    {project.status.replace('_', ' ')}
                  </Badge>
                  {project.start_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <Tabs defaultValue="overview" className="w-full">
              <div className="border-b border-border bg-muted/5">
                <TabsList className="w-full h-auto p-0 bg-transparent">
                  <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-airbus-primary data-[state=active]:text-white">Overview</TabsTrigger>
                  <TabsTrigger value="tasks" className="flex-1 data-[state=active]:bg-airbus-primary data-[state=active]:text-white">Tasks & Milestones</TabsTrigger>
                  <TabsTrigger value="roadmap" className="flex-1 data-[state=active]:bg-airbus-primary data-[state=active]:text-white">Roadmap</TabsTrigger>
                  <TabsTrigger value="kanban" className="flex-1 data-[state=active]:bg-airbus-primary data-[state=active]:text-white">Kanban</TabsTrigger>
                  <TabsTrigger value="stakeholders" className="flex-1 data-[state=active]:bg-airbus-primary data-[state=active]:text-white">Stakeholders</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="border-l-4 border-l-airbus-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle className="h-5 w-5 text-airbus-primary" />
                        Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{tasks.length}</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tasks.filter(t => t.status === 'completed').length} completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-airbus-secondary">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5 text-airbus-secondary" />
                        Milestones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{milestones.length}</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestones.filter(m => m.status === 'completed').length} completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-accent">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-accent" />
                        Team
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">1</div>
                      <p className="text-sm text-muted-foreground mt-1">Project creator</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="p-6">
                <div className="space-y-6">
                  {milestones.map((milestone) => {
                    const milestoneTasks = tasks.filter(t => t.milestone_id === milestone.id);
                    
                    return (
                       <Card key={milestone.id} className="border-l-4 border-l-airbus-primary mt-6">
                         <CardHeader className="pb-3">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                              <CardTitle className="text-xl">{milestone.name}</CardTitle>
                              {milestone.description && (
                                <p className="text-muted-foreground mt-1">{milestone.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant={getStatusBadgeVariant(milestone.status)}>
                                  {milestone.status.replace('_', ' ')}
                                </Badge>
                                {milestone.due_date && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                                  </div>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {milestoneTasks.length} tasks
                                </Badge>
                              </div>
                            </div>
                            <AddTaskDialog 
                              milestoneId={milestone.id}
                              projectId={id!}
                              onTaskAdded={fetchProjectData}
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {milestoneTasks.map((task) => (
                              <TaskCard 
                                key={task.id} 
                                task={task}
                                projectId={id!}
                                onTaskUpdate={fetchProjectData}
                              />
                            ))}
                            {milestoneTasks.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <p className="text-sm">No tasks in this milestone yet.</p>
                                <p className="text-sm">Click "Add Task" to create one.</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Unassigned tasks */}
                  {tasks.filter(t => !t.milestone_id).length > 0 && (
                    <Card className="border-l-4 border-l-muted">
                      <CardHeader>
                        <CardTitle className="text-xl text-muted-foreground">Unassigned Tasks</CardTitle>
                        <p className="text-sm text-muted-foreground">Tasks not yet assigned to a milestone</p>
                      </CardHeader>
                         <CardContent className="pt-4">
                        <div className="space-y-3">
                          {tasks.filter(t => !t.milestone_id).map((task) => (
                            <TaskCard 
                              key={task.id} 
                              task={task}
                              projectId={id!}
                              onTaskUpdate={fetchProjectData}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {milestones.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
                        <p className="text-muted-foreground text-center">
                          Create milestones to organize your project tasks.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>


              <TabsContent value="roadmap" className="p-0">
                <div className="h-[700px] w-full">
                  <RoadmapView />
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="p-0">
                <div className="h-[700px] w-full">
                  <KanbanView projectId={id!} />
                </div>
              </TabsContent>

              <TabsContent value="stakeholders" className="p-0">
                <div className="h-[700px] w-full">
                  <StakeholdersManagement projectId={id!} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectOverview;
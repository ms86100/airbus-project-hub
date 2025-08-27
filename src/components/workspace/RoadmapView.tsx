import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RoadmapViewProps {
  projectId: string;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  description?: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  due_date?: string;
  milestone_id?: string;
  owner_id?: string;
}

export function RoadmapView({ projectId }: RoadmapViewProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewScale, setViewScale] = useState<'Day' | 'Week' | 'Month'>('Week');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date');

      if (milestonesError) throw milestonesError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (tasksError) throw tasksError;

      setMilestones(milestonesData || []);
      setTasks(tasksData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'blocked': return 'destructive';
      default: return 'outline';
    }
  };

  const getTasksForMilestone = (milestoneId: string) => {
    return tasks.filter(task => task.milestone_id === milestoneId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Roadmap</h1>
            <p className="text-sm text-muted-foreground">Timeline view of milestones and tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Tabs value={viewScale} onValueChange={(value) => setViewScale(value as any)}>
                <TabsList>
                  <TabsTrigger value="Day">Day</TabsTrigger>
                  <TabsTrigger value="Week">Week</TabsTrigger>
                  <TabsTrigger value="Month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {milestones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first milestone to start planning your project timeline.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </CardContent>
            </Card>
          ) : (
            milestones.map((milestone) => {
              const milestoneTasks = getTasksForMilestone(milestone.id);
              
              return (
                <Card key={milestone.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{milestone.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Due: {format(new Date(milestone.due_date), 'MMM dd, yyyy')}</span>
                          <Badge variant={getStatusBadgeVariant(milestone.status)}>
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {milestoneTasks.length > 0 && (
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Tasks ({milestoneTasks.length})</h4>
                        <div className="grid gap-3">
                          {milestoneTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1">
                                <h5 className="font-medium">{task.title}</h5>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                )}
                                {task.due_date && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {task.priority && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                )}
                                <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
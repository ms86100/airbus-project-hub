import React, { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TasksTableView } from '@/components/workspace/TasksTableView';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { format } from 'date-fns';

interface StatusManagementViewProps {
  projectId: string;
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
  created_at: string;
  updated_at: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  due_date: string;
  status: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function StatusManagementView({ projectId }: StatusManagementViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'table'>('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks and milestones
      const [tasksResponse, milestonesResponse] = await Promise.all([
        apiClient.getTasks(projectId),
        apiClient.getMilestones(projectId)
      ]);
      
      console.log('Tasks response:', tasksResponse);
      console.log('Milestones response:', milestonesResponse);
      
      if (tasksResponse.success) {
        const taskData = Array.isArray(tasksResponse.data) 
          ? tasksResponse.data 
          : (tasksResponse.data && typeof tasksResponse.data === 'object' && 'tasks' in tasksResponse.data)
            ? (tasksResponse.data as any).tasks || []
            : [];
        setTasks(taskData);
      } else {
        console.error('Error fetching tasks:', tasksResponse.error);
      }
      
      if (milestonesResponse.success) {
        const milestoneData = Array.isArray(milestonesResponse.data) 
          ? milestonesResponse.data 
          : (milestonesResponse.data && typeof milestonesResponse.data === 'object' && 'milestones' in milestonesResponse.data)
            ? (milestonesResponse.data as any).milestones || []
            : [];
        setMilestones(milestoneData);
      } else {
        console.error('Error fetching milestones:', milestonesResponse.error);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load tasks and milestones",
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
      case 'planning': return 'outline';
      case 'todo': return 'outline';
      case 'blocked': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'blocked': return AlertCircle;
      default: return Calendar;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Project Status Overview</h2>
          <p className="text-muted-foreground">Track tasks and milestones progress</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'overview' | 'table')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="table">Table View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Tasks</p>
                <p className="text-2xl font-bold">{completedTasks}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressTasks}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">{totalMilestones}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => {
                    const StatusIcon = getStatusIcon(task.status);
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="h-4 w-4" />
                          <div>
                            <p className="font-medium line-clamp-1">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {formatDate(task.due_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getStatusBadgeVariant(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={getPriorityBadgeVariant(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Project Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No milestones found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((milestone) => {
                    const StatusIcon = getStatusIcon(milestone.status);
                    return (
                      <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="h-4 w-4" />
                          <div>
                            <p className="font-medium line-clamp-1">{milestone.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {formatDate(milestone.due_date)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(milestone.status)}>
                          {milestone.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Table View
        <Card>
          <CardHeader>
            <CardTitle>Detailed Tasks & Milestones View</CardTitle>
          </CardHeader>
          <CardContent>
            <TasksTableView 
              tasks={tasks} 
              milestones={milestones}
              onTaskUpdate={fetchData}
              onMilestoneUpdate={fetchData}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
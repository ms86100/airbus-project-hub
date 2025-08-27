import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  milestone_id?: string;
  project_id: string;
  created_at: string;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: string;
  project_id: string;
}

interface GanttChartProps {
  projectId: string;
}

export function GanttChart({ projectId }: GanttChartProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

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
      setMilestones(milestonesData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Calculate date range
      const allDates = [
        ...(milestonesData || []).map(m => new Date(m.due_date)),
        ...(tasksData || []).filter(t => t.due_date).map(t => new Date(t.due_date!))
      ];
      
      if (allDates.length > 0) {
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        
        // Add padding
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 7);
        
        setStartDate(minDate);
        setEndDate(maxDate);
      } else {
        // Default to current month
        const now = new Date();
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 3, 0));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimelineHeaders = () => {
    const headers = [];
    const current = new Date(startDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate month headers
    const months = [];
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const monthName = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      months.push({
        name: monthName,
        start: Math.max(0, Math.ceil((monthStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
        days: Math.min(monthEnd.getDate(), Math.ceil((monthEnd.getTime() - Math.max(startDate.getTime(), monthStart.getTime())) / (1000 * 60 * 60 * 24)))
      });
      
      current.setMonth(current.getMonth() + 1);
    }

    return { months, totalDays };
  };

  const calculateBarPosition = (date: string) => {
    const itemDate = new Date(date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysPassed / totalDays) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'blocked': return 'bg-red-500';
      case 'planning': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { months, totalDays } = generateTimelineHeaders();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="border-b border-border mb-4">
              {/* Month Headers */}
              <div className="flex h-8 bg-airbus-primary/5">
                {months.map((month, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center border-r border-border text-xs font-semibold text-airbus-primary"
                    style={{ width: `${(month.days / totalDays) * 100}%` }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>
              
              {/* Week Grid */}
              <div className="flex h-6 bg-gray-50">
                {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                  <div
                    key={i}
                    className="border-r border-border text-xs text-center flex items-center justify-center text-gray-600"
                    style={{ width: `${(7 / totalDays) * 100}%` }}
                  >
                    W{i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground">Milestones</h3>
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="mb-3">
                    <div className="flex items-center mb-1">
                      <div className="w-48 pr-4">
                        <div className="font-medium text-sm truncate">{milestone.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {milestone.status}
                        </Badge>
                      </div>
                      <div className="flex-1 relative h-8 bg-gray-100 rounded">
                        <div
                          className="absolute top-1 h-6 bg-airbus-primary rounded flex items-center justify-center"
                          style={{
                            left: `${calculateBarPosition(milestone.due_date)}%`,
                            width: '2px',
                            minWidth: '2px'
                          }}
                        >
                          <div className="w-4 h-4 bg-airbus-primary rounded-full border-2 border-white shadow-md"></div>
                        </div>
                        <div
                          className="absolute top-0 text-xs text-white font-medium"
                          style={{ left: `${Math.max(0, calculateBarPosition(milestone.due_date) - 5)}%` }}
                        >
                          {new Date(milestone.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks grouped by milestone */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Tasks</h3>
              {milestones.map((milestone) => {
                const milestoneTasks = tasks.filter(task => task.milestone_id === milestone.id);
                if (milestoneTasks.length === 0) return null;

                return (
                  <div key={milestone.id} className="mb-6">
                    <h4 className="text-md font-medium mb-2 text-airbus-primary bg-airbus-primary/5 px-3 py-1 rounded">
                      {milestone.name}
                    </h4>
                    {milestoneTasks.map((task) => (
                      <div key={task.id} className="mb-2">
                        <div className="flex items-center">
                          <div className="w-48 pr-4">
                            <div className="font-medium text-sm truncate">{task.title}</div>
                            <div className="flex gap-1 mt-1">
                              <Badge className={getStatusColor(task.status)} variant="secondary">
                                {task.status}
                              </Badge>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex-1 relative h-6 bg-gray-100 rounded">
                            {task.due_date && (
                              <div
                                className={`absolute top-1 h-4 rounded ${getStatusColor(task.status)}`}
                                style={{
                                  left: `${Math.max(0, calculateBarPosition(task.due_date) - 2)}%`,
                                  width: '4%',
                                  minWidth: '20px'
                                }}
                              ></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Unassigned tasks */}
              {tasks.filter(task => !task.milestone_id).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-2 text-gray-600 bg-gray-100 px-3 py-1 rounded">
                    Unassigned Tasks
                  </h4>
                  {tasks.filter(task => !task.milestone_id).map((task) => (
                    <div key={task.id} className="mb-2">
                      <div className="flex items-center">
                        <div className="w-48 pr-4">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="flex gap-1 mt-1">
                            <Badge className={getStatusColor(task.status)} variant="secondary">
                              {task.status}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 relative h-6 bg-gray-100 rounded">
                          {task.due_date && (
                            <div
                              className={`absolute top-1 h-4 rounded ${getStatusColor(task.status)}`}
                              style={{
                                left: `${Math.max(0, calculateBarPosition(task.due_date) - 2)}%`,
                                width: '4%',
                                minWidth: '20px'
                              }}
                            ></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(milestones.length === 0 && tasks.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No milestones or tasks found for this project.</p>
                <p className="text-sm mt-2">Create some milestones and tasks to see your project timeline.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
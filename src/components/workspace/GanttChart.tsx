import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';

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

      // Calculate date range - include both start and end dates for accurate timeline
      const allStartDates = [
        ...(tasksData || []).map(t => new Date(t.created_at))
      ];
      
      const allEndDates = [
        ...(milestonesData || []).map(m => new Date(m.due_date)),
        ...(tasksData || []).filter(t => t.due_date).map(t => new Date(t.due_date!))
      ];
      
      if (allStartDates.length > 0 || allEndDates.length > 0) {
        const minDate = allStartDates.length > 0 
          ? new Date(Math.min(...allStartDates.map(d => d.getTime())))
          : new Date();
        const maxDate = allEndDates.length > 0
          ? new Date(Math.max(...allEndDates.map(d => d.getTime())))
          : new Date();
        
        // Ensure timeline extends properly - add buffer days before start and after end
        const timelineStart = startOfDay(new Date(minDate));
        timelineStart.setDate(timelineStart.getDate() - 3);
        
        const timelineEnd = endOfDay(new Date(maxDate));
        timelineEnd.setDate(timelineEnd.getDate() + 3);
        
        setStartDate(timelineStart);
        setEndDate(timelineEnd);
      } else {
        // Default to current month with proper extension
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
    const totalDays = differenceInDays(endDate, startDate) + 1;
    
    // Generate weekly headers for cleaner view like the reference images
    const weeks = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({
        start: format(current, 'MMM d'),
        end: format(weekEnd > endDate ? endDate : weekEnd, 'MMM d'),
        days: Math.min(7, differenceInDays(endDate, current) + 1)
      });
      
      current.setDate(current.getDate() + 7);
    }

    return { weeks, totalDays };
  };

  const calculateBarPosition = (date: string) => {
    const itemDate = startOfDay(new Date(date));
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const daysPassed = differenceInDays(itemDate, startDate);
    return Math.max(0, (daysPassed / totalDays) * 100);
  };

  const calculateBarWidth = (startDateStr: string, endDateStr: string) => {
    const start = startOfDay(new Date(startDateStr));
    const end = endOfDay(new Date(endDateStr));
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const taskDays = differenceInDays(end, start) + 1;
    return Math.max(2, (taskDays / totalDays) * 100);
  };

  const getTaskColor = (task: Task) => {
    // Color coding based on task content and priority
    const title = task.title.toLowerCase();
    
    if (title.includes('test') || title.includes('testing')) return 'hsl(var(--chart-3))'; // Orange
    if (title.includes('deploy') || title.includes('release')) return 'hsl(var(--chart-2))'; // Blue
    if (title.includes('plan') || title.includes('design')) return 'hsl(var(--chart-1))'; // Navy
    if (title.includes('develop') || title.includes('build')) return 'hsl(var(--chart-4))'; // Green
    
    // Fallback to priority colors
    switch (task.priority) {
      case 'high': return 'hsl(var(--destructive))';
      case 'medium': return 'hsl(var(--warning))';
      case 'low': return 'hsl(var(--success))';
      default: return 'hsl(var(--muted))';
    }
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

  const { weeks, totalDays } = generateTimelineHeaders();

  return (
    <div className="w-full bg-background">
      {/* Clean header matching reference images */}
      <div className="border-l-4 border-l-primary bg-muted/30 px-4 py-3 mb-6">
        <h2 className="text-lg font-semibold text-foreground">Timeline View</h2>
      </div>
      
      {/* Horizontal scrollable container */}
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1200px] p-4">
          {/* Timeline Header */}
          <div className="border-b border-border mb-6">
            <div className="flex bg-muted/30 border-b border-border">
              <div className="w-80 px-4 py-3 border-r border-border bg-background">
                <span className="text-sm font-medium text-muted-foreground">Task / Milestone</span>
              </div>
              
              {/* Week Headers */}
              <div className="flex flex-1">
                {weeks.map((week, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center border-r border-border text-xs font-medium text-muted-foreground py-3 px-2"
                    style={{ width: `${(week.days / totalDays) * 100}%`, minWidth: '60px' }}
                  >
                    {week.start}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content rows */}
          <div className="space-y-0">
            {/* Milestones grouped with their tasks */}
            {milestones.map((milestone) => {
              const milestoneTasks = tasks.filter(task => task.milestone_id === milestone.id);
              
              return (
                <div key={milestone.id} className="border-b border-border/50">
                  {/* Milestone row */}
                  <div className="flex items-center border-b border-border/30 bg-muted/20">
                    <div className="w-80 px-4 py-3 border-r border-border bg-background">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="font-medium text-sm">{milestone.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {milestoneTasks.length} tasks
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 relative py-3">
                      {/* Milestone marker */}
                      <div
                        className="absolute top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary"
                        style={{ left: `${calculateBarPosition(milestone.due_date)}%` }}
                      >
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Milestone tasks */}
                  {milestoneTasks.map((task) => (
                    <div key={task.id} className="flex items-center hover:bg-muted/20 transition-colors">
                      <div className="w-80 px-4 py-3 border-r border-border bg-background">
                        <div className="text-sm font-medium truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Due: {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No date'}
                          <span className="ml-2 text-xs font-medium text-muted-foreground">
                            A. Sagar
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative py-3">
                        {task.due_date && (
                          <div
                            className="absolute top-1/2 transform -translate-y-1/2 h-4 rounded"
                            style={{
                              left: `${calculateBarPosition(task.created_at)}%`,
                              width: `${calculateBarWidth(task.created_at, task.due_date)}%`,
                              backgroundColor: getTaskColor(task),
                              minWidth: '20px'
                            }}
                          ></div>
                        )}
                        
                        {/* Status indicator */}
                        <div 
                          className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full border border-background"
                          style={{ 
                            right: '10px',
                            backgroundColor: task.status === 'completed' ? 'hsl(var(--success))' : 
                                           task.status === 'in_progress' ? 'hsl(var(--warning))' : 
                                           'hsl(var(--muted))'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Unassigned tasks */}
            {tasks.filter(task => !task.milestone_id).length > 0 && (
              <div className="border-b border-border/50">
                <div className="flex items-center border-b border-border/30 bg-muted/20">
                  <div className="w-80 px-4 py-3 border-r border-border bg-background">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted"></div>
                      <span className="font-medium text-sm text-muted-foreground">Unassigned Tasks</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {tasks.filter(task => !task.milestone_id).length} tasks
                      </span>
                    </div>
                  </div>
                  <div className="flex-1"></div>
                </div>
                
                {tasks.filter(task => !task.milestone_id).map((task) => (
                  <div key={task.id} className="flex items-center hover:bg-muted/20 transition-colors">
                    <div className="w-80 px-4 py-3 border-r border-border bg-background">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Due: {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No date'}
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          A. Sagar
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 relative py-3">
                      {task.due_date && (
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 h-4 rounded"
                            style={{
                              left: `${calculateBarPosition(task.created_at)}%`,
                              width: `${calculateBarWidth(task.created_at, task.due_date)}%`,
                              backgroundColor: getTaskColor(task),
                              minWidth: '20px'
                            }}
                        ></div>
                      )}
                      
                      <div 
                        className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full border border-background"
                        style={{ 
                          right: '10px',
                          backgroundColor: task.status === 'completed' ? 'hsl(var(--success))' : 
                                         task.status === 'in_progress' ? 'hsl(var(--warning))' : 
                                         'hsl(var(--muted))'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {(milestones.length === 0 && tasks.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No milestones or tasks found for this project.</p>
                <p className="text-sm mt-2">Create some milestones and tasks to see your project timeline.</p>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Legend</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium mb-2">Task Types</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }}></div>
                    <span>Planning & Design</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }}></div>
                    <span>Testing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }}></div>
                    <span>Deployment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-4))' }}></div>
                    <span>Development</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Status</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--warning))' }}></div>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
                    <span>Not Started</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
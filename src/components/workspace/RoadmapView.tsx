import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Calendar, Clock, User, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Settings, Plus } from 'lucide-react';
import { MilestoneManagementDialog } from './MilestoneManagementDialog';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, addWeeks, addMonths, addYears, subWeeks, subMonths, subYears, isWithinInterval, parseISO, differenceInDays, addDays } from 'date-fns';

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

interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  department?: string;
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function RoadmapView() {
  const { id } = useParams();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Enhanced Color System for Timeline Bars
  const taskColors = {
    planning: 'bg-brand-primary',
    development: 'bg-brand-accent', 
    testing: 'bg-status-warning',
    deployment: 'bg-status-success',
    maintenance: 'bg-accent'
  };

  const priorityColors = {
    low: 'bg-status-success',
    medium: 'bg-status-warning', 
    high: 'bg-destructive',
    critical: 'bg-destructive'
  };

  const statusColors = {
    'not_started': 'bg-muted',
    'in_progress': 'bg-brand-accent',
    'completed': 'bg-status-success',
    'on_hold': 'bg-status-warning',
    'blocked': 'bg-destructive'
  };

  // Color mapping for different task types based on title keywords
  const getTaskColor = (task: Task, index: number) => {
    const title = task.title.toLowerCase();
    if (title.includes('test') || title.includes('qa')) return taskColors.testing;
    if (title.includes('deploy') || title.includes('release')) return taskColors.deployment;
    if (title.includes('plan') || title.includes('design') || title.includes('define')) return taskColors.planning;
    if (title.includes('develop') || title.includes('code') || title.includes('build')) return taskColors.development;
    if (title.includes('maintain') || title.includes('support')) return taskColors.maintenance;
    
    // Fallback to cycling through colors
    const colorKeys = Object.keys(taskColors);
    return taskColors[colorKeys[index % colorKeys.length] as keyof typeof taskColors];
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch milestones from workspace service to ensure consistency with tasks
      const milestonesResponse = await apiClient.getMilestones(id!);
      if (!milestonesResponse.success) {
        console.error('Failed to fetch milestones:', milestonesResponse.error);
        setMilestones([]);
      } else {
        setMilestones(milestonesResponse.data || []);
      }
      
      // Fetch tasks separately from workspace service
      const tasksResponse = await apiClient.getTasks(id!);
      if (!tasksResponse.success) {
        console.error('Failed to fetch tasks:', tasksResponse.error);
        setTasks([]);
      } else {
        setTasks(tasksResponse.data || []);
      }

      // Fetch stakeholders
      const stakeholdersResponse = await apiClient.getStakeholders(id!);
      if (!stakeholdersResponse.success) {
        console.error('Failed to fetch stakeholders:', stakeholdersResponse.error);
        setStakeholders([]);
      } else {
        setStakeholders(stakeholdersResponse.data.stakeholders || []);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load roadmap data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timelineData = useMemo(() => {
    console.log('Calculating timeline data for tasks:', tasks);
    console.log('Available milestones:', milestones);
    
    // If no tasks, use current date range
    if (tasks.length === 0) {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      console.log('No tasks, using current date range:', { start, end });
      return { start, end, intervals: eachDayOfInterval({ start, end }) };
    }

    // Find all task dates (start and end)
    const allDates: Date[] = [];
    
    tasks.forEach(task => {
      console.log('Processing task:', task.title, 'created:', task.created_at, 'due:', task.due_date);
      
      // Add task start date (created_at) - only if not null
      if (task.created_at) {
        const startDate = parseISO(task.created_at);
        allDates.push(startDate);
        console.log('Parsed start date:', startDate);
      }
      
      // Add task end date (due_date) - only if not null
      if (task.due_date) {
        const endDate = parseISO(task.due_date);
        allDates.push(endDate);
        console.log('Parsed end date:', endDate);
      }
    });

    console.log('All dates collected:', allDates);

    // Find the absolute earliest and latest dates
    const earliestDate = allDates.reduce((earliest, date) => 
      date < earliest ? date : earliest, allDates[0]);
    const latestDate = allDates.reduce((latest, date) => 
      date > latest ? date : latest, allDates[0]);

    console.log('Date range calculated:', { earliestDate, latestDate });

    // Extend timeline with padding based on view mode
    let start: Date, end: Date, intervals: Date[];
    
    switch (viewMode) {
      case 'daily':
        start = addDays(earliestDate, -2);
        end = addDays(latestDate, 2);
        intervals = eachDayOfInterval({ start, end });
        break;
      case 'weekly':
        start = startOfWeek(addDays(earliestDate, -7));
        end = endOfWeek(addDays(latestDate, 7));
        intervals = eachDayOfInterval({ start, end });
        break;
      case 'monthly':
        start = startOfMonth(addMonths(earliestDate, -1));
        end = endOfMonth(addMonths(latestDate, 1));
        intervals = eachWeekOfInterval({ start, end });
        break;
      case 'yearly':
        // For yearly view, just extend by a few months, not a full year
        start = startOfMonth(addMonths(earliestDate, -2));
        end = endOfMonth(addMonths(latestDate, 2));
        intervals = eachMonthOfInterval({ start, end });
        break;
      default:
        start = startOfMonth(earliestDate);
        end = endOfMonth(latestDate);
        intervals = eachDayOfInterval({ start, end });
    }

    console.log('Final timeline range:', { start, end, viewMode });
    return { start, end, intervals };
  }, [tasks, viewMode]);

  const getTaskPosition = (startDate: string, endDate?: string) => {
    if (!startDate) return null;
    
    const taskStart = parseISO(startDate);
    const taskEnd = endDate ? parseISO(endDate) : addDays(taskStart, 1); // Default 1 day if no end date
    
    const { start: timelineStart, end: timelineEnd } = timelineData;
    const totalDuration = differenceInDays(timelineEnd, timelineStart);
    
    // Calculate position relative to timeline
    const startOffset = differenceInDays(taskStart, timelineStart);
    const taskDuration = differenceInDays(taskEnd, taskStart);
    
    // Ensure task is within timeline bounds
    if (startOffset < 0 || startOffset > totalDuration) return null;
    
    const leftPosition = (startOffset / totalDuration) * 100;
    const width = Math.max(1, (taskDuration / totalDuration) * 100);
    
    return { left: `${leftPosition}%`, width: `${width}%` };
  };

  const getStakeholderName = (ownerId: string) => {
    const stakeholder = stakeholders.find(s => s.id === ownerId);
    return stakeholder?.name || 'Unassigned';
  };


  const navigateTime = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'daily':
        setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1));
        break;
      case 'weekly':
        setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        break;
      case 'monthly':
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        break;
      case 'yearly':
        setCurrentDate(direction === 'next' ? addYears(currentDate, 1) : subYears(currentDate, 1));
        break;
    }
  };

  const formatTimelineLabel = (date: Date) => {
    switch (viewMode) {
      case 'daily':
        return format(date, 'EEE d');
      case 'weekly':
        return format(date, 'EEE d');
      case 'monthly':
        return format(date, 'MMM d');
      case 'yearly':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'MMM d');
    }
  };

  // All hooks must be called BEFORE any conditional returns
  const filteredTasks = useMemo(() => {
    return tasks; // Show all tasks without filtering
  }, [tasks]);

  const groupedTasksData = useMemo(() => {
    console.log('Grouping tasks. Milestones:', milestones);
    console.log('Filtered tasks:', filteredTasks);
    
    const grouped = milestones.map(milestone => {
      const milestoneTasks = filteredTasks.filter(task => task.milestone_id === milestone.id);
      console.log(`Milestone ${milestone.name} (${milestone.id}) has ${milestoneTasks.length} tasks:`, milestoneTasks);
      return {
        milestone,
        tasks: milestoneTasks
      };
    });
    
    // Add tasks without milestones
    const tasksWithoutMilestone = filteredTasks.filter(task => !task.milestone_id);
    console.log('Tasks without milestone:', tasksWithoutMilestone);
    
    if (tasksWithoutMilestone.length > 0) {
      grouped.push({
        milestone: { id: 'unassigned', name: 'Unassigned Tasks', due_date: '', status: '', description: '', project_id: '', created_by: '' },
        tasks: tasksWithoutMilestone
      });
    }
    
    const finalGrouped = grouped.filter(group => group.tasks.length > 0);
    console.log('Final grouped data:', finalGrouped);
    return finalGrouped;
  }, [milestones, filteredTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading roadmap...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Roadmap</h1>
          <p className="text-text-muted mt-1">Strategic timeline view of milestones and deliverables</p>
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Add New Milestone Button */}
          <MilestoneManagementDialog 
            projectId={id!} 
            onMilestoneChange={fetchData}
            triggerButton={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            }
          />
          
          {/* Milestone Management */}
          <MilestoneManagementDialog 
            projectId={id!} 
            onMilestoneChange={fetchData}
            triggerButton={
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage All
              </Button>
            }
          />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-surface-alt rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2 text-text-muted">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-surface-alt rounded-lg p-1">
            {(['daily', 'weekly', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateTime('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateTime('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Roadmap Chart */}
      <Card className="shadow-card">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-primary rounded-full"></div>
              <span>Timeline View</span>
              <Badge variant="secondary" className="bg-accent-light text-accent-foreground">
                {format(currentDate, 'MMMM yyyy')}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Timeline Header */}
          <div className="sticky top-0 bg-surface-default border-b border-border z-10">
            <div className="grid grid-cols-12 gap-1 p-4">
              <div className="col-span-3 text-sm font-medium text-text-muted">Task / Milestone</div>
              {timelineData.intervals.slice(0, 9).map((date, index) => (
                <div key={index} className="text-center text-text-muted text-sm font-medium border-l border-border-subtle pl-2">
                  {formatTimelineLabel(date)}
                </div>
              ))}
            </div>
            
            {/* Timeline ruler */}
            <div className="relative h-2 bg-surface-alt mx-4 rounded-sm mb-4">
              {/* Vertical grid lines */}
              <div className="absolute inset-0 grid grid-cols-12">
                <div className="col-span-3"></div>
                {timelineData.intervals.slice(0, 9).map((_, index) => (
                  <div key={index} className="border-l border-border-subtle h-full"></div>
                ))}
              </div>
              
              {/* Current time indicator */}
              <div 
                className="absolute top-0 w-0.5 h-full bg-brand-accent z-10 rounded-full"
                style={{ 
                  left: `${Math.min(100, Math.max(0, (differenceInDays(new Date(), timelineData.start) / differenceInDays(timelineData.end, timelineData.start)) * 100))}%` 
                }}
              />
            </div>
          </div>

          {/* Tasks Container */}
          <div className="max-h-96 overflow-y-auto" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
            <div className="space-y-2 p-4">
              {groupedTasksData.map((group, groupIndex) => (
                <div key={group.milestone.id} className="space-y-2">
                  {/* Milestone Header */}
                  <div className="flex items-center gap-2 py-2 border-b border-border-subtle">
                    <div className="h-3 w-3 rounded-full bg-brand-primary"></div>
                    <h4 className="font-medium text-foreground">{group.milestone.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {group.tasks.length} tasks
                    </Badge>
                  </div>
                  
                   {/* Tasks */}
                   {group.tasks.map((task, taskIndex) => {
                     // Use due_date if available, otherwise use created_at as fallback
                     const taskStartDate = task.due_date || task.created_at;
                     const position = getTaskPosition(taskStartDate, task.due_date);
                     if (!position) return null;
                     
                     const taskColorClass = getTaskColor(task, taskIndex);
                     const statusColor = statusColors[task.status as keyof typeof statusColors] || 'bg-muted';
                    
                    return (
                      <div key={task.id} className="grid grid-cols-12 gap-1 items-center group py-2 hover:bg-surface-alt rounded-lg px-2">
                        <div className="col-span-3 text-sm truncate">
                          <div className="font-medium text-foreground">{task.title}</div>
                          <div className="text-text-muted text-xs flex items-center gap-2">
                            {task.due_date && <span>Due: {format(parseISO(task.due_date), 'MMM dd')}</span>}
                            {task.owner_id && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {getStakeholderName(task.owner_id)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="col-span-9 relative h-6 bg-surface-alt rounded-sm">
                          {/* Vertical grid lines */}
                          <div className="absolute inset-0 grid grid-cols-9 pointer-events-none">
                            {timelineData.intervals.slice(0, 9).map((_, index) => (
                              <div key={index} className="border-l border-border-subtle h-full opacity-50"></div>
                            ))}
                          </div>
                          
                           {/* Task bar with intelligent color coding */}
                           <div
                             className={`absolute top-0.5 h-5 ${taskColorClass} rounded-sm cursor-pointer group-hover:shadow-md transition-all flex items-center justify-center border border-white/20`}
                             style={position}
                             title={`${task.title} - ${task.status}${task.due_date ? ` - Due: ${format(parseISO(task.due_date), 'MMM dd, yyyy')}` : ''}`}
                           >
                            {/* Task progress indicator */}
                            <div className="w-full h-full rounded-sm relative overflow-hidden">
                              {task.status === 'completed' && (
                                <div className="absolute inset-0 bg-status-success"></div>
                              )}
                              {task.status === 'in_progress' && (
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-accent to-brand-accent/50"></div>
                              )}
                            </div>
                          </div>
                          
                          {/* Priority indicator */}
                          {task.priority && task.priority !== 'low' && (
                            <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${priorityColors[task.priority as keyof typeof priorityColors]} border border-background`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Legend with Task Types */}
          <div className="mt-4 p-4 border-t border-border bg-surface-alt">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Task Type Legend */}
              <div>
                <h4 className="text-foreground font-medium mb-3">Task Types</h4>
                <div className="space-y-2">
                  {Object.entries(taskColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`w-4 h-3 rounded-sm ${color} border border-white/20`} />
                      <span className="text-text-muted text-xs capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Legend */}
              <div>
                <h4 className="text-foreground font-medium mb-3">Status</h4>
                <div className="space-y-2">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className={`w-4 h-3 rounded-sm ${color}`} />
                      <span className="text-text-muted text-xs capitalize">{status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Priority Legend */}
              <div>
                <h4 className="text-foreground font-medium mb-3">Priority</h4>
                <div className="space-y-2">
                  {Object.entries(priorityColors).map(([priority, color]) => (
                    <div key={priority} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-text-muted text-xs capitalize">{priority}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Progress Indicators */}
              <div>
                <h4 className="text-foreground font-medium mb-3">Indicators</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-brand-accent rounded-full"></div>
                    <span className="text-text-muted text-xs">Current time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive border border-background"></div>
                    <span className="text-text-muted text-xs">High priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rounded-sm bg-gradient-to-r from-brand-accent to-brand-accent/50"></div>
                    <span className="text-text-muted text-xs">In progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-brand-primary shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-brand-primary" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{milestones.length}</div>
            <p className="text-sm text-text-muted mt-1">
              {milestones.filter(m => m.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-success shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-status-success" />
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {filteredTasks.filter(t => t.status === 'in_progress').length}
            </div>
            <p className="text-sm text-text-muted mt-1">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-warning shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-status-warning" />
              Due This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {filteredTasks.filter(t => {
                if (!t.due_date) return false;
                const dueDate = parseISO(t.due_date);
                const weekStart = startOfWeek(new Date());
                const weekEnd = endOfWeek(new Date());
                return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
              }).length}
            </div>
            <p className="text-sm text-text-muted mt-1">
              Tasks due
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-destructive" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {filteredTasks.filter(t => {
                if (!t.due_date || t.status === 'completed') return false;
                const dueDate = parseISO(t.due_date);
                return dueDate < new Date();
              }).length}
            </div>
            <p className="text-sm text-text-muted mt-1">
              Past due date
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Calendar, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
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

type ViewMode = 'weekly' | 'monthly' | 'yearly';

export function RoadmapView() {
  const { id } = useParams();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());

  const taskColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'
  ];

  const priorityColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500', 
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('created_at');

      if (tasksError) throw tasksError;

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('due_date');

      if (milestonesError) throw milestonesError;

      // Fetch stakeholders
      const { data: stakeholdersData, error: stakeholdersError } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', id)
        .order('name');

      if (stakeholdersError) throw stakeholdersError;

      setTasks(tasksData || []);
      setMilestones(milestonesData || []);
      setStakeholders(stakeholdersData || []);
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
    let start: Date, end: Date, intervals: Date[];

    switch (viewMode) {
      case 'weekly':
        start = startOfWeek(subWeeks(currentDate, 2));
        end = endOfWeek(addWeeks(currentDate, 2));
        intervals = eachDayOfInterval({ start, end });
        break;
      case 'monthly':
        start = startOfMonth(subMonths(currentDate, 2));
        end = endOfMonth(addMonths(currentDate, 2));
        intervals = eachWeekOfInterval({ start, end });
        break;
      case 'yearly':
        start = startOfYear(subYears(currentDate, 1));
        end = endOfYear(addYears(currentDate, 1));
        intervals = eachMonthOfInterval({ start, end });
        break;
      default:
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        intervals = eachDayOfInterval({ start, end });
    }

    return { start, end, intervals };
  }, [viewMode, currentDate]);

  const getTaskPosition = (startDate: string, endDate?: string) => {
    if (!startDate) return null;
    
    const taskStart = parseISO(startDate);
    const taskEnd = endDate ? parseISO(endDate) : addDays(taskStart, 7); // Default 7 days if no end date
    
    const { start: timelineStart, end: timelineEnd } = timelineData;
    const totalDuration = differenceInDays(timelineEnd, timelineStart);
    
    const startOffset = Math.max(0, differenceInDays(taskStart, timelineStart));
    const duration = Math.min(
      differenceInDays(taskEnd, taskStart),
      differenceInDays(timelineEnd, taskStart) - startOffset
    );
    
    const leftPosition = (startOffset / totalDuration) * 100;
    const width = Math.max(2, (duration / totalDuration) * 100);
    
    return { left: `${leftPosition}%`, width: `${width}%` };
  };

  const getStakeholderName = (ownerId: string) => {
    const stakeholder = stakeholders.find(s => s.id === ownerId);
    return stakeholder?.name || 'Unassigned';
  };

  const groupedTasks = useMemo(() => {
    const grouped = milestones.map(milestone => ({
      milestone,
      tasks: tasks.filter(task => task.milestone_id === milestone.id)
    }));
    
    // Add tasks without milestones
    const tasksWithoutMilestone = tasks.filter(task => !task.milestone_id);
    if (tasksWithoutMilestone.length > 0) {
      grouped.push({
        milestone: { id: 'unassigned', name: 'Unassigned Tasks', due_date: '', status: '', description: '', project_id: '', created_by: '' },
        tasks: tasksWithoutMilestone
      });
    }
    
    return grouped.filter(group => group.tasks.length > 0);
  }, [milestones, tasks]);

  const navigateTime = (direction: 'prev' | 'next') => {
    switch (viewMode) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading roadmap...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Roadmap</h2>
          <p className="text-muted-foreground">Interactive timeline view of milestones and tasks</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['weekly', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
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

      {/* Roadmap Chart */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-white text-xl">
              <span className="text-white">GANTT CHART</span> <span className="text-red-500">View</span>
            </CardTitle>
            <Badge variant="secondary" className="bg-gray-600 text-gray-200">
              {format(currentDate, 'MMMM yyyy')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Timeline Header */}
          <div className="mb-6">
            <div className="grid grid-cols-12 gap-1 mb-4">
              <div className="col-span-3"></div>
              {timelineData.intervals.slice(0, 9).map((date, index) => (
                <div key={index} className="text-center text-gray-300 text-sm font-medium">
                  {formatTimelineLabel(date)}
                </div>
              ))}
            </div>
            
            {/* Current time indicator */}
            <div className="relative h-1 bg-gray-700 rounded mb-6">
              <div 
                className="absolute top-0 w-0.5 h-full bg-yellow-400"
                style={{ 
                  left: `${Math.min(100, Math.max(0, (differenceInDays(new Date(), timelineData.start) / differenceInDays(timelineData.end, timelineData.start)) * 100))}%` 
                }}
              />
            </div>
          </div>

          {/* Tasks Grouped by Milestone */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tasks by Milestone</h3>
            {groupedTasks.map((group, groupIndex) => (
              <div key={group.milestone.id} className="space-y-3">
                <h4 className="text-md font-medium text-cyan-400 mb-2 border-b border-gray-700 pb-1">
                  {group.milestone.name}
                </h4>
                {group.tasks.map((task, taskIndex) => {
                  const position = getTaskPosition(task.due_date);
                  if (!position) return null;
                  
                  const colorClass = taskColors[taskIndex % taskColors.length];
                  
                  return (
                    <div key={task.id} className="grid grid-cols-12 gap-1 items-center group">
                      <div className="col-span-3 text-sm font-medium truncate">
                        <div className="text-white">{task.title}</div>
                        <div className="text-gray-400 text-xs">
                          Due: {format(parseISO(task.due_date), 'MMM dd')}
                        </div>
                        {task.owner_id && (
                          <div className="text-gray-400 text-xs flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getStakeholderName(task.owner_id)}
                          </div>
                        )}
                      </div>
                      <div className="col-span-9 relative h-8 bg-gray-800 rounded">
                        <div
                          className={`absolute top-0 h-full ${colorClass} rounded flex items-center justify-start text-xs text-white font-medium transition-all hover:opacity-80 cursor-pointer shadow-sm`}
                          style={position}
                          title={`${task.title} - ${task.status} - Due: ${format(parseISO(task.due_date), 'MMM dd, yyyy')}`}
                        >
                          <span className="px-2 text-white font-medium text-xs leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                            {task.title}
                          </span>
                        </div>
                        
                        {/* Priority indicator */}
                        {task.priority && (
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${priorityColors[task.priority as keyof typeof priorityColors]} border-2 border-gray-900`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h4 className="text-white text-sm font-medium mb-3">Priority Legend</h4>
            <div className="flex flex-wrap gap-4">
              {Object.entries(priorityColors).map(([priority, color]) => (
                <div key={priority} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${color}`} />
                  <span className="text-gray-300 text-xs capitalize">{priority}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-cyan-500" />
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

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-green-500" />
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-orange-500" />
              Due This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {tasks.filter(t => {
                if (!t.due_date) return false;
                const dueDate = parseISO(t.due_date);
                const weekStart = startOfWeek(new Date());
                const weekEnd = endOfWeek(new Date());
                return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
              }).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tasks due
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
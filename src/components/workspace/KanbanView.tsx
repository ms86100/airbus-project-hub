import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanViewProps {
  projectId: string;
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

interface Milestone {
  id: string;
  name: string;
  due_date: string;
}

const statusColumns = [
  { key: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { key: 'blocked', label: 'Blocked', color: 'bg-red-100' },
  { key: 'completed', label: 'Completed', color: 'bg-green-100' },
];

export function KanbanView({ projectId }: KanbanViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start dragging
      },
    })
  );

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (tasksError) throw tasksError;

      // Fetch milestones for grouping
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date');

      if (milestonesError) throw milestonesError;

      setTasks(tasksData || []);
      setMilestones(milestonesData || []);
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

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      // Find the task to get its current details
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      const oldStatus = task.status;

      // Update the task in the database
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      // Update local state immediately for optimistic UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus }
            : t
        )
      );

      // Format status names for display
      const formatStatus = (status: string) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      // Show success toast with proper task name and status
      toast({
        title: "Task Updated",
        description: `"${task.title}" moved to ${formatStatus(newStatus)}`,
      });

      console.log(`Task "${task.title}" status changed from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}`);

    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error updating task",
        description: error.message || "Failed to update task status",
        variant: "destructive",
      });
      
      // Refresh data to ensure consistency
      fetchData();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      console.log('No valid drop target');
      return;
    }

    const taskId = active.id as string;
    const dropTargetId = over.id as string;

    // Ensure we only accept valid status column IDs as drop targets
    const validStatuses = statusColumns.map(col => col.key);
    const newStatus = validStatuses.includes(dropTargetId) ? dropTargetId : null;

    if (!newStatus) {
      console.error('Invalid drop target:', dropTargetId, 'Valid targets:', validStatuses);
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('Task not found for drag operation:', taskId);
      return;
    }

    if (task.status === newStatus) {
      console.log('Task already in target status:', newStatus);
      return;
    }

    console.log(`Dragging task "${task.title}" from ${task.status} to ${newStatus}`);
    updateTaskStatus(taskId, newStatus);
  };

  const getTasksForStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getMilestoneName = (milestoneId?: string) => {
    if (!milestoneId) return 'No Milestone';
    const milestone = milestones.find(m => m.id === milestoneId);
    return milestone?.name || 'Unknown Milestone';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  // Draggable Task Card Component  
  function DraggableTaskCard({ task }: { task: Task }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id: task.id,
      data: {
        type: 'task',
        task,
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 ${getPriorityColor(task.priority)} ${isDragging ? 'shadow-lg scale-105' : ''}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-medium leading-tight">
              {task.title}
            </CardTitle>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {getMilestoneName(task.milestone_id)}
              </span>
              {task.priority && (
                <Badge variant="outline" className="text-xs">
                  {task.priority}
                </Badge>
              )}
            </div>
            
            {task.due_date && (
              <div className="text-xs text-muted-foreground">
                Due: {format(new Date(task.due_date), 'MMM dd')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Droppable Column Component
  function DroppableColumn({ column, tasks: columnTasks }: { column: typeof statusColumns[0], tasks: Task[] }) {
    const { isOver, setNodeRef } = useDroppable({
      id: column.key,
      data: {
        type: 'column',
        status: column.key,
      },
    });

    return (
      <div className="flex flex-col h-full">
        <div className={`${column.color} rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{column.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {columnTasks.length}
            </Badge>
          </div>
        </div>
        
        <div 
          ref={setNodeRef}
          className={`flex-1 space-y-3 overflow-y-auto min-h-24 p-2 rounded-lg transition-all duration-200 ${
            isOver
              ? 'bg-primary/10 border-2 border-dashed border-primary/50' 
              : activeTask && activeTask.status !== column.key 
              ? 'bg-primary/5 border-2 border-dashed border-primary/30' 
              : 'border-2 border-transparent'
          }`}
          style={{
            minHeight: '200px',
          }}
        >
          <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {columnTasks.map((task) => (
              <DraggableTaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
          
          {columnTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tasks</p>
              {(isOver || (activeTask && activeTask.status !== column.key)) && (
                <p className="text-xs mt-1 text-primary font-medium">Drop here to move to {column.label}</p>
              )}
              {(!activeTask || activeTask.status === column.key) && !isOver && (
                <p className="text-xs mt-1">Drop tasks here</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Kanban</h1>
              <p className="text-sm text-muted-foreground">Drag and drop tasks between status columns</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-4 gap-6 h-full">
            {statusColumns.map((column) => {
              const columnTasks = getTasksForStatus(column.key);
              return (
                <DroppableColumn 
                  key={column.key} 
                  column={column} 
                  tasks={columnTasks} 
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <Card className={`cursor-grabbing shadow-2xl rotate-3 border-l-4 ${getPriorityColor(activeTask.priority)}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-tight">
                  {activeTask.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {activeTask.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {activeTask.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {getMilestoneName(activeTask.milestone_id)}
                    </span>
                    {activeTask.priority && (
                      <Badge variant="outline" className="text-xs">
                        {activeTask.priority}
                      </Badge>
                    )}
                  </div>
                  {activeTask.due_date && (
                    <div className="text-xs text-muted-foreground">
                      Due: {format(new Date(activeTask.due_date), 'MMM dd')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
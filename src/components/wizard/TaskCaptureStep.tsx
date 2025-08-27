import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, AlertCircle, Lightbulb, Copy, Edit2 } from 'lucide-react';
import { ProjectData, Task } from '../ProjectWizard';

interface TaskCaptureStepProps {
  projectData: ProjectData;
  setProjectData: (data: ProjectData) => void;
}

const TaskCaptureStep: React.FC<TaskCaptureStepProps> = ({ projectData, setProjectData }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      status: 'todo',
      dueDate: projectData.endDate
    };

    setProjectData({
      ...projectData,
      tasks: [...projectData.tasks, newTask]
    });

    setNewTaskTitle('');
  };

  const removeTask = (taskId: string) => {
    setProjectData({
      ...projectData,
      tasks: projectData.tasks.filter(task => task.id !== taskId)
    });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setProjectData({
      ...projectData,
      tasks: projectData.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    });
  };

  const duplicateTask = (task: Task) => {
    const duplicatedTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} (Copy)`
    };
    
    setProjectData({
      ...projectData,
      tasks: [...projectData.tasks, duplicatedTask]
    });
  };

  const useTemplate = (templateTasks: string[]) => {
    const newTasks: Task[] = templateTasks.map(title => ({
      id: crypto.randomUUID(),
      title,
      status: 'todo',
      dueDate: projectData.endDate,
      sourceTag: 'template'
    }));

    setProjectData({
      ...projectData,
      tasks: [...projectData.tasks, ...newTasks]
    });
  };

  const templates = {
    kickoff_checklist: {
      name: "Project Kickoff (PM Best-Practice)",
      description: "Meaningful tasks to start any project strong",
      tasks: [
        "Draft Project Charter (scope, objectives, success criteria)",
        "Identify Stakeholders & Create RACI",
        "Set up Communication Plan (cadence, channels, owners)", 
        "Create Risk Register & Initial Risk Assessment",
        "Define WBS & High-Level Timeline",
        "Estimate Effort & Set Initial Backlog",
        "Schedule Kickoff Meeting & Share Agenda",
        "Capture Minutes & Decisions from Kickoff"
      ]
    },
    uat_checklist: {
      name: "UAT Preparation", 
      tasks: [
        "Define Acceptance Criteria",
        "Prepare Test Data & Environments",
        "Draft Test Cases & Assign Owners",
        "Schedule UAT Window",
        "Plan Defect Triage & Sign-off Process"
      ]
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          Add the main tasks for this project. Just type them in quickly — we'll organize later.
        </p>
      </div>

      {/* Quick Add Task */}
      <div className="flex gap-2">
        <Input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Type a task (e.g., 'Draft spec', 'Get approvals')"
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="flex-1"
        />
        <Button onClick={addTask} disabled={!newTaskTitle.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Nudges and Templates */}
      {projectData.tasks.length < 3 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-3">
                <p className="text-sm text-amber-800">
                  Add at least 3 tasks to build momentum.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => useTemplate(templates.kickoff_checklist.tasks)}
                  >
                    Use {templates.kickoff_checklist.name}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => useTemplate(templates.uat_checklist.tasks)}
                  >
                    Use {templates.uat_checklist.name}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {projectData.tasks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Start by writing one or two tasks (e.g., 'Draft spec', 'Get approvals').
            </p>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {projectData.tasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tasks ({projectData.tasks.length})</h3>
            <Badge variant={projectData.tasks.length >= 3 ? "default" : "secondary"}>
              {projectData.tasks.length >= 3 ? "Good momentum!" : "Add more tasks"}
            </Badge>
          </div>

          <div className="space-y-2">
            {projectData.tasks.map((task) => (
              <Card key={task.id} className="p-3 group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value })}
                        className="border-none p-0 h-auto focus-visible:ring-0 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setNewTaskTitle('');
                            const newTask: Task = {
                              id: crypto.randomUUID(),
                              title: '',
                              status: 'todo',
                              dueDate: projectData.endDate
                            };
                            setProjectData({
                              ...projectData,
                              tasks: [...projectData.tasks, newTask]
                            });
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => duplicateTask(task)}
                        title="Duplicate task"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTask(task.id)}
                        title="Delete task"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Select
                      value={task.status}
                      onValueChange={(value) => updateTask(task.id, { status: value as any })}
                    >
                      <SelectTrigger className="w-24 h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todo</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="date"
                      value={task.dueDate}
                      onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                      className="w-32 h-7 text-sm"
                    />
                    
                    {task.sourceTag === 'template' && (
                      <Badge variant="secondary" className="text-xs">Template</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Rule Message */}
      {projectData.tasks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Add at least 1 task to continue to the next step.
        </p>
      )}
    </div>
  );
};

export default TaskCaptureStep;
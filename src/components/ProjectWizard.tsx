import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import ProjectBasicsStep from './wizard/ProjectBasicsStep';
import TaskCaptureStep from './wizard/TaskCaptureStep';
import MilestoneGroupingStep from './wizard/MilestoneGroupingStep';
import TeamSetupStep from './wizard/TeamSetupStep';
import ConfirmationStep from './wizard/ConfirmationStep';

export interface Task {
  id: string;
  title: string;
  ownerId?: string;
  dueDate?: string;
  status: string;
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  tasks: Task[];
}

export interface ProjectData {
  projectName: string;
  objective: string;
  startDate: string;
  endDate: string;
  businessValue?: string;
  tasks: Task[];
  milestones: Milestone[];
  inviteEmails: string[];
}

const ProjectWizard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: '',
    objective: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    businessValue: '',
    tasks: [],
    milestones: [],
    inviteEmails: []
  });

  const steps = [
    { id: 'project_wizard', title: 'Project Basics', component: ProjectBasicsStep },
    { id: 'task_capture', title: 'Add Tasks', component: TaskCaptureStep },
    { id: 'milestone_grouping', title: 'Organize Milestones', component: MilestoneGroupingStep },
    { id: 'team_setup', title: 'Invite Team', component: TeamSetupStep },
    { id: 'confirm', title: 'Review & Create', component: ConfirmationStep }
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Project basics
        return projectData.projectName.length > 0 && 
               projectData.projectName.length <= 120 && 
               projectData.objective.length > 0 && 
               projectData.objective.length <= 500;
      case 1: // Task capture
        return projectData.tasks.length >= 1;
      case 2: // Milestone grouping
        return projectData.milestones.length > 0 && 
               projectData.milestones.every(m => m.tasks.length > 0);
      case 3: // Team setup (optional)
        return true;
      case 4: // Confirmation
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createProject = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.projectName,
          description: projectData.objective,
          start_date: projectData.startDate,
          end_date: projectData.endDate,
          created_by: user.id,
          status: 'planning'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create milestones
      const milestonesWithProjectId = projectData.milestones.map(milestone => ({
        name: milestone.name,
        due_date: milestone.dueDate,
        project_id: project.id,
        created_by: user.id
      }));

      const { data: createdMilestones, error: milestoneError } = await supabase
        .from('milestones')
        .insert(milestonesWithProjectId)
        .select();

      if (milestoneError) throw milestoneError;

      // Create tasks with milestone assignments
      const tasksToCreate = [];
      for (const milestone of projectData.milestones) {
        const createdMilestone = createdMilestones.find(m => m.name === milestone.name);
        if (createdMilestone) {
          for (const task of milestone.tasks) {
            tasksToCreate.push({
              title: task.title,
              project_id: project.id,
              milestone_id: createdMilestone.id,
              status: task.status,
              due_date: task.dueDate || projectData.endDate,
              owner_id: task.ownerId || user.id,
              created_by: user.id
            });
          }
        }
      }

      if (tasksToCreate.length > 0) {
        const { error: taskError } = await supabase
          .from('tasks')
          .insert(tasksToCreate);

        if (taskError) throw taskError;
      }

      // Handle team invitations (you can implement email invitations later)
      if (projectData.inviteEmails.length > 0) {
        // For now, just log the invitations
        console.log('Team invitations to send:', projectData.inviteEmails);
      }

      toast({
        title: "Project Created Successfully!",
        description: `${projectData.projectName} has been created with ${projectData.tasks.length} tasks across ${projectData.milestones.length} milestones.`,
      });

      // Navigate to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error Creating Project",
        description: "Failed to create the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{steps[currentStep].title}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent 
            projectData={projectData}
            setProjectData={setProjectData}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button 
            onClick={createProject}
            disabled={!canProceed() || isCreating}
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectWizard;
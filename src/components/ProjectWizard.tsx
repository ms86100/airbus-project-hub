import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';
import { WizardHeader } from '@/components/ui/wizard-header';
import { ProgressStepper } from '@/components/ui/progress-stepper';
import { CelebrationOverlay } from '@/components/ui/celebration-overlay';
import { SuccessModal } from '@/components/ui/success-modal';
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  
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
    { id: 'project_wizard', title: 'Project Basics', subtitle: 'Just the essentials to get started', component: ProjectBasicsStep },
    { id: 'task_capture', title: 'List Your Tasks', subtitle: 'Type quickly; we\'ll organize later', component: TaskCaptureStep },
    { id: 'milestone_grouping', title: 'Create Milestones & Group Tasks', subtitle: 'Drag tasks into milestones', component: MilestoneGroupingStep },
    { id: 'team_setup', title: 'Invite Teammates', subtitle: 'Optional but recommended', component: TeamSetupStep },
    { id: 'confirm', title: 'Review & Create', subtitle: 'One last glance', component: ConfirmationStep }
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

      // Show celebration animation then success modal
      setCreatedProjectId(project.id);
      setShowCelebration(true);
      
      // Show success modal after celebration
      setTimeout(() => {
        setShowCelebration(false);
        setShowSuccessModal(true);
      }, 2500);
      
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
    <>
      <div className="max-w-4xl mx-auto p-lg space-y-xl bg-gradient-to-br from-surface-default to-surface-alt min-h-screen">
        {/* Cancel Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>

        {/* Wizard Header */}
        <WizardHeader
          title={steps[currentStep].title}
          subtitle={steps[currentStep].subtitle}
          step={currentStep + 1}
          of={steps.length}
          onBack={currentStep > 0 ? prevStep : undefined}
        />

        {/* Progress Stepper */}
        <ProgressStepper
          current={currentStep + 1}
          total={steps.length}
          labels={steps.map(step => step.title)}
        />

        {/* Step Content */}
        <Card className="shadow-card border-border-subtle">
          <CardContent className="p-xl">
            <CurrentStepComponent 
              projectData={projectData}
              setProjectData={setProjectData}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-end">
          {currentStep === steps.length - 1 ? (
            <Button 
              onClick={createProject}
              disabled={!canProceed() || isCreating}
              className="bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-primary/90 hover:to-brand-accent/90"
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

      {/* Celebration Overlay */}
      <CelebrationOverlay 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)}
      />

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        title="Congratulations"
        body="Your project has been created. What would you like to do next?"
        onProjectOverview={() => {
          setShowSuccessModal(false);
          navigate(`/project/${createdProjectId}`);
        }}
        onHomepage={() => {
          setShowSuccessModal(false);
          navigate('/');
        }}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/');
        }}
      />
    </>
  );
};

export default ProjectWizard;
import React, { useState, useEffect } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Users, Calendar, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';

interface CapacitySettings {
  id: string;
  project_id: string;
  iteration_basis: string;
  work_week: number;
  office_weight: number;
  wfh_weight: number;
  hybrid_weight: number;
}

interface CapacityIteration {
  id: string;
  project_id: string;
  iteration_name: string;
  start_date: string;
  end_date: string;
  working_days: number;
  committed_story_points: number;
  created_at: string;
}

interface CapacityMember {
  id: string;
  iteration_id: string;
  stakeholder_id: string;
  leaves: number;
  availability_percent: number;
  effective_capacity_days: number;
}

interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  department?: string;
}

interface TeamCapacityTrackerProps {
  projectId: string;
}

export function TeamCapacityTracker({ projectId }: TeamCapacityTrackerProps) {
  const { user } = useApiAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<CapacitySettings | null>(null);
  const [iterations, setIterations] = useState<CapacityIteration[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<CapacityIteration | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIterationDialog, setShowIterationDialog] = useState(false);
  const [editingIteration, setEditingIteration] = useState<CapacityIteration | null>(null);
  
  // Form state for iteration
  const [iterationForm, setIterationForm] = useState({
    iteration_name: '',
    start_date: '',
    end_date: '',
    working_days: 0,
    committed_story_points: 0
  });

  useEffect(() => {
    if (projectId) {
      fetchSettings();
      fetchIterations();
      fetchStakeholders();
    }
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.getCapacitySettings(projectId);
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchIterations = async () => {
    try {
      const response = await apiClient.getCapacityIterations(projectId);
      if (response.success) {
        const data = response.data || [];
        setIterations(data);
        
        if (data.length > 0 && !selectedIteration) {
          setSelectedIteration(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching iterations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const response = await apiClient.getStakeholders(projectId);
      if (response.success) {
        const stakeholdersList = Array.isArray(response.data) ? response.data : response.data?.stakeholders || [];
        setStakeholders(stakeholdersList);
      }
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };

  const resetIterationForm = () => {
    setIterationForm({
      iteration_name: '',
      start_date: '',
      end_date: '',
      working_days: 0,
      committed_story_points: 0
    });
    setEditingIteration(null);
  };

  const handleIterationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const iterationData = {
        type: 'iteration' as const,
        iterationName: iterationForm.iteration_name,
        startDate: iterationForm.start_date,
        endDate: iterationForm.end_date,
        workingDays: iterationForm.working_days,
        committedStoryPoints: iterationForm.committed_story_points
      };

      const response = await apiClient.createCapacityIteration(projectId, iterationData);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Iteration created successfully'
        });
        setShowIterationDialog(false);
        resetIterationForm();
        fetchIterations();
      } else {
        throw new Error(response.error || 'Failed to create iteration');
      }
    } catch (error) {
      console.error('Error creating iteration:', error);
      toast({
        title: 'Error',
        description: 'Failed to create iteration',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Capacity Tracker</h1>
          <p className="text-muted-foreground">Track team capacity and plan iterations effectively</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Dialog open={showIterationDialog} onOpenChange={setShowIterationDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetIterationForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Iteration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Iteration</DialogTitle>
                <DialogDescription>
                  Set up a new iteration for team capacity planning.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleIterationSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="iteration_name">Iteration Name</Label>
                  <Input
                    id="iteration_name"
                    value={iterationForm.iteration_name}
                    onChange={(e) => setIterationForm(prev => ({ ...prev, iteration_name: e.target.value }))}
                    placeholder="e.g., Sprint 1, Iteration 2024-Q1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={iterationForm.start_date}
                      onChange={(e) => setIterationForm(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={iterationForm.end_date}
                      onChange={(e) => setIterationForm(prev => ({ ...prev, end_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="working_days">Working Days</Label>
                    <Input
                      id="working_days"
                      type="number"
                      value={iterationForm.working_days.toString()}
                      onChange={(e) => setIterationForm(prev => ({ ...prev, working_days: parseInt(e.target.value) || 0 }))}
                      min="1"
                      max="30"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="committed_story_points">Story Points</Label>
                    <Input
                      id="committed_story_points"
                      type="number"
                      value={iterationForm.committed_story_points}
                      onChange={(e) => setIterationForm(prev => ({ ...prev, committed_story_points: parseInt(e.target.value) || 0 }))}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowIterationDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Iteration
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="iterations">Iterations</TabsTrigger>
          <TabsTrigger value="capacity">Team Capacity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {iterations.length > 0 ? (
            <div className="space-y-6">
              {iterations.map((iteration) => (
                <Card key={iteration.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{iteration.iteration_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(iteration.start_date), 'MMM dd')} - {format(new Date(iteration.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline">{iteration.working_days} working days</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">0.0</div>
                        <p className="text-xs text-muted-foreground">effective days</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Committed Points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{iteration.committed_story_points}</div>
                        <p className="text-xs text-muted-foreground">story points</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Variance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                          0.0
                        </div>
                        <p className="text-xs text-muted-foreground">Balanced</p>
                      </CardContent>
                    </Card>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No iterations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first iteration to start tracking team capacity.
                </p>
                <Button onClick={() => {
                  resetIterationForm();
                  setShowIterationDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Iteration
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="iterations" className="space-y-4">
          <div className="grid gap-4">
            {iterations.map((iteration) => (
              <Card key={iteration.id} className={`cursor-pointer transition-all ${selectedIteration?.id === iteration.id ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div onClick={() => setSelectedIteration(iteration)}>
                      <CardTitle className="text-lg">{iteration.iteration_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(iteration.start_date), 'MMM dd')} - {format(new Date(iteration.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-status-error hover:bg-status-error hover:text-white">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{iteration.working_days} working days</Badge>
                    <Badge variant="outline">{iteration.committed_story_points} story points</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          {iterations.length > 0 ? (
            <div className="space-y-6">
              {iterations.map((iteration) => (
                <Card key={iteration.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{iteration.iteration_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(iteration.start_date), 'MMM dd')} - {format(new Date(iteration.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No team members assigned to this iteration</p>
                    <Button variant="outline" className="mt-4">
                      Add First Member
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No iterations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create an iteration first to manage team capacity.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
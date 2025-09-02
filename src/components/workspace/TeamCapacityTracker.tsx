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
import { format, differenceInDays, eachDayOfInterval, isWeekend } from 'date-fns';

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
  member_name: string;
  role: string;
  work_mode: string;
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
  const [members, setMembers] = useState<CapacityMember[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<CapacityIteration | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIterationDialog, setShowIterationDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [editingIteration, setEditingIteration] = useState<CapacityIteration | null>(null);
  
  // Form state for iteration
  const [iterationForm, setIterationForm] = useState({
    iteration_name: '',
    start_date: '',
    end_date: '',
    working_days: 0,
    committed_story_points: 0
  });
  
  // Form state for member
  const [memberForm, setMemberForm] = useState({
    iteration_id: '',
    member_name: '',
    role: '',
    work_mode: 'office',
    leaves: 0,
    availability_percent: 100,
      stakeholder_id: 'none'
  });

  useEffect(() => {
    if (projectId) {
      fetchSettings();
      fetchCapacityData();
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

  const fetchCapacityData = async () => {
    try {
      console.log('🔄 Fetching capacity data for project:', projectId);
      const response = await apiClient.getCapacityData(projectId);
      console.log('📋 Capacity data response:', response);
      
      if (response.success && response.data) {
        const { iterations: iterationsData = [], members: membersData = [] } = response.data;
        console.log('📋 Setting iterations data:', iterationsData);
        console.log('👥 Setting members data:', membersData);
        
        setIterations(iterationsData);
        setMembers(membersData);
        
        if (iterationsData.length > 0 && !selectedIteration) {
          setSelectedIteration(iterationsData[0]);
        }
      } else {
        console.error('❌ Error in capacity data response:', response.error);
      }
    } catch (error) {
      console.error('❌ Error fetching capacity data:', error);
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

  // Calculate working days between two dates (excluding weekends)
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) return 0;
      
      const allDays = eachDayOfInterval({ start, end });
      const workingDays = allDays.filter(day => !isWeekend(day));
      
      return workingDays.length;
    } catch (error) {
      console.error('Error calculating working days:', error);
      return 0;
    }
  };

  // Effect to automatically calculate working days when dates change
  useEffect(() => {
    if (iterationForm.start_date && iterationForm.end_date) {
      const workingDays = calculateWorkingDays(iterationForm.start_date, iterationForm.end_date);
      setIterationForm(prev => ({ ...prev, working_days: workingDays }));
    }
  }, [iterationForm.start_date, iterationForm.end_date]);

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

  const resetMemberForm = () => {
    setMemberForm({
      iteration_id: '',
      member_name: '',
      role: '',
      work_mode: 'office',
      leaves: 0,
      availability_percent: 100,
      stakeholder_id: 'none'
    });
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

      let response;
      if (editingIteration) {
        response = await apiClient.updateCapacityIteration(projectId, editingIteration.id, iterationData);
      } else {
        response = await apiClient.createCapacityIteration(projectId, iterationData);
      }
      
      if (response.success) {
        toast({
          title: 'Success',
          description: editingIteration ? 'Iteration updated successfully' : 'Iteration created successfully'
        });

        // Optimistic UI update so the new/updated iteration appears immediately
        if (editingIteration) {
          const updated = (response as any).data?.iteration;
          if (updated) {
            setIterations(prev => prev.map(it => it.id === updated.id ? updated : it));
            setSelectedIteration(updated);
          }
        } else {
          const created = (response as any).data?.iteration;
          if (created) {
            setIterations(prev => [created, ...prev]);
            setSelectedIteration(created);
          }
        }

        setShowIterationDialog(false);
        resetIterationForm();
        // Also refetch to ensure full consistency
        fetchCapacityData();
      } else {
        throw new Error(response.error || `Failed to ${editingIteration ? 'update' : 'create'} iteration`);
      }
    } catch (error) {
      console.error('Error saving iteration:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingIteration ? 'update' : 'create'} iteration`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteIteration = async (iterationId: string) => {
    try {
      const response = await apiClient.deleteCapacityIteration(projectId, iterationId);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Iteration deleted successfully'
        });
        
        // Clear selection if deleted iteration was selected
        if (selectedIteration?.id === iterationId) {
          setSelectedIteration(null);
        }
        
        fetchCapacityData();
      } else {
        throw new Error(response.error || 'Failed to delete iteration');
      }
    } catch (error) {
      console.error('Error deleting iteration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete iteration',
        variant: 'destructive'
      });
    }
  };

  const openEditIteration = (iteration: CapacityIteration) => {
    setEditingIteration(iteration);
    setIterationForm({
      iteration_name: iteration.iteration_name,
      start_date: iteration.start_date,
      end_date: iteration.end_date,
      working_days: iteration.working_days,
      committed_story_points: iteration.committed_story_points
    });
    setShowIterationDialog(true);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const memberData = {
        type: 'member' as const,
        iterationId: memberForm.iteration_id,
        memberName: memberForm.member_name,
        role: memberForm.role,
        workMode: memberForm.work_mode,
        leaves: memberForm.leaves,
        availabilityPercent: memberForm.availability_percent,
        stakeholderId: memberForm.stakeholder_id && memberForm.stakeholder_id !== 'none' ? memberForm.stakeholder_id : undefined
      };

      const response = await apiClient.addCapacityMember(projectId, memberData);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Team member added successfully'
        });

        setShowMemberDialog(false);
        resetMemberForm();
        fetchCapacityData();
      } else {
        throw new Error(response.error || 'Failed to add team member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add team member',
        variant: 'destructive'
      });
    }
  };

  const openAddMember = (iterationId: string) => {
    setMemberForm(prev => ({ ...prev, iteration_id: iterationId }));
    setShowMemberDialog(true);
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
                <DialogTitle>
                  {editingIteration ? 'Edit Iteration' : 'Create New Iteration'}
                </DialogTitle>
                <DialogDescription>
                  {editingIteration ? 'Update the iteration details.' : 'Set up a new iteration for team capacity planning.'}
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
                    <Label htmlFor="working_days">Working Days (Auto-calculated)</Label>
                    <Input
                      id="working_days"
                      type="number"
                      value={iterationForm.working_days.toString()}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                      title="Automatically calculated based on start and end dates (excluding weekends)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Excludes weekends (Sat & Sun)
                    </p>
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
                    {editingIteration ? 'Update Iteration' : 'Create Iteration'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Member Dialog */}
          <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a team member to the selected iteration for capacity planning.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="member_name">Member Name</Label>
                  <Input
                    id="member_name"
                    value={memberForm.member_name}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, member_name: e.target.value }))}
                    placeholder="Enter team member name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g., Developer, Tester, Designer"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="work_mode">Work Mode</Label>
                  <Select 
                    value={memberForm.work_mode} 
                    onValueChange={(value) => setMemberForm(prev => ({ ...prev, work_mode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="wfh">Work from Home</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leaves">Planned Leaves (days)</Label>
                    <Input
                      id="leaves"
                      type="number"
                      value={memberForm.leaves}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, leaves: parseInt(e.target.value) || 0 }))}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="availability_percent">Availability %</Label>
                    <Input
                      id="availability_percent"
                      type="number"
                      value={memberForm.availability_percent}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, availability_percent: parseInt(e.target.value) || 100 }))}
                      min="0"
                      max="100"
                      placeholder="100"
                    />
                  </div>
                </div>
                {stakeholders.length > 0 && (
                  <div>
                    <Label htmlFor="stakeholder_id">Link to Stakeholder (Optional)</Label>
                    <Select 
                      value={memberForm.stakeholder_id} 
                      onValueChange={(value) => setMemberForm(prev => ({ ...prev, stakeholder_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stakeholder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {stakeholders.map(stakeholder => (
                          <SelectItem key={stakeholder.id} value={stakeholder.id}>
                            {stakeholder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowMemberDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Member
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
                        <div className="text-2xl font-bold">
                          {members
                            .filter(m => m.iteration_id === iteration.id)
                            .reduce((sum, m) => sum + Number(m.effective_capacity_days || 0), 0)
                            .toFixed(1)}
                        </div>
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
                          {(() => {
                            const totalCapacity = members
                              .filter(m => m.iteration_id === iteration.id)
                              .reduce((sum, m) => sum + Number(m.effective_capacity_days || 0), 0);
                            const variance = totalCapacity - iteration.committed_story_points;
                            return (
                              <>
                                {variance > 0 ? <TrendingUp className="h-5 w-5 text-green-500" /> : 
                                 variance < 0 ? <TrendingDown className="h-5 w-5 text-red-500" /> : null}
                                {Math.abs(variance).toFixed(1)}
                              </>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const totalCapacity = members
                              .filter(m => m.iteration_id === iteration.id)
                              .reduce((sum, m) => sum + Number(m.effective_capacity_days || 0), 0);
                            const variance = totalCapacity - iteration.committed_story_points;
                            return variance > 0 ? 'Over-capacity' : variance < 0 ? 'Under-capacity' : 'Balanced';
                          })()}
                        </p>
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditIteration(iteration);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Iteration</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{iteration.iteration_name}"? This action cannot be undone and will remove all associated team capacity data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteIteration(iteration.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                      <Button onClick={() => openAddMember(iteration.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </div>
                  </div>
                  
                  {members.filter(m => m.iteration_id === iteration.id).length > 0 ? (
                    <div className="space-y-4">
                      {members
                        .filter(m => m.iteration_id === iteration.id)
                        .map(member => (
                          <Card key={member.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{member.member_name}</h4>
                                <p className="text-sm text-muted-foreground">{member.role} • {member.work_mode}</p>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{Number(member.effective_capacity_days || 0).toFixed(1)} days</div>
                                <p className="text-sm text-muted-foreground">{member.availability_percent}% available</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No team members assigned to this iteration</p>
                      <Button variant="outline" className="mt-4" onClick={() => openAddMember(iteration.id)}>
                        Add First Member
                      </Button>
                    </div>
                  )}
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
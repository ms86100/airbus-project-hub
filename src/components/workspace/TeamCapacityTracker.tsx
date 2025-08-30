import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Users, Calendar, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { format } from 'date-fns';

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
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<CapacitySettings | null>(null);
  const [iterations, setIterations] = useState<CapacityIteration[]>([]);
  const [members, setMembers] = useState<CapacityMember[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<CapacityIteration | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showIterationDialog, setShowIterationDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [editingIteration, setEditingIteration] = useState<CapacityIteration | null>(null);
  const [editingMember, setEditingMember] = useState<CapacityMember | null>(null);

  // Form states
  const [settingsForm, setSettingsForm] = useState({
    iteration_basis: 'days',
    work_week: 5,
    office_weight: 1.0,
    wfh_weight: 0.9,
    hybrid_weight: 0.95
  });

  const [iterationForm, setIterationForm] = useState({
    iteration_name: '',
    start_date: '',
    end_date: '',
    working_days: 10,
    committed_story_points: 0
  });

  const [memberForm, setMemberForm] = useState<{
    stakeholder_id: string;
    leaves: number;
    availability_percent: number;
  }>({
    stakeholder_id: '',
    leaves: 0,
    availability_percent: 100
  });

  useEffect(() => {
    if (projectId) {
      fetchSettings();
      fetchIterations();
      fetchStakeholders();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedIteration) {
      fetchMembers(selectedIteration.id);
    }
  }, [selectedIteration]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('team_capacity_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
        setSettingsForm({
          iteration_basis: data.iteration_basis,
          work_week: data.work_week,
          office_weight: data.office_weight,
          wfh_weight: data.wfh_weight,
          hybrid_weight: data.hybrid_weight
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchIterations = async () => {
    try {
      const { data, error } = await supabase
        .from('team_capacity_iterations')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setIterations(data || []);
      
      if (data && data.length > 0 && !selectedIteration) {
        setSelectedIteration(data[0]);
      }
    } catch (error) {
      console.error('Error fetching iterations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, name, email, department')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setStakeholders(data || []);
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };

  const fetchMembers = async (iterationId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_capacity_members')
        .select('*')
        .eq('iteration_id', iterationId);

      if (error) throw error;
      setMembers((data || []) as CapacityMember[]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const calculateEffectiveCapacity = (
    member: { leaves: number; availability_percent: number }, 
    iteration: CapacityIteration
  ): number => {
    // Simplified formula: (working_days - leaves) * (availability_percent/100)
    return (iteration.working_days - member.leaves) * (member.availability_percent / 100);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const settingsData = {
        ...settingsForm,
        project_id: projectId,
        created_by: user.id
      };

      let result;
      if (settings) {
        result = await supabase
          .from('team_capacity_settings')
          .update(settingsData)
          .eq('id', settings.id);
      } else {
        result = await supabase
          .from('team_capacity_settings')
          .insert([settingsData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully'
      });

      setShowSettingsDialog(false);
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    }
  };

  const handleIterationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const iterationData = {
        ...iterationForm,
        project_id: projectId,
        created_by: user.id
      };

      let result;
      if (editingIteration) {
        result = await supabase
          .from('team_capacity_iterations')
          .update(iterationData)
          .eq('id', editingIteration.id);
      } else {
        result = await supabase
          .from('team_capacity_iterations')
          .insert([iterationData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Iteration ${editingIteration ? 'updated' : 'created'} successfully`
      });

      setShowIterationDialog(false);
      resetIterationForm();
      fetchIterations();
    } catch (error) {
      console.error('Error saving iteration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save iteration',
        variant: 'destructive'
      });
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedIteration) return;

    try {
      const effectiveCapacity = calculateEffectiveCapacity(memberForm, selectedIteration);
      
      const selectedStakeholder = stakeholders.find(s => s.id === memberForm.stakeholder_id);
      
      const memberData = {
        stakeholder_id: memberForm.stakeholder_id,
        member_name: selectedStakeholder?.name || 'Unknown',
        role: selectedStakeholder?.department || 'Team Member',
        work_mode: 'office', // Default value since we're not using work mode anymore
        leaves: memberForm.leaves,
        availability_percent: memberForm.availability_percent,
        iteration_id: selectedIteration.id,
        effective_capacity_days: effectiveCapacity,
        created_by: user.id
      };

      let result;
      if (editingMember) {
        result = await supabase
          .from('team_capacity_members')
          .update(memberData)
          .eq('id', editingMember.id);
      } else {
        result = await supabase
          .from('team_capacity_members')
          .insert([memberData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Team member ${editingMember ? 'updated' : 'added'} successfully`
      });

      setShowMemberDialog(false);
      resetMemberForm();
      fetchMembers(selectedIteration.id);
    } catch (error) {
      console.error('Error saving member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team member',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteIteration = async (iterationId: string) => {
    try {
      const { error } = await supabase
        .from('team_capacity_iterations')
        .delete()
        .eq('id', iterationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Iteration deleted successfully'
      });

      fetchIterations();
      if (selectedIteration?.id === iterationId) {
        setSelectedIteration(null);
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

  const handleDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_capacity_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team member removed successfully'
      });

      if (selectedIteration) {
        fetchMembers(selectedIteration.id);
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive'
      });
    }
  };

  const resetIterationForm = () => {
    setIterationForm({
      iteration_name: '',
      start_date: '',
      end_date: '',
      working_days: 10,
      committed_story_points: 0
    });
    setEditingIteration(null);
  };

  const resetMemberForm = () => {
    setMemberForm({
      stakeholder_id: '',
      leaves: 0,
      availability_percent: 100
    });
    setEditingMember(null);
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

  const openEditMember = (member: CapacityMember) => {
    setEditingMember(member);
    setMemberForm({
      stakeholder_id: member.stakeholder_id,
      leaves: member.leaves,
      availability_percent: member.availability_percent
    });
    setShowMemberDialog(true);
  };

  const getStakeholderName = (stakeholderId: string) => {
    const stakeholder = stakeholders.find(s => s.id === stakeholderId);
    return stakeholder?.name || 'Unknown';
  };

  const getTotalCapacity = () => {
    return members.reduce((sum, member) => sum + member.effective_capacity_days, 0);
  };

  const getVariance = () => {
    if (!selectedIteration) return 0;
    return getTotalCapacity() - selectedIteration.committed_story_points;
  };

  const getVarianceColor = () => {
    const variance = getVariance();
    if (variance > 0) return 'text-status-success';
    if (variance < 0) return 'text-status-error';
    return 'text-muted-foreground';
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
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Capacity Settings</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="work_week">Work Week (days)</Label>
                    <Input
                      id="work_week"
                      type="number"
                      value={settingsForm.work_week}
                      onChange={(e) => setSettingsForm({ ...settingsForm, work_week: parseInt(e.target.value) })}
                      min="1"
                      max="7"
                    />
                  </div>
                  <div>
                    <Label htmlFor="iteration_basis">Iteration Basis</Label>
                    <Select value={settingsForm.iteration_basis} onValueChange={(value) => setSettingsForm({ ...settingsForm, iteration_basis: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Work Mode Weights</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="office_weight">Office</Label>
                      <Input
                        id="office_weight"
                        type="number"
                        step="0.1"
                        value={settingsForm.office_weight}
                        onChange={(e) => setSettingsForm({ ...settingsForm, office_weight: parseFloat(e.target.value) })}
                        min="0"
                        max="2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wfh_weight">Work from Home</Label>
                      <Input
                        id="wfh_weight"
                        type="number"
                        step="0.1"
                        value={settingsForm.wfh_weight}
                        onChange={(e) => setSettingsForm({ ...settingsForm, wfh_weight: parseFloat(e.target.value) })}
                        min="0"
                        max="2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hybrid_weight">Hybrid</Label>
                      <Input
                        id="hybrid_weight"
                        type="number"
                        step="0.1"
                        value={settingsForm.hybrid_weight}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hybrid_weight: parseFloat(e.target.value) })}
                        min="0"
                        max="2"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowSettingsDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Settings</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showIterationDialog} onOpenChange={setShowIterationDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetIterationForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Iteration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingIteration ? 'Edit' : 'Create'} Iteration</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleIterationSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="iteration_name">Iteration Name</Label>
                  <Input
                    id="iteration_name"
                    value={iterationForm.iteration_name}
                    onChange={(e) => setIterationForm({ ...iterationForm, iteration_name: e.target.value })}
                    placeholder="e.g., Sprint-01"
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
                      onChange={(e) => setIterationForm({ ...iterationForm, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={iterationForm.end_date}
                      onChange={(e) => setIterationForm({ ...iterationForm, end_date: e.target.value })}
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
                      value={iterationForm.working_days}
                      onChange={(e) => setIterationForm({ ...iterationForm, working_days: parseInt(e.target.value) })}
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="committed_story_points">Committed Story Points</Label>
                    <Input
                      id="committed_story_points"
                      type="number"
                      value={iterationForm.committed_story_points}
                      onChange={(e) => setIterationForm({ ...iterationForm, committed_story_points: parseInt(e.target.value) })}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowIterationDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingIteration ? 'Update' : 'Create'} Iteration</Button>
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
          {selectedIteration && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Current Iteration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedIteration.iteration_name}</div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedIteration.start_date), 'MMM dd')} - {format(new Date(selectedIteration.end_date), 'MMM dd, yyyy')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalCapacity().toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">effective days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Committed Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedIteration.committed_story_points}</div>
                  <p className="text-xs text-muted-foreground">story points</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Variance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${getVarianceColor()}`}>
                    {getVariance() > 0 ? <TrendingUp className="h-5 w-5" /> : getVariance() < 0 ? <TrendingDown className="h-5 w-5" /> : null}
                    {getVariance().toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getVariance() > 0 ? 'Over capacity' : getVariance() < 0 ? 'Under capacity' : 'Balanced'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedIteration && iterations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No iterations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first iteration to start tracking team capacity.
                </p>
                <Button onClick={() => setShowIterationDialog(true)}>
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
                      <Button variant="outline" size="sm" onClick={() => openEditIteration(iteration)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-status-error hover:bg-status-error hover:text-white">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Iteration</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{iteration.iteration_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteIteration(iteration.id)} className="bg-status-error hover:bg-status-error/90">
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

        <TabsContent value="capacity" className="space-y-4">
          {selectedIteration ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Team Members - {selectedIteration.iteration_name}</h3>
                <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetMemberForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleMemberSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="stakeholder">Team Member</Label>
                        <Select value={memberForm.stakeholder_id} onValueChange={(value) => setMemberForm({ ...memberForm, stakeholder_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {stakeholders.map((stakeholder) => (
                              <SelectItem key={stakeholder.id} value={stakeholder.id}>
                                {stakeholder.name} {stakeholder.department && `(${stakeholder.department})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="leaves">Leave Days</Label>
                          <Input
                            id="leaves"
                            type="number"
                            value={memberForm.leaves}
                            onChange={(e) => setMemberForm({ ...memberForm, leaves: parseInt(e.target.value) })}
                            min="0"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="availability_percent">Availability %</Label>
                          <Input
                            id="availability_percent"
                            type="number"
                            value={memberForm.availability_percent}
                            onChange={(e) => setMemberForm({ ...memberForm, availability_percent: parseInt(e.target.value) })}
                            min="0"
                            max="100"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowMemberDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">{editingMember ? 'Update' : 'Add'} Member</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {members.map((member) => {
                  const stakeholder = stakeholders.find(s => s.id === member.stakeholder_id);
                  return (
                    <Card key={member.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">👤</div>
                            <div>
                              <CardTitle className="text-lg">{stakeholder?.name || 'Unknown Member'}</CardTitle>
                              <p className="text-sm text-muted-foreground">{stakeholder?.department || 'No Department'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditMember(member)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-status-error hover:bg-status-error hover:text-white">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {stakeholder?.name || 'this member'} from this iteration?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMember(member.id)} className="bg-status-error hover:bg-status-error/90">
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Leave Days</Label>
                            <p className="font-medium">{member.leaves}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Availability</Label>
                            <p className="font-medium">{member.availability_percent}%</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Effective Capacity</Label>
                            <p className="font-medium text-primary">{member.effective_capacity_days.toFixed(1)} days</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {members.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Add team members to track their capacity for this iteration.
                      </p>
                      <Button onClick={() => setShowMemberDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Member
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No iteration selected</h3>
                <p className="text-muted-foreground text-center">
                  Select an iteration to view and manage team capacity.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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

interface Team {
  id: string;
  project_id: string;
  team_name: string;
  description?: string;
  created_by: string;
}

interface TeamDefinition {
  id: string;
  team_id: string;
  stakeholder_id: string;
  default_availability_percent: number;
  default_leaves: number;
  created_by: string;
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
  const [allIterationMembers, setAllIterationMembers] = useState<Record<string, CapacityMember[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [teamFromIterationId, setTeamFromIterationId] = useState<string>('');
  const [teamForm, setTeamForm] = useState({ team_name: '', description: '' });
  const [selectedTeamPerIteration, setSelectedTeamPerIteration] = useState<Record<string, string>>({});
  
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
    committed_story_points: 0,
    copyFromIteration: ''
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
      fetchTeams();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedIteration) {
      fetchMembers(selectedIteration.id);
    }
  }, [selectedIteration]);

  useEffect(() => {
    if (iterations.length > 0) {
      fetchAllIterationMembers();
    }
  }, [iterations]);

  // Auto-calculate working days when dates change
  useEffect(() => {
    if (iterationForm.start_date && iterationForm.end_date) {
      const workingDays = calculateWorkingDays(iterationForm.start_date, iterationForm.end_date);
      setIterationForm(prev => ({ ...prev, working_days: workingDays }));
    }
  }, [iterationForm.start_date, iterationForm.end_date]);

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

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('project_id', projectId)
        .order('team_name');
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchAllIterationMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_capacity_members')
        .select('*')
        .in('iteration_id', iterations.map(i => i.id));

      if (error) throw error;
      
      const membersByIteration: Record<string, CapacityMember[]> = {};
      iterations.forEach(iteration => {
        membersByIteration[iteration.id] = (data || []).filter(member => member.iteration_id === iteration.id);
      });
      
      setAllIterationMembers(membersByIteration);
    } catch (error) {
      console.error('Error fetching all iteration members:', error);
    }
  };

  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return 0;
    
    const days = eachDayOfInterval({ start, end });
    
    // Count only weekdays (Monday = 1, Sunday = 0)
    const workingDays = days.filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
    });
    
    return workingDays.length;
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
      const { copyFromIteration, ...iterationData } = iterationForm;
      const finalIterationData = {
        ...iterationData,
        project_id: projectId,
        created_by: user.id
      };

      let result;
      if (editingIteration) {
        result = await supabase
          .from('team_capacity_iterations')
          .update(finalIterationData)
          .eq('id', editingIteration.id);
      } else {
        result = await supabase
          .from('team_capacity_iterations')
          .insert([finalIterationData])
          .select();
      }

      if (result.error) throw result.error;

      // If creating a new iteration and copying from existing iteration
      if (!editingIteration && copyFromIteration && result.data) {
        const newIterationId = result.data[0].id;
        await copyMembersFromIteration(copyFromIteration, newIterationId);
      }

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
      fetchAllIterationMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive'
      });
    }
  };

  const copyMembersFromIteration = async (sourceIterationId: string, targetIterationId: string) => {
    try {
      const { data: sourceMembers, error } = await supabase
        .from('team_capacity_members')
        .select('*')
        .eq('iteration_id', sourceIterationId);

      if (error) throw error;

      if (sourceMembers && sourceMembers.length > 0) {
        const membersToInsert = sourceMembers.map(member => ({
          ...member,
          id: undefined, // Let the database generate new IDs
          iteration_id: targetIterationId,
          created_by: user?.id
        }));

        const { error: insertError } = await supabase
          .from('team_capacity_members')
          .insert(membersToInsert);

        if (insertError) throw insertError;

        toast({
          title: 'Success',
          description: `Copied ${sourceMembers.length} team members from previous iteration`
        });
      }
    } catch (error) {
      console.error('Error copying members:', error);
      toast({
        title: 'Warning',
        description: 'Iteration created but failed to copy team members',
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
      committed_story_points: 0,
      copyFromIteration: ''
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

  const handleSaveTeamFromIteration = async (iterationId: string) => {
    if (!user) return;
    try {
      const iterationMembers = allIterationMembers[iterationId] || [];
      if (iterationMembers.length === 0) {
        toast({ title: 'No members', description: 'Add members to this iteration before saving as a team', variant: 'destructive' });
        return;
      }
      if (!teamForm.team_name.trim()) {
        toast({ title: 'Team name required', description: 'Please provide a team name', variant: 'destructive' });
        return;
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([{ project_id: projectId, team_name: teamForm.team_name.trim(), description: teamForm.description?.trim() || null, created_by: user.id }])
        .select()
        .single();

      if (teamError) throw teamError;

      const definitions = iterationMembers.map((m) => ({
        team_id: team.id,
        stakeholder_id: m.stakeholder_id,
        default_availability_percent: m.availability_percent,
        default_leaves: m.leaves,
        created_by: user.id,
      }));

      const { error: defsError } = await supabase.from('team_definitions').insert(definitions);
      if (defsError) throw defsError;

      toast({ title: 'Team saved', description: `Team "${team.team_name}" created with ${definitions.length} members.` });
      setShowTeamDialog(false);
      setTeamForm({ team_name: '', description: '' });
      setTeamFromIterationId('');
      fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({ title: 'Error', description: 'Failed to save team', variant: 'destructive' });
    }
  };

  const applyTeamToIteration = async (teamId: string, iteration: CapacityIteration) => {
    if (!user) return;
    try {
      const { data: defs, error } = await supabase
        .from('team_definitions')
        .select('*')
        .eq('team_id', teamId);
      if (error) throw error;
      if (!defs || defs.length === 0) {
        toast({ title: 'Empty team', description: 'Selected team has no members defined', variant: 'destructive' });
        return;
      }

      const membersToInsert = defs.map((d) => {
        const stakeholder = stakeholders.find((s) => s.id === d.stakeholder_id);
        const eff = calculateEffectiveCapacity({ leaves: d.default_leaves, availability_percent: d.default_availability_percent }, iteration);
        return {
          stakeholder_id: d.stakeholder_id,
          member_name: stakeholder?.name || 'Unknown',
          role: stakeholder?.department || 'Team Member',
          work_mode: 'office',
          leaves: d.default_leaves,
          availability_percent: d.default_availability_percent,
          iteration_id: iteration.id,
          effective_capacity_days: eff,
          created_by: user.id,
          team_id: teamId,
        };
      });

      const { error: insertErr } = await supabase.from('team_capacity_members').insert(membersToInsert);
      if (insertErr) throw insertErr;

      toast({ title: 'Team applied', description: 'Team members added to iteration' });
      fetchAllIterationMembers();
      if (selectedIteration?.id === iteration.id) fetchMembers(iteration.id);
      setSelectedTeamPerIteration((prev) => ({ ...prev, [iteration.id]: '' }));
    } catch (error) {
      console.error('Error applying team:', error);
      toast({ title: 'Error', description: 'Failed to apply team', variant: 'destructive' });
    }
  };
  const openEditIteration = (iteration: CapacityIteration) => {
    setEditingIteration(iteration);
    setIterationForm({
      iteration_name: iteration.iteration_name,
      start_date: iteration.start_date,
      end_date: iteration.end_date,
      working_days: iteration.working_days,
      committed_story_points: iteration.committed_story_points,
      copyFromIteration: ''
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

  const getTotalCapacity = (iterationMembers?: CapacityMember[]) => {
    const membersToUse = iterationMembers || members;
    return membersToUse.reduce((sum, member) => sum + member.effective_capacity_days, 0);
  };

  const getVariance = (iteration: CapacityIteration, iterationMembers?: CapacityMember[]) => {
    return getTotalCapacity(iterationMembers) - iteration.committed_story_points;
  };

  const getVarianceColor = (variance: number) => {
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
                 {!editingIteration && iterations.length > 0 && (
                   <div>
                     <Label htmlFor="copyFromIteration">Copy Team from Previous Iteration (Optional)</Label>
                     <Select value={iterationForm.copyFromIteration} onValueChange={(value) => setIterationForm({ ...iterationForm, copyFromIteration: value })}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select iteration to copy team from" />
                       </SelectTrigger>
                       <SelectContent>
                         {iterations.map((iteration) => (
                           <SelectItem key={iteration.id} value={iteration.id}>
                             {iteration.iteration_name} ({format(new Date(iteration.start_date), 'MMM dd')} - {format(new Date(iteration.end_date), 'MMM dd, yyyy')})
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
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
          {iterations.length > 0 ? (
            <div className="space-y-6">
              {iterations.map((iteration) => {
                const iterationMembers = allIterationMembers[iteration.id] || [];
                const totalCapacity = getTotalCapacity(iterationMembers);
                const variance = getVariance(iteration, iterationMembers);
                
                return (
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
                          <div className="text-2xl font-bold">{totalCapacity.toFixed(1)}</div>
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
                          <div className={`text-2xl font-bold flex items-center gap-2 ${getVarianceColor(variance)}`}>
                            {variance > 0 ? <TrendingUp className="h-5 w-5" /> : variance < 0 ? <TrendingDown className="h-5 w-5" /> : null}
                            {variance.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {variance > 0 ? 'Over capacity' : variance < 0 ? 'Under capacity' : 'Balanced'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
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

        <TabsContent value="capacity" className="space-y-6">
          {iterations.length > 0 ? (
            <div className="space-y-6">
              {iterations.map((iteration) => {
                const iterationMembers = allIterationMembers[iteration.id] || [];
                
                return (
                  <Card key={iteration.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{iteration.iteration_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(iteration.start_date), 'MMM dd')} - {format(new Date(iteration.end_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {iterationMembers.length > 0 && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setTeamFromIterationId(iteration.id);
                              setShowTeamDialog(true);
                            }}
                          >
                            Save as Team
                          </Button>
                        )}
                        {teams.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Select 
                              value={selectedTeamPerIteration[iteration.id] || ''} 
                              onValueChange={(value) => setSelectedTeamPerIteration(prev => ({ ...prev, [iteration.id]: value }))}
                            >
                              <SelectTrigger className="bg-background border min-w-[150px]">
                                <SelectValue placeholder="Apply Team" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border z-[100] max-h-[200px] overflow-y-auto" position="popper" sideOffset={5}>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id} className="hover:bg-accent cursor-pointer">
                                    {team.team_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedTeamPerIteration[iteration.id] && (
                              <Button 
                                size="sm"
                                onClick={() => applyTeamToIteration(selectedTeamPerIteration[iteration.id], iteration)}
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                        )}
                        <Button 
                          onClick={() => {
                            setSelectedIteration(iteration);
                            setShowMemberDialog(true);
                            resetMemberForm();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </div>
                    </div>
                    
                    {iterationMembers.length > 0 ? (
                      <div className="grid gap-3">
                        {iterationMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div>
                                <h4 className="font-medium">{getStakeholderName(member.stakeholder_id)}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {member.availability_percent}% available • {member.leaves} days leave
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-semibold">{member.effective_capacity_days.toFixed(1)} days</div>
                                <div className="text-sm text-muted-foreground">effective capacity</div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedIteration(iteration);
                                    openEditMember(member);
                                  }}
                                >
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
                                        Are you sure you want to remove {getStakeholderName(member.stakeholder_id)} from {iteration.iteration_name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteMember(member.id)} 
                                        className="bg-status-error hover:bg-status-error/90"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No team members assigned to this iteration</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => {
                            setSelectedIteration(iteration);
                            setShowMemberDialog(true);
                            resetMemberForm();
                          }}
                        >
                          Add First Member
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
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
          
          <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
            <DialogContent className="z-[50] max-w-md" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Save Team</DialogTitle>
                <DialogDescription>
                  Save the current team members as a reusable team template.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveTeamFromIteration(teamFromIterationId); }} className="space-y-4">
                <div>
                  <Label htmlFor="team_name">Team Name</Label>
                  <Input
                    id="team_name"
                    value={teamForm.team_name}
                    onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                    placeholder="e.g., Voyager, Falcon"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={teamForm.description}
                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                    placeholder="Team description"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowTeamDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Team</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
            <DialogContent className="z-[50] max-w-md" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
                <DialogDescription>
                  {editingMember ? 'Update team member details.' : 'Add a new team member to this iteration.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMemberSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <Label htmlFor="stakeholder">Team Member</Label>
                  <Select value={memberForm.stakeholder_id} onValueChange={(value) => setMemberForm({ ...memberForm, stakeholder_id: value })}>
                    <SelectTrigger className="bg-background border">
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-popover border z-[9999] max-h-[200px] overflow-y-auto" 
                      position="popper" 
                      side="bottom"
                      align="start"
                      avoidCollisions={true}
                      sticky="always"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      {stakeholders.map((stakeholder) => (
                        <SelectItem key={stakeholder.id} value={stakeholder.id} className="hover:bg-accent cursor-pointer">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
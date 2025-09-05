import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Iteration {
  id: string;
  name: string;
  type: 'iteration' | 'sprint' | 'cycle';
  project_id: string;
  team_id: string;
  team_name?: string;
  start_date: string;
  end_date: string;
  weeks_count: number;
  created_at: string;
}

interface IterationCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  teams: Team[];
  preSelectedTeamId?: string | null;
  onIterationCreated: (iteration: Iteration) => void;
  onClose?: () => void;
}

export const IterationCreationDialog: React.FC<IterationCreationDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  teams,
  preSelectedTeamId,
  onIterationCreated,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [iterationForm, setIterationForm] = useState({
    name: '',
    type: 'iteration' as 'iteration' | 'sprint' | 'cycle',
    team_id: '',
    start_date: '',
    end_date: '',
  });

  const [calculatedWeeks, setCalculatedWeeks] = useState(0);

  useEffect(() => {
    if (preSelectedTeamId) {
      setIterationForm(prev => ({ ...prev, team_id: preSelectedTeamId }));
    }
  }, [preSelectedTeamId]);

  useEffect(() => {
    if (iterationForm.start_date && iterationForm.end_date) {
      const startDate = new Date(iterationForm.start_date);
      const endDate = new Date(iterationForm.end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeks = Math.ceil(diffDays / 7);
      setCalculatedWeeks(weeks);
    } else {
      setCalculatedWeeks(0);
    }
  }, [iterationForm.start_date, iterationForm.end_date]);

  const handleClose = () => {
    setIterationForm({
      name: '',
      type: 'iteration',
      team_id: preSelectedTeamId || '',
      start_date: '',
      end_date: '',
    });
    setCalculatedWeeks(0);
    onOpenChange(false);
    onClose?.();
  };

  const isFormValid = () => {
    return iterationForm.name.trim() && 
           iterationForm.team_id && 
           iterationForm.start_date && 
           iterationForm.end_date &&
           new Date(iterationForm.start_date) < new Date(iterationForm.end_date);
  };

  const handleCreateIteration = async () => {
    if (!isFormValid()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fill in all required fields and ensure start date is before end date.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setLoading(true);
      
      const iterationData = {
        ...iterationForm,
        weeks_count: calculatedWeeks,
      };

      const response = await apiClient.createIteration(projectId, iterationData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create iteration');
      }

      const teamName = teams.find(t => t.id === iterationForm.team_id)?.name || '';
      const iteration = { ...response.data, team_name: teamName };
      
      onIterationCreated(iteration);
      handleClose();
    } catch (error) {
      console.error('Error creating iteration:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to create iteration. Check team selection and dates.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeekRanges = () => {
    if (!iterationForm.start_date || !iterationForm.end_date || calculatedWeeks === 0) {
      return [];
    }

    const ranges = [];
    const startDate = new Date(iterationForm.start_date);
    
    for (let i = 0; i < calculatedWeeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Don't let week end go beyond iteration end date
      const iterationEnd = new Date(iterationForm.end_date);
      if (weekEnd > iterationEnd) {
        weekEnd.setTime(iterationEnd.getTime());
      }
      
      ranges.push({
        weekNumber: i + 1,
        startDate: weekStart.toLocaleDateString(),
        endDate: weekEnd.toLocaleDateString(),
      });
    }
    
    return ranges;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Iteration</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="iteration-name">Iteration Name *</Label>
              <Input
                id="iteration-name"
                value={iterationForm.name}
                onChange={(e) => setIterationForm({ ...iterationForm, name: e.target.value })}
                placeholder="Sprint 1, Iteration Alpha, etc."
                required
              />
            </div>
            <div>
              <Label htmlFor="iteration-type">Type</Label>
              <Select 
                value={iterationForm.type} 
                onValueChange={(value: 'iteration' | 'sprint' | 'cycle') => 
                  setIterationForm({ ...iterationForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iteration">Iteration</SelectItem>
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="cycle">Cycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="team-select">Team *</Label>
            <Select 
              value={iterationForm.team_id} 
              onValueChange={(value) => setIterationForm({ ...iterationForm, team_id: value })}
            >
              <SelectTrigger className="bg-background border-input z-50">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teams.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                No teams available. Create a team first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={iterationForm.start_date}
                onChange={(e) => setIterationForm({ ...iterationForm, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date *</Label>
              <Input
                id="end-date"
                type="date"
                value={iterationForm.end_date}
                onChange={(e) => setIterationForm({ ...iterationForm, end_date: e.target.value })}
                min={iterationForm.start_date}
                required
              />
            </div>
          </div>

          {calculatedWeeks > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Generated Weeks ({calculatedWeeks})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getWeekRanges().map((week) => (
                    <div key={week.weekNumber} className="p-3 bg-muted rounded-lg">
                      <div className="font-medium">Week {week.weekNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {week.startDate} - {week.endDate}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      After creating this iteration, you'll be able to open the Availability Matrix 
                      to plan weekly capacity for each team member.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateIteration}
              disabled={!isFormValid() || loading}
            >
              {loading ? 'Creating...' : 'Create Iteration'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
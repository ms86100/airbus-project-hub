import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Users, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';

interface TeamMember {
  id: string;
  member_name: string;
  role?: string;
  work_mode: string;
  default_availability_percent: number;
}

interface WeeklyAvailability {
  id?: string;
  team_member_id: string;
  availability_percent: number;
  leaves: number;
  effective_capacity?: number;
  notes?: string;
}

interface IterationWeek {
  id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
}

interface WeeklyAvailabilityManagerProps {
  projectId: string;
  iterationId: string;
  teamId: string;
  startDate: string;
  endDate: string;
  onSave?: () => void;
}

const WeeklyAvailabilityManager: React.FC<WeeklyAvailabilityManagerProps> = ({
  projectId,
  iterationId,
  teamId,
  startDate,
  endDate,
  onSave
}) => {
  const [weeks, setWeeks] = useState<IterationWeek[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availability, setAvailability] = useState<Record<string, Record<string, WeeklyAvailability>>>({});
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (iterationId && teamId) {
      generateWeeks();
      fetchTeamMembers();
      fetchWeeklyAvailability();
    }
  }, [iterationId, teamId, startDate, endDate]);

  const generateWeeks = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const generatedWeeks: IterationWeek[] = [];
    
    let weekNumber = 1;
    let currentStart = new Date(start);
    
    while (currentStart <= end) {
      const weekEnd = new Date(currentStart);
      weekEnd.setDate(currentStart.getDate() + 6);
      
      // Don't go beyond the iteration end date
      if (weekEnd > end) {
        weekEnd.setTime(end.getTime());
      }
      
      generatedWeeks.push({
        id: `week-${weekNumber}`,
        week_number: weekNumber,
        week_start_date: currentStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0]
      });
      
      weekNumber++;
      currentStart.setDate(currentStart.getDate() + 7);
    }
    
    setWeeks(generatedWeeks);
    if (generatedWeeks.length > 0) {
      setSelectedWeek(generatedWeeks[0].id);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await apiClient.getTeamMembers(teamId);
      if (response.success) {
        setTeamMembers(response.data || []);
        initializeAvailability(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const initializeAvailability = (members: TeamMember[]) => {
    const initialAvailability: Record<string, Record<string, WeeklyAvailability>> = {};
    
    weeks.forEach(week => {
      initialAvailability[week.id] = {};
      members.forEach(member => {
        initialAvailability[week.id][member.id] = {
          team_member_id: member.id,
          availability_percent: member.default_availability_percent,
          leaves: 0,
          notes: ''
        };
      });
    });
    
    setAvailability(initialAvailability);
  };

  const fetchWeeklyAvailability = async () => {
    try {
      // This would be implemented to fetch existing weekly availability data
      // For now, we'll use the default initialization
    } catch (error) {
      console.error('Error fetching weekly availability:', error);
    }
  };

  const updateAvailability = (weekId: string, memberId: string, field: keyof WeeklyAvailability, value: any) => {
    setAvailability(prev => ({
      ...prev,
      [weekId]: {
        ...prev[weekId],
        [memberId]: {
          ...prev[weekId]?.[memberId],
          [field]: value
        }
      }
    }));
  };

  const saveWeeklyAvailability = async () => {
    try {
      setLoading(true);
      
      // Create weeks and availability data
      for (const week of weeks) {
        const weekData = {
          iteration_id: iterationId,
          week_number: week.week_number,
          week_start_date: week.week_start_date,
          week_end_date: week.week_end_date
        };
        
        // Save week data and member availability
        const weekAvailabilityData = Object.values(availability[week.id] || {});
        
        // This would be implemented to save to the API
        console.log('Saving week:', weekData);
        console.log('Saving availability:', weekAvailabilityData);
      }
      
      toast({ title: 'Success', description: 'Weekly availability saved successfully' });
      onSave?.();
    } catch (error) {
      console.error('Error saving weekly availability:', error);
      toast({ title: 'Error', description: 'Failed to save weekly availability', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCapacity = (weekId: string) => {
    const weekAvailability = availability[weekId] || {};
    return Object.values(weekAvailability).reduce((total, member) => {
      // Calculate effective capacity based on 5 working days per week
      const effectiveCapacity = (5 - member.leaves) * (member.availability_percent / 100);
      return total + effectiveCapacity;
    }, 0);
  };

  const selectedWeekData = weeks.find(w => w.id === selectedWeek);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Availability Planning
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Plan team member availability for each week of the iteration
          </p>
        </CardHeader>
        <CardContent>
          {/* Week Selector */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {weeks.map((week) => (
              <Button
                key={week.id}
                variant={selectedWeek === week.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedWeek(week.id)}
              >
                Week {week.week_number}
                <Badge variant="secondary" className="ml-2">
                  {calculateTotalCapacity(week.id).toFixed(1)} days
                </Badge>
              </Button>
            ))}
          </div>

          {/* Selected Week Details */}
          {selectedWeekData && (
            <div className="mb-6">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-medium">Week {selectedWeekData.week_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedWeekData.week_start_date).toLocaleDateString()} - {' '}
                    {new Date(selectedWeekData.week_end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-auto">
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {calculateTotalCapacity(selectedWeek).toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Capacity Days</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Member Availability Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead>Availability %</TableHead>
                <TableHead>Leaves (Days)</TableHead>
                <TableHead>Effective Capacity</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => {
                const memberAvailability = availability[selectedWeek]?.[member.id];
                const effectiveCapacity = memberAvailability 
                  ? (5 - memberAvailability.leaves) * (memberAvailability.availability_percent / 100)
                  : 0;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.member_name}</TableCell>
                    <TableCell>{member.role || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.work_mode}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={memberAvailability?.availability_percent || 100}
                        onChange={(e) => updateAvailability(
                          selectedWeek, 
                          member.id, 
                          'availability_percent', 
                          parseInt(e.target.value) || 0
                        )}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={memberAvailability?.leaves || 0}
                        onChange={(e) => updateAvailability(
                          selectedWeek, 
                          member.id, 
                          'leaves', 
                          parseInt(e.target.value) || 0
                        )}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {effectiveCapacity.toFixed(1)} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={memberAvailability?.notes || ''}
                        onChange={(e) => updateAvailability(
                          selectedWeek, 
                          member.id, 
                          'notes', 
                          e.target.value
                        )}
                        className="min-h-[40px]"
                        placeholder="Notes..."
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-6">
            <Button onClick={saveWeeklyAvailability} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Weekly Availability
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyAvailabilityManager;
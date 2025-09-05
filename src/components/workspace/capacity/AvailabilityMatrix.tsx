import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, Users, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { DailyAttendanceModal } from './DailyAttendanceModal';

interface Iteration {
  id: string;
  name: string;
  type: string;
  team_id: string;
  team_name?: string;
  start_date: string;
  end_date: string;
  weeks_count: number;
}

interface TeamMember {
  id: string;
  display_name: string;
  role?: string;
  email?: string;
}

interface Week {
  id: string;
  week_index: number;
  week_start: string;
  week_end: string;
}

interface WeeklyAvailability {
  id?: string;
  iteration_week_id: string;
  team_member_id: string;
  availability_percent: number;
  calculated_days_present: number;
  calculated_days_total: number;
}

interface AvailabilityMatrixProps {
  iteration: Iteration;
  onBack: () => void;
  onUpdate: () => void;
}

export const AvailabilityMatrix: React.FC<AvailabilityMatrixProps> = ({
  iteration,
  onBack,
  onUpdate,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [availability, setAvailability] = useState<Record<string, WeeklyAvailability>>({});
  const [loading, setLoading] = useState(false);
  const [selectedMemberWeek, setSelectedMemberWeek] = useState<{
    memberId: string;
    weekId: string;
    availabilityId?: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [iteration.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch team members
      const membersResponse = await apiClient.getTeamMembers(iteration.team_id);
      if (membersResponse.success) {
        setTeamMembers(membersResponse.data || []);
      }

      // Fetch iteration weeks and availability
      const iterationResponse = await apiClient.getIterationDetails(iteration.id);
      if (iterationResponse.success) {
        const data = iterationResponse.data;
        setWeeks(data.weeks || []);
        
        // Convert availability array to lookup object
        const availabilityMap: Record<string, WeeklyAvailability> = {};
        (data.availability || []).forEach((avail: WeeklyAvailability) => {
          const key = `${avail.team_member_id}-${avail.iteration_week_id}`;
          availabilityMap[key] = avail;
        });
        setAvailability(availabilityMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load iteration data. Try again.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityKey = (memberId: string, weekId: string) => `${memberId}-${weekId}`;

  const updateAvailability = (memberId: string, weekId: string, percent: number) => {
    const key = getAvailabilityKey(memberId, weekId);
    const existing = availability[key];
    
    setAvailability(prev => ({
      ...prev,
      [key]: {
        ...existing,
        iteration_week_id: weekId,
        team_member_id: memberId,
        availability_percent: percent,
        calculated_days_present: Math.round((percent / 100) * 5),
        calculated_days_total: 5,
      }
    }));
  };

  const saveAvailability = async () => {
    try {
      setLoading(true);
      
      const availabilityList = Object.values(availability);
      const response = await apiClient.saveWeeklyAvailability(iteration.id, availabilityList);
      
      if (response.success) {
        toast({ title: 'Success', description: 'Availability updated successfully.' });
        fetchData(); // Refresh data
      } else {
        throw new Error(response.error || 'Failed to save availability');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save availability. Try again.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const openDailyModal = (memberId: string, weekId: string) => {
    const key = getAvailabilityKey(memberId, weekId);
    const avail = availability[key];
    
    setSelectedMemberWeek({
      memberId,
      weekId,
      availabilityId: avail?.id,
    });
  };

  const handleDailyUpdate = (memberId: string, weekId: string, percent: number, daysPresent: number) => {
    updateAvailability(memberId, weekId, percent);
    setSelectedMemberWeek(null);
  };

  if (loading && teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{iteration.name} - Availability Matrix</h1>
            <p className="text-muted-foreground">
              Plan weekly availability for team members
            </p>
          </div>
        </div>
        <Button onClick={saveAvailability} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save Availability
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{iteration.weeks_count} Weeks</div>
                <div className="text-sm text-muted-foreground">
                  {iteration.start_date} to {iteration.end_date}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{teamMembers.length} Members</div>
                <div className="text-sm text-muted-foreground">
                  Team: {iteration.team_name}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">Legend</div>
            <div className="space-y-1 text-sm">
              <div>% = Weekly availability</div>
              <div>P = Present, A = Absent</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Availability Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members</h3>
              <p className="text-muted-foreground">
                Add team members to start planning availability
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Team Member</TableHead>
                    {weeks.map((week) => (
                      <TableHead key={week.id} className="text-center min-w-32">
                        <div className="space-y-1">
                          <div className="font-medium">Week {week.week_index}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(week.week_start).toLocaleDateString()} - {new Date(week.week_end).toLocaleDateString()}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{member.display_name}</div>
                          {member.role && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {member.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {weeks.map((week) => {
                        const key = getAvailabilityKey(member.id, week.id);
                        const avail = availability[key];
                        const percent = avail?.availability_percent || 100;
                        
                        return (
                          <TableCell key={week.id} className="text-center">
                            <div className="space-y-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percent}
                                onChange={(e) => updateAvailability(
                                  member.id, 
                                  week.id, 
                                  parseInt(e.target.value) || 0
                                )}
                                className="w-20 h-8 text-center"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDailyModal(member.id, week.id)}
                                className="w-20 h-6 text-xs"
                              >
                                Daily
                              </Button>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMemberWeek && (
        <DailyAttendanceModal
          memberId={selectedMemberWeek.memberId}
          memberName={teamMembers.find(m => m.id === selectedMemberWeek.memberId)?.display_name || ''}
          weekId={selectedMemberWeek.weekId}
          week={weeks.find(w => w.id === selectedMemberWeek.weekId)}
          availabilityId={selectedMemberWeek.availabilityId}
          currentPercent={availability[getAvailabilityKey(selectedMemberWeek.memberId, selectedMemberWeek.weekId)]?.availability_percent || 100}
          onClose={() => setSelectedMemberWeek(null)}
          onUpdate={handleDailyUpdate}
        />
      )}
    </div>
  );
};
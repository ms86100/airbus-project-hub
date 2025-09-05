import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Calendar, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { TeamCreationDialog } from './capacity/TeamCreationDialog';
import { IterationCreationDialog } from './capacity/IterationCreationDialog';
import { AvailabilityMatrix } from './capacity/AvailabilityMatrix';

interface Team {
  id: string;
  team_name: string;
  description?: string;
  project_id: string;
  created_at: string;
  member_count?: number;
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

interface TeamCapacityModuleProps {
  projectId: string;
}

export const TeamCapacityModule: React.FC<TeamCapacityModuleProps> = ({ projectId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIteration, setSelectedIteration] = useState<Iteration | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [iterationDialogOpen, setIterationDialogOpen] = useState(false);
  const [newlyCreatedTeamId, setNewlyCreatedTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
    fetchIterations();
  }, [projectId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTeams(projectId);
      if (response.success) {
        setTeams(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({ title: 'Error', description: 'Failed to fetch teams', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchIterations = async () => {
    try {
      const response = await apiClient.getIterations(projectId);
      if (response.success) {
        setIterations(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching iterations:', error);
      toast({ title: 'Error', description: 'Failed to fetch iterations', variant: 'destructive' });
    }
  };

  const handleTeamCreated = (teamId: string) => {
    setNewlyCreatedTeamId(teamId);
    fetchTeams(); // Refresh teams list immediately
    setTeamDialogOpen(false);
    setIterationDialogOpen(true);
    // Don't pre-select the team, let user choose from all teams
    toast({ title: 'Success', description: 'Team created. Create an iteration to start capacity planning.' });
  };

  const handleIterationCreated = (iteration: Iteration) => {
    fetchIterations();
    setIterationDialogOpen(false);
    setSelectedIteration(iteration);
    toast({ title: 'Success', description: `Iteration created with ${iteration.weeks_count} weeks.` });
  };

  const openIterationMatrix = (iteration: Iteration) => {
    setSelectedIteration(iteration);
  };

  if (selectedIteration) {
    return (
      <AvailabilityMatrix
        iteration={selectedIteration}
        onBack={() => setSelectedIteration(null)}
        onUpdate={() => {
          fetchIterations();
          setSelectedIteration(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Capacity Management</h1>
          <p className="text-muted-foreground">
            Create teams, plan iterations, and track weekly availability
          </p>
        </div>
      </div>

      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="iterations">Iterations</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create and manage project teams
                </p>
              </div>
              <Button onClick={() => setTeamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first team to start capacity planning
                  </p>
                  <Button onClick={() => setTeamDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <Card key={team.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{team.team_name}</h3>
                          <Badge variant="outline">{team.member_count || 0} members</Badge>
                        </div>
                        {team.description && (
                          <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewlyCreatedTeamId(team.id);
                              setIterationDialogOpen(true);
                            }}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Create Iteration
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iterations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Iterations
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage iteration planning and capacity tracking
                </p>
              </div>
              <Button 
                onClick={() => setIterationDialogOpen(true)}
                disabled={teams.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Iteration
              </Button>
            </CardHeader>
            <CardContent>
              {iterations.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No iterations yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {teams.length === 0 
                      ? 'Create a team first, then start planning iterations'
                      : 'Create your first iteration to start capacity planning'
                    }
                  </p>
                  {teams.length > 0 && (
                    <Button onClick={() => setIterationDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Iteration
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {iterations.map((iteration) => (
                    <Card key={iteration.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{iteration.name}</h3>
                              <Badge variant="outline">{iteration.type}</Badge>
                              <Badge variant="secondary">{iteration.weeks_count} weeks</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Team: {iteration.team_name}</p>
                              <p>Duration: {iteration.start_date} to {iteration.end_date}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => openIterationMatrix(iteration)}
                            variant="outline"
                          >
                            Open Availability Matrix
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TeamCreationDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        projectId={projectId}
        onTeamCreated={handleTeamCreated}
      />

      <IterationCreationDialog
        open={iterationDialogOpen}
        onOpenChange={setIterationDialogOpen}
        projectId={projectId}
        teams={teams}
        preSelectedTeamId={null} // Don't pre-select any team
        onIterationCreated={handleIterationCreated}
        onClose={() => setNewlyCreatedTeamId(null)}
      />
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { TeamCapacityTracker } from '@/components/workspace/TeamCapacityTracker';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
}

const TeamCapacity = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [capacityStats, setCapacityStats] = useState({
    totalIterations: 0,
    totalMembers: 0,
    avgCapacity: 0,
    totalProjects: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchCapacityStats();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.getProjects();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch projects');
      }
      
      setProjects(response.data || []);
      
      // Auto-select first project if available
      if (response.data && response.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCapacityStats = async () => {
    try {
      const response = await apiClient.getCapacityStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch capacity stats');
      }
      
      setCapacityStats(response.data);
    } catch (error) {
      console.error('Error fetching capacity stats:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Capacity</h1>
            <p className="text-muted-foreground">
              Plan and track team capacity across iterations and projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Iterations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityStats.totalIterations}</div>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityStats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                Tracked capacity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Capacity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityStats.avgCapacity}</div>
              <p className="text-xs text-muted-foreground">
                Days per member
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityStats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                With capacity tracking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Project Selector */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Project</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose a project to view and manage team capacity planning
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {projects.length} project{projects.length !== 1 ? 's' : ''} available
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project to view team capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span>{project.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProjectId && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/project/${selectedProjectId}`)}
                >
                  View Project
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Capacity Content */}
        {selectedProjectId ? (
          <TeamCapacityTracker projectId={selectedProjectId} />
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground mb-4">
                Choose a project from the dropdown above to view and manage team capacity planning
              </p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamCapacity;
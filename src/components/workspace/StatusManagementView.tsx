import React, { useState, useEffect } from 'react';
import { Plus, Settings, Palette, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';

interface StatusManagementViewProps {
  projectId: string;
}

interface ProjectStatus {
  id: string;
  project_id: string;
  key: string;
  label: string;
  color?: string;
  sort_order: number;
}

const defaultStatuses = [
  { key: 'todo', label: 'To Do', color: '#6b7280', sort_order: 1 },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6', sort_order: 2 },
  { key: 'blocked', label: 'Blocked', color: '#ef4444', sort_order: 3 },
  { key: 'completed', label: 'Completed', color: '#10b981', sort_order: 4 },
];

export function StatusManagementView({ projectId }: StatusManagementViewProps) {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState({
    key: '',
    label: '',
    color: '#6b7280',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStatuses();
  }, [projectId]);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks and milestones to display status overview
      const tasksResponse = await apiClient.getTasks(projectId);
      const milestonesResponse = await apiClient.getMilestones(projectId);
      
      if (tasksResponse.success || milestonesResponse.success) {
        // For now, use default statuses - in the future this could be configurable
        setStatuses(defaultStatuses.map((status, index) => ({
          id: `default-${index}`,
          project_id: projectId,
          key: status.key,
          label: status.label,
          color: status.color,
          sort_order: status.sort_order
        })));
      }
    } catch (error: any) {
      toast({
        title: "Error loading statuses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createStatus = async () => {
    if (!newStatus.key || !newStatus.label) {
      toast({
        title: "Missing information",
        description: "Please provide both key and label for the status.",
        variant: "destructive",
      });
      return;
    }

    // Placeholder - functionality will be implemented when tables are created
    toast({
      title: "Coming soon",
      description: "Status management will be available once the database tables are set up.",
    });
  };

  const deleteStatus = async (statusId: string) => {
    // Placeholder - functionality will be implemented when tables are created
    toast({
      title: "Coming soon",
      description: "Status management will be available once the database tables are set up.",
    });
  };

  const initializeDefaultStatuses = async () => {
    // Placeholder - functionality will be implemented when tables are created
    toast({
      title: "Coming soon",
      description: "Status management will be available once the database tables are set up.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Status Management</h1>
            <p className="text-muted-foreground mt-1">Configure task statuses (Project Coordinator)</p>
          </div>
          <Button 
            onClick={createStatus}
            className="bg-airbus-primary text-white hover:bg-airbus-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Status
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl space-y-6">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Defined statuses appear in every task status dropdown across the project.
              Changes reflect everywhere instantly.
            </AlertDescription>
          </Alert>

          {/* Add New Status Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status-label">Label</Label>
                  <Input
                    id="status-label"
                    placeholder="e.g., In Review"
                    value={newStatus.label}
                    onChange={(e) => setNewStatus(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-key">Key</Label>
                  <Input
                    id="status-key"
                    placeholder="e.g., in_review"
                    value={newStatus.key}
                    onChange={(e) => setNewStatus(prev => ({ ...prev, key: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="status-color"
                      value={newStatus.color}
                      onChange={(e) => setNewStatus(prev => ({ ...prev, color: e.target.value }))}
                      className="w-12 h-9 rounded border border-input"
                    />
                    <Input
                      value={newStatus.color}
                      onChange={(e) => setNewStatus(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status List */}
          {statuses.length === 0 ? (
            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-airbus-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Settings className="h-8 w-8 text-airbus-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No custom statuses</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Initialize default statuses or create your own custom workflow.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={initializeDefaultStatuses}
                    className="bg-airbus-primary text-white hover:bg-airbus-primary/90"
                  >
                    Initialize Default Statuses
                  </Button>
                  <Button variant="outline" onClick={createStatus}>
                    Create Custom Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Project Statuses ({statuses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statuses.map((status, index) => (
                    <div key={status.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4 text-muted-foreground" />
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: status.color }}
                        />
                        <div>
                          <h4 className="font-medium">{status.label}</h4>
                          <p className="text-sm text-muted-foreground">Key: {status.key}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Order: {status.sort_order}</Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteStatus(status.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
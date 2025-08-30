import React, { useState, useEffect } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/simple-select';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Calendar, BarChart3 } from 'lucide-react';
import { InteractiveRetrospectiveBoard } from './InteractiveRetrospectiveBoard';
import { RetrospectiveAnalytics } from './RetrospectiveAnalytics';

interface RetrospectiveViewProps {
  projectId: string;
}

interface TeamCapacityIteration {
  id: string;
  iteration_name: string;
  start_date: string;
  end_date: string;
}

interface Retrospective {
  id: string;
  iteration_id: string;
  framework: string;
  project_id: string;
  created_by: string;
  status: string;
  created_at?: string;
}

interface RetrospectiveColumn {
  id: string;
  retrospective_id: string;
  title: string;
  subtitle?: string;
  column_order: number;
  cards?: RetrospectiveCardData[];
}

interface RetrospectiveCardData {
  id: string;
  column_id: string;
  text: string;
  votes: number;
  card_order: number;
  created_by: string;
  created_at?: string;
}

interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  department?: string;
  raci?: string;
  influence_level?: string;
  notes?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface ActionItem {
  id: string;
  retrospective_id: string;
  from_card_id: string;
  what_task: string;
  when_sprint: string;
  who_responsible: string;
  how_approach: string;
  backlog_ref_id: string;
  backlog_status: string;
  converted_to_task: boolean;
  task_id: string | null;
  created_at?: string;
}

interface CardVote {
  id: string;
  card_id: string;
  user_id: string;
  created_at: string;
}

const FRAMEWORK_TEMPLATES = {
  Classic: [
    { title: "Start 🚀", subtitle: "What should we start doing?" },
    { title: "Stop ✋", subtitle: "What should we stop doing?" },
    { title: "Continue ✅", subtitle: "What should we continue doing?" }
  ],
  "4Ls": [
    { title: "Liked 👍", subtitle: "What did we like?" },
    { title: "Learned 🧠", subtitle: "What did we learn?" },
    { title: "Lacked 😕", subtitle: "What was missing or lacking?" },
    { title: "Longed For 🌟", subtitle: "What did we long for?" }
  ],
  KISS: [
    { title: "Keep 💚", subtitle: "What should we continue doing?" },
    { title: "Improve 🔧", subtitle: "What could be improved?" },
    { title: "Start 🆕", subtitle: "What should we try next?" },
    { title: "Stop ✋", subtitle: "What should we avoid?" }
  ],
  Sailboat: [
    { title: "Wind ⛵", subtitle: "What helped us move forward?" },
    { title: "Anchor ⚓", subtitle: "What slowed us down?" },
    { title: "Rocks 🪨", subtitle: "What risks do we see ahead?" },
    { title: "Island 🏝️", subtitle: "What is our destination/goal?" }
  ],
  "Mad/Sad/Glad": [
    { title: "Mad 😡", subtitle: "What frustrated us?" },
    { title: "Sad 😢", subtitle: "What disappointed us?" },
    { title: "Glad 😊", subtitle: "What made us happy?" }
  ]
};

// Card colors that cycle through 7 colors
const CARD_COLORS = [
  'bg-red-100 border-red-200 text-red-900',
  'bg-blue-100 border-blue-200 text-blue-900', 
  'bg-green-100 border-green-200 text-green-900',
  'bg-yellow-100 border-yellow-200 text-yellow-900',
  'bg-purple-100 border-purple-200 text-purple-900',
  'bg-pink-100 border-pink-200 text-pink-900',
  'bg-indigo-100 border-indigo-200 text-indigo-900'
];

const getCardColor = (index: number) => {
  return CARD_COLORS[index % CARD_COLORS.length];
};

export function RetrospectiveView({ projectId }: RetrospectiveViewProps) {
  const { user } = useApiAuth();
  const { toast } = useToast();

  const [retrospectives, setRetrospectives] = useState<Retrospective[]>([]);
  const [selectedRetrospective, setSelectedRetrospective] = useState<Retrospective | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [iterations, setIterations] = useState<TeamCapacityIteration[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'board' | 'analytics'>('list');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    iteration_id: '',
    framework: 'Classic'
  });

  useEffect(() => {
    if (user) {
      fetchRetrospectives();
      fetchStakeholders();
      fetchIterations();
    }
  }, [user, projectId]);

  const fetchRetrospectives = async () => {
    try {
      console.log('🔄 Fetching retrospectives for project:', projectId);
      const response = await apiClient.getRetrospectives(projectId);
      console.log('🔄 Retrospectives response:', response);
      
      if (response.success) {
        const data = Array.isArray(response.data) 
          ? response.data 
          : (response.data && typeof response.data === 'object' && 'retrospectives' in response.data)
            ? (response.data as any).retrospectives || []
            : [];
        console.log('🔄 Setting retrospectives data:', data);
        setRetrospectives(data);
      } else {
        console.error('❌ Error fetching retrospectives:', response.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching retrospectives:', error);
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

  const fetchIterations = async () => {
    try {
      const response = await apiClient.getCapacityIterations(projectId);
      if (response.success) {
        const iterationsList = Array.isArray(response.data) ? response.data : [];
        setIterations(iterationsList);
      }
    } catch (error) {
      console.error('Error fetching iterations:', error);
    }
  };

  const handleCreateRetrospective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!createForm.iteration_id) {
      toast({
        title: 'Error',
        description: 'Please select an iteration',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await apiClient.createRetrospective(projectId, {
        framework: createForm.framework,
        iterationId: createForm.iteration_id
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Retrospective created successfully'
        });

        setShowCreateDialog(false);
        setCreateForm({ iteration_id: '', framework: 'Classic' });
        fetchRetrospectives();
      } else {
        throw new Error(response.error || 'Failed to create retrospective');
      }
    } catch (error) {
      console.error('Error creating retrospective:', error);
      toast({
        title: 'Error',
        description: 'Failed to create retrospective',
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

  // Handle view changes based on selected retrospective
  if (view === 'board' && selectedRetrospective) {
    return (
      <InteractiveRetrospectiveBoard
        retrospective={selectedRetrospective}
        onBack={() => {
          setView('list');
          setSelectedRetrospective(null);
        }}
      />
    );
  }

  if (view === 'analytics') {
    return (
      <RetrospectiveAnalytics
        projectId={projectId}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Retrospectives</h1>
          <p className="text-muted-foreground">Team retrospectives and action items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Retrospective
            </Button>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Retrospective</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRetrospective} className="space-y-4">
                <div>
                  <Label htmlFor="iteration">Iteration *</Label>
                  <SimpleSelect
                    value={createForm.iteration_id}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, iteration_id: value }))}
                    placeholder="Select an iteration"
                  >
                    {iterations.map((iteration) => (
                      <SimpleSelectItem key={iteration.id} value={iteration.id}>
                        {iteration.iteration_name} ({iteration.start_date} - {iteration.end_date})
                      </SimpleSelectItem>
                    ))}
                  </SimpleSelect>
                </div>
                <div>
                  <Label htmlFor="framework">Framework</Label>
                  <SimpleSelect
                    value={createForm.framework}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, framework: value }))}
                    placeholder="Select framework"
                  >
                    {Object.keys(FRAMEWORK_TEMPLATES).map((framework) => (
                      <SimpleSelectItem key={framework} value={framework}>
                        {framework}
                      </SimpleSelectItem>
                    ))}
                  </SimpleSelect>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {retrospectives.length > 0 ? (
        <div className="grid gap-4">
          {retrospectives.map((retro) => {
            const iteration = iterations.find(i => i.id === retro.iteration_id);
            return (
              <Card key={retro.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{retro.framework} Retrospective</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {iteration && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {iteration.iteration_name}
                        </span>
                      )}
                      <span>Created {new Date(retro.created_at || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{retro.status}</Badge>
                    <Button 
                      onClick={() => {
                        setSelectedRetrospective(retro);
                        setView('board');
                      }}
                    >
                      Open Board
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Interactive {retro.framework} retrospective board with voting and action items.
                </p>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No retrospectives yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first retrospective to start collecting team feedback.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Retrospective
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, ThumbsUp, MoreHorizontal, Target, Trash2, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RetrospectiveCard } from './RetrospectiveCard';

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
}

interface RetrospectiveColumn {
  id: string;
  retrospective_id: string;
  title: string;
  subtitle: string;
  column_order: number;
}

interface RetrospectiveCard {
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
}

const FRAMEWORK_TEMPLATES = {
  Classic: [
    { title: "What went well? 👍", subtitle: "Things we should continue doing" },
    { title: "What didn't go well? 👎", subtitle: "Things that need improvement" },
    { title: "Action items 🎯", subtitle: "What we will do differently" }
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [iterations, setIterations] = useState<TeamCapacityIteration[]>([]);
  const [retrospectives, setRetrospectives] = useState<Retrospective[]>([]);
  const [columns, setColumns] = useState<RetrospectiveColumn[]>([]);
  const [cards, setCards] = useState<RetrospectiveCard[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [selectedRetrospective, setSelectedRetrospective] = useState<Retrospective | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [selectedCardForAction, setSelectedCardForAction] = useState<RetrospectiveCard | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    iteration_id: '',
    framework: 'Classic'
  });

  const [cardForm, setCardForm] = useState({
    text: ''
  });

  const [actionForm, setActionForm] = useState({
    what_task: '',
    when_sprint: '',
    who_responsible: '',
    how_approach: '',
    backlog_ref_id: ''
  });

  useEffect(() => {
    if (user) {
      fetchIterations();
      fetchRetrospectives();
      fetchStakeholders();
      fetchProfiles();
    }
  }, [user, projectId]);

  useEffect(() => {
    if (selectedRetrospective) {
      fetchColumns();
      fetchCards();
      fetchActionItems();
    }
  }, [selectedRetrospective]);

  const fetchIterations = async () => {
    try {
      const { data, error } = await supabase
        .from('team_capacity_iterations')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setIterations(data || []);
    } catch (error) {
      console.error('Error fetching iterations:', error);
    }
  };

  const fetchRetrospectives = async () => {
    try {
      const { data, error } = await supabase
        .from('retrospectives')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRetrospectives(data || []);
      
      if (data && data.length > 0 && !selectedRetrospective) {
        setSelectedRetrospective(data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching retrospectives:', error);
      setLoading(false);
    }
  };

  const fetchColumns = async () => {
    if (!selectedRetrospective) return;
    
    try {
      const { data, error } = await supabase
        .from('retrospective_columns')
        .select('*')
        .eq('retrospective_id', selectedRetrospective.id)
        .order('column_order');

      if (error) throw error;
      setColumns(data || []);
    } catch (error) {
      console.error('Error fetching columns:', error);
    }
  };

  const fetchCards = async () => {
    if (!selectedRetrospective) return;
    
    try {
      const { data, error } = await supabase
        .from('retrospective_cards')
        .select('*')
        .in('column_id', columns.map(c => c.id))
        .order('card_order');

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const fetchActionItems = async () => {
    if (!selectedRetrospective) return;
    
    try {
      const { data, error } = await supabase
        .from('retrospective_action_items')
        .select('*')
        .eq('retrospective_id', selectedRetrospective.id);

      if (error) throw error;
      setActionItems(data || []);
    } catch (error) {
      console.error('Error fetching action items:', error);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setStakeholders(data || []);
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleCreateRetrospective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Create retrospective
      const { data: retrospectiveData, error: retrospectiveError } = await supabase
        .from('retrospectives')
        .insert([{
          iteration_id: createForm.iteration_id,
          framework: createForm.framework,
          project_id: projectId,
          created_by: user.id
        }])
        .select()
        .single();

      if (retrospectiveError) throw retrospectiveError;

      // Create columns based on framework
      const template = FRAMEWORK_TEMPLATES[createForm.framework as keyof typeof FRAMEWORK_TEMPLATES];
      const columnsToInsert = template.map((col, index) => ({
        retrospective_id: retrospectiveData.id,
        title: col.title,
        subtitle: col.subtitle,
        column_order: index
      }));

      const { error: columnsError } = await supabase
        .from('retrospective_columns')
        .insert(columnsToInsert);

      if (columnsError) throw columnsError;

      toast({
        title: 'Success',
        description: 'Retrospective created successfully'
      });

      setShowCreateDialog(false);
      setCreateForm({ iteration_id: '', framework: 'Classic' });
      fetchRetrospectives();
    } catch (error) {
      console.error('Error creating retrospective:', error);
      toast({
        title: 'Error',
        description: 'Failed to create retrospective',
        variant: 'destructive'
      });
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedColumnId) return;

    try {
      const { error } = await supabase
        .from('retrospective_cards')
        .insert([{
          column_id: selectedColumnId,
          text: cardForm.text,
          created_by: user.id,
          card_order: cards.filter(c => c.column_id === selectedColumnId).length
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Card added successfully'
      });

      setShowCardDialog(false);
      setCardForm({ text: '' });
      setSelectedColumnId('');
      fetchCards();
    } catch (error) {
      console.error('Error adding card:', error);
      toast({
        title: 'Error',
        description: 'Failed to add card',
        variant: 'destructive'
      });
    }
  };

  const handleVoteCard = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    try {
      const { error } = await supabase
        .from('retrospective_cards')
        .update({ votes: card.votes + 1 })
        .eq('id', cardId);

      if (error) {
        console.error('Error voting on card:', error);
        toast({
          title: 'Error',
          description: 'Failed to vote on card: ' + error.message,
          variant: 'destructive'
        });
        return;
      }
      
      fetchCards();
    } catch (error) {
      console.error('Error voting card:', error);
      toast({
        title: 'Error',
        description: 'Failed to vote on card',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('retrospective_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Card deleted successfully'
      });
      
      fetchCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete card',
        variant: 'destructive'
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const cardId = active.id as string;
    const targetColumnId = over.id as string;
    const card = cards.find(c => c.id === cardId);

    if (!card || card.column_id === targetColumnId) return;

    try {
      const { error } = await supabase
        .from('retrospective_cards')
        .update({ column_id: targetColumnId })
        .eq('id', cardId);

      if (error) {
        console.error('Error moving card:', error);
        toast({
          title: 'Error',
          description: 'Failed to move card: ' + error.message,
          variant: 'destructive'
        });
        return;
      }
      
      fetchCards();
      toast({
        title: 'Success',
        description: 'Card moved successfully'
      });
    } catch (error) {
      console.error('Error moving card:', error);
      toast({
        title: 'Error',
        description: 'Failed to move card',
        variant: 'destructive'
      });
    }
  };

  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRetrospective || !selectedCardForAction) return;

    try {
      // Create action item
      const { error: actionError } = await supabase
        .from('retrospective_action_items')
        .insert([{
          retrospective_id: selectedRetrospective.id,
          from_card_id: selectedCardForAction.id,
          what_task: actionForm.what_task,
          when_sprint: actionForm.when_sprint,
          who_responsible: actionForm.who_responsible,
          how_approach: actionForm.how_approach,
          backlog_ref_id: actionForm.backlog_ref_id,
          created_by: user.id
        }]);

      if (actionError) throw actionError;

      // Create task in backlog
      const { error: taskError } = await supabase
        .from('task_backlog')
        .insert([{
          project_id: projectId,
          title: actionForm.what_task,
          description: `From Retrospective: ${selectedCardForAction.text}\n\nApproach: ${actionForm.how_approach}`,
          source_type: 'retrospective',
          source_id: selectedCardForAction.id,
          created_by: user.id,
          priority: 'medium'
        }]);

      if (taskError) throw taskError;

      toast({
        title: 'Success',
        description: 'Action item created and added to backlog successfully'
      });

      setShowActionDialog(false);
      setActionForm({
        what_task: '',
        when_sprint: '',
        who_responsible: '',
        how_approach: '',
        backlog_ref_id: ''
      });
      setSelectedCardForAction(null);
      fetchActionItems();
    } catch (error) {
      console.error('Error creating action item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create action item',
        variant: 'destructive'
      });
    }
  };

  const getUserDisplayName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || profile?.email || 'Unknown User';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retrospectives</h1>
          <p className="text-muted-foreground">Reflect and improve with structured retrospectives</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Retrospective
        </Button>
      </div>

      {retrospectives.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No retrospectives yet</h3>
            <p className="text-muted-foreground mb-4">Create your first retrospective to start reflecting on your team's performance</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Retrospective
            </Button>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="board" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="board">Kanban Board</TabsTrigger>
              <TabsTrigger value="actions">Action Items</TabsTrigger>
            </TabsList>
            
            <Select 
              value={selectedRetrospective?.id || ''} 
              onValueChange={(value) => {
                const retro = retrospectives.find(r => r.id === value);
                setSelectedRetrospective(retro || null);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select retrospective" />
              </SelectTrigger>
              <SelectContent>
                {retrospectives.map((retro) => {
                  const iteration = iterations.find(i => i.id === retro.iteration_id);
                  return (
                    <SelectItem key={retro.id} value={retro.id}>
                      {iteration?.iteration_name || 'Unknown Iteration'} - {retro.framework}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="board" className="space-y-4">
            {selectedRetrospective && (
              <DndContext 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {columns.map((column) => {
                    const columnCards = cards
                      .filter(card => card.column_id === column.id)
                      .sort((a, b) => b.votes - a.votes);
                    
                    return (
                      <Card key={column.id} className="h-fit bg-gradient-to-br from-background to-muted/20 border-2 shadow-lg">
                        <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base font-bold text-primary">{column.title}</CardTitle>
                              {column.subtitle && (
                                <p className="text-xs text-muted-foreground mt-1 font-medium">{column.subtitle}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground"
                              onClick={() => {
                                setSelectedColumnId(column.id);
                                setShowCardDialog(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {columnCards.length} card{columnCards.length !== 1 ? 's' : ''}
                          </Badge>
                        </CardHeader>
                        <CardContent 
                          id={column.id}
                          className="space-y-3 p-4 min-h-[200px]"
                          style={{ 
                            background: `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.1) 100%)` 
                          }}
                        >
                          <SortableContext 
                            items={columnCards.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {columnCards.map((card, index) => (
                              <RetrospectiveCard
                                key={card.id}
                                card={card}
                                cardColor={getCardColor(index)}
                                userDisplayName={getUserDisplayName(card.created_by)}
                                onVote={() => handleVoteCard(card.id)}
                                onDelete={() => handleDeleteCard(card.id)}
                                onCreateAction={() => {
                                  setSelectedCardForAction(card);
                                  setShowActionDialog(true);
                                }}
                                isOwner={card.created_by === user?.id}
                              />
                            ))}
                          </SortableContext>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                <DragOverlay>
                  {activeId ? (
                    <div className="opacity-90">
                      {(() => {
                        const card = cards.find(c => c.id === activeId);
                        if (!card) return null;
                        const index = cards.findIndex(c => c.id === activeId);
                        return (
                          <RetrospectiveCard
                            card={card}
                            cardColor={getCardColor(index)}
                            userDisplayName={getUserDisplayName(card.created_by)}
                            onVote={() => {}}
                            onDelete={() => {}}
                            onCreateAction={() => {}}
                            isOwner={card.created_by === user?.id}
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {selectedRetrospective && (
              <Card>
                <CardHeader>
                  <CardTitle>Action Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {actionItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No action items yet. Create them from cards in the kanban board.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {actionItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{item.what_task}</h4>
                            <Badge variant={item.backlog_status === 'Open' ? 'default' : 'secondary'}>
                              {item.backlog_status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div><strong>When:</strong> {item.when_sprint || 'Not specified'}</div>
                            <div><strong>Who:</strong> {item.who_responsible || 'Not assigned'}</div>
                            <div><strong>Backlog ID:</strong> {item.backlog_ref_id || 'No reference'}</div>
                          </div>
                          {item.how_approach && (
                            <div className="mt-2 text-sm">
                              <strong>How:</strong> {item.how_approach}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Retrospective Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Retrospective</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRetrospective} className="space-y-4">
            <div>
              <Label htmlFor="iteration">Iteration</Label>
              <Select value={createForm.iteration_id} onValueChange={(value) => setCreateForm({ ...createForm, iteration_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an iteration" />
                </SelectTrigger>
                <SelectContent>
                  {iterations.map((iteration) => (
                    <SelectItem key={iteration.id} value={iteration.id}>
                      {iteration.iteration_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="framework">Framework</Label>
              <Select value={createForm.framework} onValueChange={(value) => setCreateForm({ ...createForm, framework: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Classic">Classic (What went well/didn't go well)</SelectItem>
                  <SelectItem value="KISS">KISS (Keep/Improve/Start/Stop)</SelectItem>
                  <SelectItem value="Sailboat">Sailboat (Wind/Anchor/Rocks/Island)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Retrospective</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div>
              <Label htmlFor="cardText">Card Text</Label>
              <Textarea
                id="cardText"
                value={cardForm.text}
                onChange={(e) => setCardForm({ text: e.target.value })}
                placeholder="Enter your feedback or idea..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCardDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Card</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Action Item Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Action Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateActionItem} className="space-y-4">
            <div>
              <Label htmlFor="whatTask">What (Task Description)</Label>
              <Textarea
                id="whatTask"
                value={actionForm.what_task}
                onChange={(e) => setActionForm({ ...actionForm, what_task: e.target.value })}
                placeholder="Describe what needs to be done..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="whenSprint">When (Sprint/Timeline)</Label>
                <Input
                  id="whenSprint"
                  value={actionForm.when_sprint}
                  onChange={(e) => setActionForm({ ...actionForm, when_sprint: e.target.value })}
                  placeholder="Sprint-07"
                />
              </div>
              <div>
                <Label htmlFor="who_responsible">Who (Responsible Person)</Label>
                <Select
                  value={actionForm.who_responsible}
                  onValueChange={(value) => setActionForm(prev => ({ ...prev, who_responsible: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select responsible person" />
                  </SelectTrigger>
                  <SelectContent>
                    {stakeholders.map((stakeholder) => (
                      <SelectItem key={stakeholder.id} value={stakeholder.name}>
                        <div className="flex flex-col">
                          <span>{stakeholder.name}</span>
                          {stakeholder.raci && (
                            <span className="text-xs text-muted-foreground">RACI: {stakeholder.raci}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="howApproach">How (Approach/Method)</Label>
              <Textarea
                id="howApproach"
                value={actionForm.how_approach}
                onChange={(e) => setActionForm({ ...actionForm, how_approach: e.target.value })}
                placeholder="Describe how this will be implemented..."
              />
            </div>
            <div>
              <Label htmlFor="backlogRef">Backlog Reference ID</Label>
              <Input
                id="backlogRef"
                value={actionForm.backlog_ref_id}
                onChange={(e) => setActionForm({ ...actionForm, backlog_ref_id: e.target.value })}
                placeholder="TBL-101"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowActionDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Action Item</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Mail, Building, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/simple-select';

import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';

interface StakeholdersManagementProps {
  projectId: string;
}

interface Stakeholder {
  id: string;
  project_id: string;
  name: string;
  email?: string;
  department?: string;
  raci?: 'Responsible' | 'Accountable' | 'Consulted' | 'Informed';
  influence_level?: 'Low' | 'Medium' | 'High' | 'Critical';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

const raciOptions = [
  { value: 'Responsible', label: 'Responsible' },
  { value: 'Accountable', label: 'Accountable' },
  { value: 'Consulted', label: 'Consulted' },
  { value: 'Informed', label: 'Informed' }
];

const influenceOptions = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' }
];

export function StakeholdersManagement({ projectId }: StakeholdersManagementProps) {
  const { user } = useApiAuth();
  const { toast } = useToast();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    raci: '',
    influence_level: '',
    notes: ''
  });

  useEffect(() => {
    fetchStakeholders();
  }, [projectId]);

  const fetchStakeholders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStakeholders(projectId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch stakeholders');
      }
      
      setStakeholders(response.data?.stakeholders || []);
    } catch (error: any) {
      toast({
        title: "Error loading stakeholders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    try {
      if (editingStakeholder) {
        const response = await apiClient.updateStakeholder(projectId, editingStakeholder.id, {
          name: formData.name,
          email: formData.email || undefined,
          department: formData.department || undefined,
          raci: formData.raci || undefined,
          influence_level: formData.influence_level || undefined,
          notes: formData.notes || undefined
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to update stakeholder');
        }
        
        toast({
          title: "Stakeholder updated",
          description: "Stakeholder information has been updated successfully.",
        });
      } else {
        const response = await apiClient.createStakeholder(projectId, {
          name: formData.name,
          email: formData.email || undefined,
          department: formData.department || undefined,
          raci: formData.raci || undefined,
          influenceLevel: formData.influence_level || undefined,
          notes: formData.notes || undefined
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to create stakeholder');
        }
        
        toast({
          title: "Stakeholder added",
          description: "New stakeholder has been added to the project.",
        });
      }

      resetForm();
      fetchStakeholders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (stakeholderId: string) => {
    try {
      const response = await apiClient.deleteStakeholder(projectId, stakeholderId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete stakeholder');
      }
      
      toast({
        title: "Stakeholder deleted",
        description: "Stakeholder has been removed from the project.",
      });
      
      fetchStakeholders();
    } catch (error: any) {
      toast({
        title: "Error deleting stakeholder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      department: '',
      raci: '',
      influence_level: '',
      notes: ''
    });
    setIsAddingStakeholder(false);
    setEditingStakeholder(null);
  };

  const openEditDialog = (stakeholder: Stakeholder) => {
    setFormData({
      name: stakeholder.name,
      email: stakeholder.email || '',
      department: stakeholder.department || '',
      raci: stakeholder.raci || '',
      influence_level: stakeholder.influence_level || '',
      notes: stakeholder.notes || ''
    });
    setEditingStakeholder(stakeholder);
    setIsAddingStakeholder(true);
  };

  const filteredStakeholders = stakeholders.filter(stakeholder =>
    stakeholder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stakeholder.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stakeholder.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRaciBadgeVariant = (raci?: string) => {
    switch (raci) {
      case 'Responsible': return 'default';
      case 'Accountable': return 'secondary';
      case 'Consulted': return 'outline';
      case 'Informed': return 'secondary';
      default: return 'outline';
    }
  };

  const getInfluenceBadgeVariant = (influence?: string) => {
    switch (influence) {
      case 'Critical': return 'destructive';
      case 'High': return 'default';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
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
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Stakeholders</h1>
            <p className="text-sm text-muted-foreground">Manage project stakeholders and team members</p>
          </div>
          <Dialog open={isAddingStakeholder} onOpenChange={setIsAddingStakeholder}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddingStakeholder(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Stakeholder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter stakeholder name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Enter department"
                    />
                  </div>
                  <div>
                    <Label htmlFor="raci">RACI Level</Label>
                    <SimpleSelect
                      value={formData.raci}
                      onValueChange={(value) => setFormData({ ...formData, raci: value })}
                      placeholder="Select RACI level"
                    >
                      {raciOptions.map(option => (
                        <SimpleSelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SimpleSelectItem>
                      ))}
                    </SimpleSelect>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="influence">Influence Level</Label>
                  <SimpleSelect
                    value={formData.influence_level}
                    onValueChange={(value) => setFormData({ ...formData, influence_level: value })}
                    placeholder="Select influence level"
                  >
                    {influenceOptions.map(option => (
                      <SimpleSelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SimpleSelectItem>
                    ))}
                  </SimpleSelect>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStakeholder ? 'Update' : 'Add'} Stakeholder
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search stakeholders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Stakeholders Table */}
          {filteredStakeholders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No stakeholders yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add stakeholders to track project participants and assign tasks.
                </p>
                <Button onClick={() => setIsAddingStakeholder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stakeholder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Project Stakeholders ({filteredStakeholders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>RACI</TableHead>
                      <TableHead>Influence</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStakeholders.map((stakeholder) => (
                      <TableRow key={stakeholder.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {stakeholder.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{stakeholder.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {stakeholder.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{stakeholder.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stakeholder.department ? (
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{stakeholder.department}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stakeholder.raci ? (
                            <Badge variant={getRaciBadgeVariant(stakeholder.raci)}>
                              {stakeholder.raci}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stakeholder.influence_level ? (
                            <Badge variant={getInfluenceBadgeVariant(stakeholder.influence_level)}>
                              {stakeholder.influence_level}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stakeholder.notes ? (
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {stakeholder.notes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(stakeholder)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Stakeholder</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {stakeholder.name} from this project? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(stakeholder.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
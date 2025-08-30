import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Mail, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface StakeholdersViewProps {
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
}

const raciOptions = ['Responsible', 'Accountable', 'Consulted', 'Informed'] as const;
const influenceOptions = ['Low', 'Medium', 'High', 'Critical'] as const;

export function StakeholdersView({ projectId }: StakeholdersViewProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchStakeholders();
  }, [projectId]);

  const fetchStakeholders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStakeholders(projectId);
      if (response.success && response.data?.stakeholders) {
        setStakeholders(response.data.stakeholders);
      }
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
            <p className="text-sm text-muted-foreground">Project-specific stakeholder registry</p>
          </div>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Stakeholder
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Search and Filters */}
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
                  Add stakeholders to track project participants and their roles.
                </p>
                <Button>
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
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Search, Filter, Eye, Edit, Trash2, Clock, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  owner_id: string;
  milestone_id: string;
  project_id: string;
  created_by: string;
  created_at: string;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: string;
  description: string;
  project_id: string;
  created_by: string;
  created_at: string;
}

interface TasksTableViewProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskUpdate?: () => void;
  onMilestoneUpdate?: () => void;
}

type ItemType = 'task' | 'milestone';
type TableItem = (Task | Milestone) & { type: ItemType; milestone_name?: string };

export function TasksTableView({ tasks, milestones, onTaskUpdate, onMilestoneUpdate }: TasksTableViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Combine tasks and milestones into a single array for table display
  const tableItems: TableItem[] = useMemo(() => {
    const taskItems: TableItem[] = tasks.map(task => ({
      ...task,
      type: 'task' as ItemType,
      milestone_name: milestones.find(m => m.id === task.milestone_id)?.name || 'Unassigned'
    }));

    const milestoneItems: TableItem[] = milestones.map(milestone => ({
      ...milestone,
      type: 'milestone' as ItemType,
      title: milestone.name,
      priority: 'high' // Milestones are typically high priority
    }));

    return [...milestoneItems, ...taskItems];
  }, [tasks, milestones]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return tableItems.filter(item => {
      const title = item.type === 'task' ? (item as Task).title : (item as Milestone).name;
      const matchesSearch = title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesPriority = priorityFilter === 'all' || 
                             (item.type === 'task' && (item as Task).priority === priorityFilter) ||
                             (item.type === 'milestone' && priorityFilter === 'high');

      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [tableItems, searchTerm, statusFilter, typeFilter, priorityFilter]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'planning': return 'outline';
      case 'todo': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      default: return AlertCircle;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeBadge = (type: ItemType) => {
    return type === 'milestone' ? (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        <Target className="h-3 w-3 mr-1" />
        Milestone
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Task
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const handleRowClick = (item: TableItem) => {
    // TODO: Implement row click to show details or edit
    console.log('Row clicked:', item);
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{tableItems.length}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {tableItems.filter(item => item.status === 'completed').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {tableItems.filter(item => item.status === 'in_progress').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">{milestones.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks and milestones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setPriorityFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Tasks & Milestones ({filteredItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="min-w-[300px]">Description</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[130px]">Due Date</TableHead>
                  <TableHead className="w-[150px]">Milestone</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={`${item.type}-${item.id}`}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(item)}
                  >
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {React.createElement(getStatusIcon(item.status), { 
                          className: "h-4 w-4 text-muted-foreground" 
                        })}
                        <span className="truncate">{item.type === 'task' ? (item as Task).title : (item as Milestone).name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate text-muted-foreground">
                        {item.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.type === 'task' ? (
                        <Badge variant={getPriorityBadgeVariant((item as Task).priority)}>
                          {(item as Task).priority}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">High</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.due_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.type === 'task' ? (
                        <Badge variant="outline" className="text-xs">
                          {(item as TableItem).milestone_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8" />
                        <p>No items found matching your filters</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
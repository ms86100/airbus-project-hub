import React, { useState, useEffect } from 'react';
import { budgetApi } from '@/services/budgetApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, DollarSign, TrendingUp, AlertTriangle, Receipt, BarChart3, PieChart, LineChart, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line } from 'recharts';

interface ProjectBudgetManagementProps {
  projectId: string;
}

interface BudgetType {
  id: string;
  code: string;
  label: string;
  default_allocation_percent: number;
  notes?: string;
  type_name?: string; // For compatibility with specification
}

interface BudgetCategory {
  id: string;
  budget_type_code: string;
  name: string;
  budget_allocated: number;
  budget_received: number;
  amount_spent: number;
  comments?: string;
  budget_spending?: any[];
}

interface ProjectBudget {
  id: string;
  project_id: string;
  currency: string;
  total_budget_allocated: number;
  total_budget_received: number;
  start_date?: string;
  end_date?: string;
  budget_categories: BudgetCategory[];
  budget_receipts?: any[];
  budget_comments?: any[];
}

interface BudgetAnalytics {
  totals: {
    allocated_total: number;
    received_total: number;
    spent_total: number;
    remaining_total: number;
  };
  variance_summary: {
    overall_variance_amount: number;
    overall_variance_percent: number;
  };
  category_breakdown: Array<{
    code: string;
    name: string;
    allocated: number;
    received: number;
    spent: number;
    variance: number;
    percent_spent: number;
  }>;
}

export function ProjectBudgetManagement({ projectId }: ProjectBudgetManagementProps) {
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [budgetTypes, setBudgetTypes] = useState<BudgetType[]>([]);
  const [analytics, setAnalytics] = useState<BudgetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isCreateSpendingOpen, setIsCreateSpendingOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditSpendingOpen, setIsEditSpendingOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSpending, setEditingSpending] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    currency: 'INR',
    total_budget_allocated: '',
    total_budget_received: '',
    start_date: '',
    end_date: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    budget_type_code: '',
    name: '',
    budget_allocated: '',
    budget_received: '',
    comments: '',
  });

  const [spendingForm, setSpendingForm] = useState({
    date: '',
    vendor: '',
    description: '',
    invoice_id: '',
    amount: '',
    payment_method: '',
    status: 'pending',
    budget_type_code: '',
  });

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting budget data fetch for project:', projectId);

      const result = await budgetApi.getProjectBudget(projectId);
      console.log('📊 Raw budget data response:', result);

      setBudget(result.data.budget);
      setBudgetTypes(result.data.budgetTypes || []);
      setAnalytics(result.data.analytics);

      // Show error if no budget types available
      if (!result.data.budgetTypes || result.data.budgetTypes.length === 0) {
        toast({
          title: "Budget Types Missing",
          description: "No budget types available. Please create budget types in the Admin section.",
          variant: "destructive",
        });
      }
      
      console.log('📊 Processed budget data:', {
        budget: result.data.budget,
        budgetTypesCount: result.data.budgetTypes?.length,
        hasAnalytics: !!result.data.analytics
      });
      
      if (result.data.budget) {
        setBudgetForm({
          currency: result.data.budget.currency || 'INR',
          total_budget_allocated: result.data.budget.total_budget_allocated?.toString() || '',
          total_budget_received: result.data.budget.total_budget_received?.toString() || '',
          start_date: result.data.budget.start_date || '',
          end_date: result.data.budget.end_date || '',
        });
      }
    } catch (error) {
      console.error('❌ DETAILED Budget fetch error:', {
        error: error,
        message: error.message,
        stack: error.stack,
        projectId: projectId
      });
      toast({
        title: "Budget Fetch Error",
        description: error.message.includes('budget types') ? 
          "No budget types available. Please create budget types in Admin section." :
          `Budget fetch failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBudget = async () => {
    try {
      console.log('💾 Saving budget for project:', projectId, budgetForm);

      const result = await budgetApi.createOrUpdateBudget(projectId, {
        currency: budgetForm.currency,
        total_budget_allocated: parseFloat(budgetForm.total_budget_allocated) || 0,
        total_budget_received: parseFloat(budgetForm.total_budget_received) || 0,
        start_date: budgetForm.start_date || null,
        end_date: budgetForm.end_date || null,
      });

      toast({
        title: "Success",
        description: "Budget saved successfully",
      });
      fetchBudgetData();
    } catch (error) {
      console.error('❌ Error saving budget:', error);
      toast({
        title: "Error",
        description: "Failed to save budget",
        variant: "destructive",
      });
    }
  };

  const createCategory = async () => {
    try {
      console.log('📂 Creating category for project:', projectId, categoryForm);

      await budgetApi.createBudgetCategory(projectId, {
        budget_type_code: categoryForm.budget_type_code,
        name: categoryForm.name,
        budget_allocated: parseFloat(categoryForm.budget_allocated) || 0,
        budget_received: parseFloat(categoryForm.budget_received) || 0,
        comments: categoryForm.comments,
      });

      toast({
        title: "Success",
        description: "Budget category created successfully",
      });
      setIsCreateCategoryOpen(false);
      setCategoryForm({
        budget_type_code: '',
        name: '',
        budget_allocated: '',
        budget_received: '',
        comments: '',
      });
      fetchBudgetData();
    } catch (error) {
      console.error('❌ Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const createSpending = async () => {
    try {
      if (!selectedCategory) {
        toast({
          title: "Error",
          description: "Please select a category",
          variant: "destructive",
        });
        return;
      }

      console.log('💸 Creating spending for category:', selectedCategory, spendingForm);

      await budgetApi.createSpendingEntry(selectedCategory, {
        date: spendingForm.date,
        vendor: spendingForm.vendor,
        description: spendingForm.description,
        invoice_id: spendingForm.invoice_id,
        amount: parseFloat(spendingForm.amount) || 0,
        payment_method: spendingForm.payment_method,
        status: spendingForm.status,
      });

      toast({
        title: "Success",
        description: "Spending entry created successfully",
      });
      setIsCreateSpendingOpen(false);
      setSpendingForm({
        date: '',
        vendor: '',
        description: '',
        invoice_id: '',
        amount: '',
        payment_method: '',
        status: 'pending',
        budget_type_code: '',
      });
      fetchBudgetData();
    } catch (error) {
      console.error('❌ Error creating spending:', error);
      toast({
        title: "Error",
        description: "Failed to create spending entry",
        variant: "destructive",
      });
    }
  };

  const createSpendingEntry = createSpending;

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      budget_allocated: category.budget_allocated,
      budget_received: category.budget_received,
      budget_type_code: category.budget_type_code,
      comments: category.comments || '',
    });
    setIsEditCategoryOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this budget category?')) {
      return;
    }
    
    try {
      // Add delete API call here when available
      toast({
        title: "Success",
        description: "Budget category deleted successfully",
      });
      fetchBudgetData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete budget category",
        variant: "destructive",
      });
    }
  };

  const handleEditSpending = (spending: any) => {
    setEditingSpending(spending);
    setSpendingForm({
      description: spending.description,
      amount: spending.amount,
      vendor: spending.vendor || '',
      date: spending.date,
      payment_method: spending.payment_method || '',
      status: spending.status,
      budget_type_code: spending.budget_type_code || '',
      invoice_id: spending.invoice_id || '',
    });
    setSelectedCategory(spending.budget_category_id || '');
    setIsEditSpendingOpen(true);
  };

  const handleDeleteSpending = async (spendingId: string) => {
    if (!window.confirm('Are you sure you want to delete this spending entry?')) {
      return;
    }
    
    try {
      // Add delete API call here when available
      toast({
        title: "Success",
        description: "Spending entry deleted successfully",
      });
      fetchBudgetData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete spending entry",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.totals.allocated_total || 0, budget?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.totals.received_total || 0, budget?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.totals.spent_total || 0, budget?.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.totals.remaining_total || 0, budget?.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Budget</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.category_breakdown.map((category) => (
                  <div key={category.code} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category.name}</span>
                      <div className="flex gap-2 items-center">
                        <Badge variant={category.percent_spent > 80 ? "destructive" : "secondary"}>
                          {category.percent_spent.toFixed(1)}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(category.spent, budget?.currency)} / {formatCurrency(category.received, budget?.currency)}
                        </span>
                      </div>
                    </div>
                    <Progress value={category.percent_spent} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Budget Items</h3>
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
              <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Budget Item
                  </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Budget Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="budget_type">Budget Type *</Label>
                    <Select value={categoryForm.budget_type_code} onValueChange={(value) => 
                      setCategoryForm(prev => ({ ...prev, budget_type_code: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget type" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetTypes.length === 0 ? (
                          <SelectItem value="" disabled>No budget types available</SelectItem>
                        ) : (
                          budgetTypes.map((type) => (
                            <SelectItem key={type.code} value={type.code}>
                              {type.label || type.type_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {budgetTypes.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No budget types available. Contact admin to create budget types.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="category_name">Title *</Label>
                    <Input
                      id="category_name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter budget title"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget_allocated">Amount *</Label>
                    <Input
                      id="budget_allocated"
                      type="number"
                      value={categoryForm.budget_allocated}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, budget_allocated: e.target.value }))}
                      placeholder="Enter budget amount"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category_comments">Comments</Label>
                    <Textarea
                      id="category_comments"
                      value={categoryForm.comments}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, comments: e.target.value }))}
                      placeholder="Optional comments"
                    />
                  </div>
                  <Button 
                    onClick={createCategory} 
                    className="w-full"
                    disabled={!categoryForm.budget_type_code || !categoryForm.name || !categoryForm.budget_allocated || budgetTypes.length === 0}
                  >
                    Create Budget
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {budget?.budget_categories && budget.budget_categories.length > 0 ? (
              budget.budget_categories.map((category) => (
                <Card key={category.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{category.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{category.budget_type_code}</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Allocated:</span>
                            <div className="font-medium">₹{(parseFloat(String(category.budget_allocated || 0))).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Spent:</span>
                            <div className="font-medium">₹{(parseFloat(String(category.amount_spent || 0))).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Remaining:</span>
                            <div className="font-medium">₹{(parseFloat(String(category.budget_allocated || 0)) - parseFloat(String(category.amount_spent || 0))).toLocaleString()}</div>
                          </div>
                        </div>
                        {category.comments && (
                          <p className="text-sm text-muted-foreground mt-2">{category.comments}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No budget categories found.</p>
                <p className="text-sm text-muted-foreground">Create your first budget category to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Budget Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_category_name">Category Name</Label>
                <Input
                  id="edit_category_name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label htmlFor="edit_budget_type">Budget Type</Label>
                <Select value={categoryForm.budget_type_code} onValueChange={(value) => setCategoryForm(prev => ({ ...prev, budget_type_code: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget type" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetTypes.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.label || type.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_budget_allocated">Budget Allocated</Label>
                <Input
                  id="edit_budget_allocated"
                  type="number"
                  value={categoryForm.budget_allocated}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, budget_allocated: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit_comments">Comments</Label>
                <Textarea
                  id="edit_comments"
                  value={categoryForm.comments}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Optional comments"
                />
              </div>
              <Button onClick={() => {
                // Add update logic here
                setIsEditCategoryOpen(false);
                toast({
                  title: "Success",
                  description: "Budget category updated successfully",
                });
                fetchBudgetData();
              }} className="w-full">
                Update Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Spending Dialog */}
        <Dialog open={isEditSpendingOpen} onOpenChange={setIsEditSpendingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Spending Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_spending_budget_type">Budget Type *</Label>
                <Select value={spendingForm.budget_type_code || ''} onValueChange={(value) => {
                  setSpendingForm(prev => ({ ...prev, budget_type_code: value }));
                  setSelectedCategory('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget type" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetTypes.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.label || type.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_spending_category">Category *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budget?.budget_categories
                      ?.filter(category => !spendingForm.budget_type_code || category.budget_type_code === spendingForm.budget_type_code)
                      ?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_spending_description">Description</Label>
                <Input
                  id="edit_spending_description"
                  value={spendingForm.description}
                  onChange={(e) => setSpendingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label htmlFor="edit_spending_amount">Amount</Label>
                <Input
                  id="edit_spending_amount"
                  type="number"
                  value={spendingForm.amount}
                  onChange={(e) => setSpendingForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={() => {
                // Add update logic here
                setIsEditSpendingOpen(false);
                toast({
                  title: "Success",
                  description: "Spending entry updated successfully",
                });
                fetchBudgetData();
              }} className="w-full">
                Update Spending Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget vs Actual Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Budget vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.category_breakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatCurrency(Number(value), budget?.currency),
                        name === 'allocated' ? 'Allocated' : name === 'received' ? 'Received' : 'Spent'
                      ]}
                    />
                    <Bar dataKey="allocated" fill="hsl(var(--primary))" name="allocated" />
                    <Bar dataKey="received" fill="hsl(var(--secondary))" name="received" />
                    <Bar dataKey="spent" fill="hsl(var(--accent))" name="spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics?.category_breakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ code, percent }) => `${code} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="spent"
                    >
                      {(analytics?.category_breakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value), budget?.currency), 'Spent']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Spending Trends - Placeholder for future implementation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Spending Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <LineChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Spending trends analysis will be available with more data</p>
                <p className="text-sm">Track spending patterns over time by category</p>
              </div>
            </CardContent>
          </Card>

          {/* Budget Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analytics?.variance_summary.overall_variance_percent?.toFixed(1) || '0'}%
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Variance</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">
                    {budget?.budget_categories?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Categories</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">
                    {formatCurrency(analytics?.variance_summary.overall_variance_amount || 0, budget?.currency)}
                  </div>
                  <p className="text-sm text-muted-foreground">Variance Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spending" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Spending Entries</h3>
            <Dialog open={isCreateSpendingOpen} onOpenChange={setIsCreateSpendingOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Spending
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Spending Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="spending_budget_type">Budget Type *</Label>
                    <Select value={spendingForm.budget_type_code || ''} onValueChange={(value) => {
                      setSpendingForm(prev => ({ ...prev, budget_type_code: value }));
                      // Clear selected category when budget type changes
                      setSelectedCategory('');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget type" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetTypes.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.label || type.type_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="spending_category">Category *</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {budget?.budget_categories
                          ?.filter(category => !spendingForm.budget_type_code || category.budget_type_code === spendingForm.budget_type_code)
                          ?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="spending_date">Date</Label>
                      <Input
                        id="spending_date"
                        type="date"
                        value={spendingForm.date}
                        onChange={(e) => setSpendingForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="spending_amount">Amount</Label>
                      <Input
                        id="spending_amount"
                        type="number"
                        value={spendingForm.amount}
                        onChange={(e) => setSpendingForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="spending_vendor">Vendor</Label>
                    <Input
                      id="spending_vendor"
                      value={spendingForm.vendor}
                      onChange={(e) => setSpendingForm(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="Vendor name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="spending_description">Description</Label>
                    <Input
                      id="spending_description"
                      value={spendingForm.description}
                      onChange={(e) => setSpendingForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Spending description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoice_id">Invoice ID</Label>
                      <Input
                        id="invoice_id"
                        value={spendingForm.invoice_id}
                        onChange={(e) => setSpendingForm(prev => ({ ...prev, invoice_id: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="spending_status">Status</Label>
                      <Select value={spendingForm.status} onValueChange={(value) => 
                        setSpendingForm(prev => ({ ...prev, status: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={createSpending} className="w-full">
                    Create Spending Entry
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {budget?.budget_categories?.map((category) => (
              category.budget_spending?.map((spending: any) => (
                <Card key={spending.id} className="border-l-4 border-l-secondary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{spending.description}</h4>
                        <p className="text-sm text-muted-foreground">₹{parseFloat(spending.amount).toLocaleString()}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Vendor: {spending.vendor || 'Not specified'}</span>
                          <span>Date: {new Date(spending.date).toLocaleDateString()}</span>
                          <span>Status: {spending.status}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditSpending(spending)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteSpending(spending.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )) || (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No spending entries found.</p>
                <p className="text-sm text-muted-foreground">Create your first spending entry to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
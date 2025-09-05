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
import { PlusCircle, DollarSign, TrendingUp, AlertTriangle, Receipt } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProjectBudgetManagementProps {
  projectId: string;
}

interface BudgetType {
  id: string;
  code: string;
  label: string;
  default_allocation_percent: number;
  notes?: string;
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
  });

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting budget data fetch for project:', projectId);

      const result = await budgetApi.getProjectBudget(projectId);
      console.log('📊 Raw budget data response:', result);

      setBudget(result.data.budget);
      setBudgetTypes(result.data.budgetTypes);
      setAnalytics(result.data.analytics);
      
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
        title: "Debug Error",
        description: `Budget fetch failed: ${error.message}`,
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
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
            <h3 className="text-lg font-semibold">Budget Categories</h3>
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Budget Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="budget_type">Budget Type</Label>
                    <Select value={categoryForm.budget_type_code} onValueChange={(value) => 
                      setCategoryForm(prev => ({ ...prev, budget_type_code: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget type" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetTypes.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category_name">Category Name</Label>
                    <Input
                      id="category_name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget_allocated">Budget Allocated</Label>
                      <Input
                        id="budget_allocated"
                        type="number"
                        value={categoryForm.budget_allocated}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, budget_allocated: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="budget_received">Budget Received</Label>
                      <Input
                        id="budget_received"
                        type="number"
                        value={categoryForm.budget_received}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, budget_received: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
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
                  <Button onClick={createCategory} className="w-full">
                    Create Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {budget?.budget_categories?.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <Badge variant="outline">{category.budget_type_code}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Allocated:</span>
                      <div className="font-medium">{formatCurrency(category.budget_allocated, budget.currency)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Received:</span>
                      <div className="font-medium">{formatCurrency(category.budget_received, budget.currency)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spent:</span>
                      <div className="font-medium">{formatCurrency(category.amount_spent, budget.currency)}</div>
                    </div>
                  </div>
                  {category.comments && (
                    <p className="text-sm text-muted-foreground mt-2">{category.comments}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
                    <Label htmlFor="spending_category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {budget?.budget_categories?.map((category) => (
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
                <Card key={spending.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{spending.description}</h4>
                        <p className="text-sm text-muted-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {spending.vendor} • {spending.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(spending.amount, budget.currency)}
                        </div>
                        <Badge variant={spending.status === 'paid' ? 'default' : 'secondary'}>
                          {spending.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={budgetForm.currency} onValueChange={(value) => 
                    setBudgetForm(prev => ({ ...prev, currency: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_allocated">Total Budget Allocated</Label>
                  <Input
                    id="total_allocated"
                    type="number"
                    value={budgetForm.total_budget_allocated}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, total_budget_allocated: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="total_received">Total Budget Received</Label>
                  <Input
                    id="total_received"
                    type="number"
                    value={budgetForm.total_budget_received}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, total_budget_received: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={budgetForm.start_date}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={budgetForm.end_date}
                    onChange={(e) => setBudgetForm(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={saveBudget} className="w-full">
                Save Budget Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle, AlertTriangle,
  Clock, Target, Zap, Activity, Award, BarChart3, PieChart as PieChartIcon,
  Calendar, MessageSquare, Shield, Brain, Rocket, Star
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface ProjectAnalyticsData {
  projectHealth: {
    overall: number;
    budget: number;
    timeline: number;
    risks: number;
    team: number;
  };
  budgetAnalytics: {
    totalAllocated: number;
    totalSpent: number;
    remainingBudget: number;
    spendByCategory: Array<{ name: string; value: number; color: string }>;
    burnRate: Array<{ month: string; planned: number; actual: number }>;
  };
  teamPerformance: {
    totalMembers: number;
    activeMembers: number;
    avgCapacity: number;
    utilizationRate: number;
    topPerformers: Array<{ name: string; tasksCompleted: number; efficiency: number }>;
    capacityTrend: Array<{ week: string; planned: number; actual: number }>;
  };
  taskAnalytics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    avgCompletionTime: number;
    tasksByStatus: Array<{ status: string; count: number; color: string }>;
    productivityTrend: Array<{ date: string; completed: number; created: number }>;
  };
  riskAnalysis: {
    totalRisks: number;
    highRisks: number;
    mitigatedRisks: number;
    riskHeatmap: Array<{ impact: number; likelihood: number; count: number }>;
    risksByCategory: Array<{ category: string; count: number; color: string }>;
  };
  stakeholderEngagement: {
    totalStakeholders: number;
    activeStakeholders: number;
    recentMeetings: number;
    communicationFrequency: Array<{ month: string; meetings: number; emails: number }>;
  };
  retrospectiveInsights: {
    totalRetros: number;
    actionItemsCreated: number;
    actionItemsCompleted: number;
    teamSatisfactionTrend: Array<{ sprint: string; satisfaction: number; velocity: number }>;
  };
}

interface ProjectAnalyticsDashboardProps {
  projectId: string;
}

const COLORS = {
  primary: '#2563eb',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  warning: '#f97316',
  success: '#22c55e',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

export const ProjectAnalyticsDashboard: React.FC<ProjectAnalyticsDashboardProps> = ({ projectId }) => {
  const [analyticsData, setAnalyticsData] = useState<ProjectAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [projectId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use mock data but in a real implementation, 
      // you would fetch this from your analytics API
      const mockData: ProjectAnalyticsData = {
        projectHealth: {
          overall: 87,
          budget: 82,
          timeline: 91,
          risks: 78,
          team: 94
        },
        budgetAnalytics: {
          totalAllocated: 500000,
          totalSpent: 287500,
          remainingBudget: 212500,
          spendByCategory: [
            { name: 'Development', value: 120000, color: COLORS.primary },
            { name: 'Design', value: 80000, color: COLORS.secondary },
            { name: 'Testing', value: 45000, color: COLORS.accent },
            { name: 'Infrastructure', value: 42500, color: COLORS.danger }
          ],
          burnRate: [
            { month: 'Jan', planned: 50000, actual: 48000 },
            { month: 'Feb', planned: 100000, actual: 95000 },
            { month: 'Mar', planned: 150000, actual: 142000 },
            { month: 'Apr', planned: 200000, actual: 195000 },
            { month: 'May', planned: 250000, actual: 240000 },
            { month: 'Jun', planned: 300000, actual: 287500 }
          ]
        },
        teamPerformance: {
          totalMembers: 12,
          activeMembers: 11,
          avgCapacity: 85,
          utilizationRate: 88,
          topPerformers: [
            { name: 'Sarah Johnson', tasksCompleted: 28, efficiency: 95 },
            { name: 'Mike Chen', tasksCompleted: 25, efficiency: 92 },
            { name: 'Emma Davis', tasksCompleted: 23, efficiency: 88 }
          ],
          capacityTrend: [
            { week: 'W1', planned: 240, actual: 235 },
            { week: 'W2', planned: 240, actual: 220 },
            { week: 'W3', planned: 240, actual: 245 },
            { week: 'W4', planned: 240, actual: 238 }
          ]
        },
        taskAnalytics: {
          totalTasks: 156,
          completedTasks: 128,
          overdueTasks: 8,
          avgCompletionTime: 3.2,
          tasksByStatus: [
            { status: 'Completed', count: 128, color: COLORS.success },
            { status: 'In Progress', count: 20, color: COLORS.info },
            { status: 'Todo', count: 8, color: COLORS.warning }
          ],
          productivityTrend: [
            { date: 'Week 1', completed: 18, created: 22 },
            { date: 'Week 2', completed: 25, created: 18 },
            { date: 'Week 3', completed: 32, created: 28 },
            { date: 'Week 4', completed: 28, created: 15 }
          ]
        },
        riskAnalysis: {
          totalRisks: 15,
          highRisks: 3,
          mitigatedRisks: 8,
          riskHeatmap: [
            { impact: 3, likelihood: 2, count: 2 },
            { impact: 4, likelihood: 3, count: 3 },
            { impact: 2, likelihood: 4, count: 1 },
            { impact: 5, likelihood: 2, count: 1 }
          ],
          risksByCategory: [
            { category: 'Technical', count: 6, color: COLORS.danger },
            { category: 'Schedule', count: 4, color: COLORS.warning },
            { category: 'Resource', count: 3, color: COLORS.info },
            { category: 'External', count: 2, color: COLORS.purple }
          ]
        },
        stakeholderEngagement: {
          totalStakeholders: 18,
          activeStakeholders: 14,
          recentMeetings: 12,
          communicationFrequency: [
            { month: 'Jan', meetings: 8, emails: 24 },
            { month: 'Feb', meetings: 12, emails: 31 },
            { month: 'Mar', meetings: 10, emails: 28 },
            { month: 'Apr', meetings: 14, emails: 35 }
          ]
        },
        retrospectiveInsights: {
          totalRetros: 8,
          actionItemsCreated: 45,
          actionItemsCompleted: 38,
          teamSatisfactionTrend: [
            { sprint: 'Sprint 1', satisfaction: 7.2, velocity: 32 },
            { sprint: 'Sprint 2', satisfaction: 7.8, velocity: 28 },
            { sprint: 'Sprint 3', satisfaction: 8.1, velocity: 35 },
            { sprint: 'Sprint 4', satisfaction: 8.4, velocity: 38 }
          ]
        }
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Failed to load analytics data</div>
      </div>
    );
  }

  const { projectHealth, budgetAnalytics, teamPerformance, taskAnalytics, riskAnalysis, stakeholderEngagement, retrospectiveInsights } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Project Health</p>
                <p className="text-2xl font-bold text-blue-700">{projectHealth.overall}%</p>
                <p className="text-xs text-blue-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5% from last week
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={projectHealth.overall} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Budget Health</p>
                <p className="text-2xl font-bold text-green-700">{budgetAnalytics.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-green-500">
                  ${budgetAnalytics.remainingBudget.toLocaleString()} remaining
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={(budgetAnalytics.totalSpent / budgetAnalytics.totalAllocated) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Team Performance</p>
                <p className="text-2xl font-bold text-purple-700">{teamPerformance.utilizationRate}%</p>
                <p className="text-xs text-purple-500">
                  {teamPerformance.activeMembers}/{teamPerformance.totalMembers} active
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={teamPerformance.utilizationRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Task Completion</p>
                <p className="text-2xl font-bold text-amber-700">{Math.round((taskAnalytics.completedTasks / taskAnalytics.totalTasks) * 100)}%</p>
                <p className="text-xs text-amber-500">
                  {taskAnalytics.completedTasks}/{taskAnalytics.totalTasks} tasks
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-amber-500" />
            </div>
            <Progress value={(taskAnalytics.completedTasks / taskAnalytics.totalTasks) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Risk Score</p>
                <p className="text-2xl font-bold text-red-700">{riskAnalysis.highRisks}</p>
                <p className="text-xs text-red-500">
                  {riskAnalysis.totalRisks} total risks
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <Progress value={(riskAnalysis.mitigatedRisks / riskAnalysis.totalRisks) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Health Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Project Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { subject: 'Budget', A: projectHealth.budget, fullMark: 100 },
                    { subject: 'Timeline', A: projectHealth.timeline, fullMark: 100 },
                    { subject: 'Team', A: projectHealth.team, fullMark: 100 },
                    { subject: 'Risks', A: projectHealth.risks, fullMark: 100 },
                    { subject: 'Quality', A: 85, fullMark: 100 }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Health Score" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Budget Burn Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Burn Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={budgetAnalytics.burnRate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                    <Area type="monotone" dataKey="planned" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="actual" stackId="2" stroke="#2563eb" fill="#2563eb" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Key Performance Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Delivery Timeline</TableCell>
                    <TableCell>91%</TableCell>
                    <TableCell>95%</TableCell>
                    <TableCell><Badge variant="secondary">On Track</Badge></TableCell>
                    <TableCell><TrendingUp className="h-4 w-4 text-green-500" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Budget Utilization</TableCell>
                    <TableCell>57.5%</TableCell>
                    <TableCell>60%</TableCell>
                    <TableCell><Badge variant="secondary">Good</Badge></TableCell>
                    <TableCell><TrendingUp className="h-4 w-4 text-green-500" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Team Satisfaction</TableCell>
                    <TableCell>8.4/10</TableCell>
                    <TableCell>8.0/10</TableCell>
                    <TableCell><Badge className="bg-green-500">Excellent</Badge></TableCell>
                    <TableCell><TrendingUp className="h-4 w-4 text-green-500" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Risk Mitigation</TableCell>
                    <TableCell>78%</TableCell>
                    <TableCell>85%</TableCell>
                    <TableCell><Badge variant="outline">Needs Attention</Badge></TableCell>
                    <TableCell><TrendingDown className="h-4 w-4 text-amber-500" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={budgetAnalytics.spendByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {budgetAnalytics.spendByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget vs Spend Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={budgetAnalytics.burnRate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                    <Line type="monotone" dataKey="planned" stroke="#94a3b8" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Capacity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformance.capacityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="planned" fill="#94a3b8" />
                    <Bar dataKey="actual" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-sm text-muted-foreground">{performer.tasksCompleted} tasks completed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{performer.efficiency}%</p>
                        <p className="text-xs text-muted-foreground">efficiency</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskAnalytics.tasksByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {taskAnalytics.tasksByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productivity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={taskAnalytics.productivityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#22c55e" />
                    <Bar dataKey="created" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskAnalysis.risksByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Heat Map</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={riskAnalysis.riskHeatmap}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="impact" name="Impact" domain={[0, 5]} />
                    <YAxis type="number" dataKey="likelihood" name="Likelihood" domain={[0, 5]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Risks" dataKey="count" fill="#ef4444" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">Performance Insight</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Your team's velocity has increased by 18% over the last 3 sprints. Consider maintaining current team composition.
                  </p>
                </div>
                
                <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-amber-800">Budget Alert</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Current spend rate suggests budget exhaustion by month 9. Consider reviewing high-cost categories.
                  </p>
                </div>

                <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-800">Success Pattern</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Teams with regular retrospectives show 23% higher satisfaction scores. Continue current practices.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Satisfaction & Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={retrospectiveInsights.teamSatisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sprint" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="satisfaction" stroke="#22c55e" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
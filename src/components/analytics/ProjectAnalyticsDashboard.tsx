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
      
      // Fetch analytics via API client (handles auth)
      console.log('Fetching analytics for project:', projectId);
      const resp = await apiClient.getProjectOverviewAnalytics(projectId);
      console.log('Analytics API response:', resp);
      
      if (!resp.success) {
        throw new Error(resp.error || 'Analytics request failed');
      }

      const apiData = resp.data;
      console.log('Analytics data received:', apiData);

      // Build analytics data from real API response with "not available" fallbacks
      const finalAnalyticsData: ProjectAnalyticsData = {
        projectHealth: apiData.projectHealth || {
          overall: 0,
          budget: 0,
          timeline: 0,
          risks: 0,
          team: 0
        },
        budgetAnalytics: {
          totalAllocated: apiData.budgetAnalytics?.totalAllocated || 0,
          totalSpent: apiData.budgetAnalytics?.totalSpent || 0,
          remainingBudget: apiData.budgetAnalytics?.remainingBudget || 0,
          spendByCategory: apiData.budgetAnalytics?.spendByCategory || [],
          burnRate: apiData.budgetAnalytics?.burnRate || []
        },
        teamPerformance: {
          totalMembers: apiData.teamPerformance?.totalMembers || 0,
          activeMembers: apiData.teamPerformance?.activeMembers || 0,
          avgCapacity: apiData.teamPerformance?.avgCapacity || 0,
          utilizationRate: apiData.teamPerformance?.avgEfficiency || 0,
          topPerformers: apiData.teamPerformance?.topPerformers || [],
          capacityTrend: apiData.teamPerformance?.capacityTrend || []
        },
        taskAnalytics: {
          totalTasks: apiData.taskAnalytics?.totalTasks || 0,
          completedTasks: apiData.taskAnalytics?.completedTasks || 0,
          overdueTasks: apiData.taskAnalytics?.overdueTasks || 0,
          avgCompletionTime: apiData.taskAnalytics?.avgCompletionTime || 0,
          tasksByStatus: apiData.taskAnalytics?.tasksByStatus || [],
          productivityTrend: apiData.taskAnalytics?.productivityTrend || []
        },
        riskAnalysis: {
          totalRisks: apiData.riskAnalysis?.totalRisks || 0,
          highRisks: apiData.riskAnalysis?.highRisks || 0,
          mitigatedRisks: apiData.riskAnalysis?.mitigatedRisks || 0,
          riskHeatmap: apiData.riskAnalysis?.riskHeatmap || [],
          risksByCategory: apiData.riskAnalysis?.risksByCategory || []
        },
        stakeholderEngagement: {
          totalStakeholders: apiData.stakeholderAnalytics?.totalStakeholders || 0,
          activeStakeholders: apiData.stakeholderAnalytics?.activeStakeholders || 0,
          recentMeetings: apiData.stakeholderAnalytics?.recentMeetings || 0,
          communicationFrequency: apiData.stakeholderAnalytics?.communicationFrequency || []
        },
        retrospectiveInsights: {
          totalRetros: apiData.retrospectiveAnalytics?.totalRetros || 0,
          actionItemsCreated: apiData.retrospectiveAnalytics?.totalActionItems || 0,
          actionItemsCompleted: apiData.retrospectiveAnalytics?.convertedToTasks || 0,
          teamSatisfactionTrend: apiData.retrospectiveAnalytics?.teamSatisfactionTrend || []
        }
      };

      setAnalyticsData(finalAnalyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      // Set empty data structure when API fails
      const emptyAnalyticsData: ProjectAnalyticsData = {
        projectHealth: { overall: 0, budget: 0, timeline: 0, risks: 0, team: 0 },
        budgetAnalytics: {
          totalAllocated: 0,
          totalSpent: 0,
          remainingBudget: 0,
          spendByCategory: [],
          burnRate: []
        },
        teamPerformance: {
          totalMembers: 0,
          activeMembers: 0,
          avgCapacity: 0,
          utilizationRate: 0,
          topPerformers: [],
          capacityTrend: []
        },
        taskAnalytics: {
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          avgCompletionTime: 0,
          tasksByStatus: [],
          productivityTrend: []
        },
        riskAnalysis: {
          totalRisks: 0,
          highRisks: 0,
          mitigatedRisks: 0,
          riskHeatmap: [],
          risksByCategory: []
        },
        stakeholderEngagement: {
          totalStakeholders: 0,
          activeStakeholders: 0,
          recentMeetings: 0,
          communicationFrequency: []
        },
        retrospectiveInsights: {
          totalRetros: 0,
          actionItemsCreated: 0,
          actionItemsCompleted: 0,
          teamSatisfactionTrend: []
        }
      };

      setAnalyticsData(emptyAnalyticsData);
      
      toast({
        title: 'Analytics Service',
        description: 'Unable to load analytics right now.',
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
      {/* Executive Summary Cards - Redesigned to match screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Project Health Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-blue-600">Project Health</div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-700 mb-1">{projectHealth.overall}%</div>
            <div className="text-xs text-blue-500 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +5% from last week
            </div>
            <div className="mt-3">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${projectHealth.overall}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Health Card */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-green-600">Budget Health</div>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-700 mb-1">
              ${budgetAnalytics.totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-green-500">
              ${budgetAnalytics.remainingBudget.toLocaleString()} remaining
            </div>
            <div className="mt-3">
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: budgetAnalytics.totalAllocated > 0 
                      ? `${Math.min((budgetAnalytics.totalSpent / budgetAnalytics.totalAllocated) * 100, 100)}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-purple-600">Team Performance</div>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {teamPerformance.utilizationRate}%
            </div>
            <div className="text-xs text-purple-500">
              {teamPerformance.activeMembers}/{teamPerformance.totalMembers} active
            </div>
            <div className="mt-3">
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${teamPerformance.utilizationRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Completion Card */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-orange-600">Task Completion</div>
              <CheckCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-700 mb-1">
              {taskAnalytics.totalTasks > 0 ? Math.round((taskAnalytics.completedTasks / taskAnalytics.totalTasks) * 100) : 0}%
            </div>
            <div className="text-xs text-orange-500">
              {taskAnalytics.completedTasks}/{taskAnalytics.totalTasks} tasks
            </div>
            <div className="mt-3">
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: taskAnalytics.totalTasks > 0 
                      ? `${(taskAnalytics.completedTasks / taskAnalytics.totalTasks) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Score Card */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-red-600">Risk Score</div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-700 mb-1">
              {riskAnalysis.highRisks}
            </div>
            <div className="text-xs text-red-500">
              {riskAnalysis.totalRisks} total risks
            </div>
            <div className="mt-3">
              <div className="w-full bg-red-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: riskAnalysis.totalRisks > 0 
                      ? `${(riskAnalysis.mitigatedRisks / riskAnalysis.totalRisks) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
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
                {budgetAnalytics.spendByCategory.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No spending data available</p>
                      <p className="text-sm">Start tracking expenses to see category breakdown</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget vs Spend Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {budgetAnalytics.burnRate.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No trend data available</p>
                      <p className="text-sm">Budget spending over time will appear here</p>
                    </div>
                  </div>
                )}
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
                {teamPerformance.capacityTrend.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No capacity trend data available</p>
                      <p className="text-sm">Team capacity planning data will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                {teamPerformance.topPerformers.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No performance data available</p>
                      <p className="text-sm">Complete tasks to see top performers</p>
                    </div>
                  </div>
                )}
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
                {taskAnalytics.tasksByStatus.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No task status data available</p>
                      <p className="text-sm">Task distribution by status will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productivity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {taskAnalytics.productivityTrend.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No productivity trend available</p>
                      <p className="text-sm">Task completion trends will appear here</p>
                    </div>
                  </div>
                )}
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
                {riskAnalysis.risksByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={riskAnalysis.risksByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No risk data available</p>
                      <p className="text-sm">Add risks to your project to see analytics</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                    <span className="font-medium">Total Risks</span>
                    <span className="text-2xl font-bold text-primary">{riskAnalysis.totalRisks}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-red-700">High Priority Risks</span>
                    <span className="text-2xl font-bold text-red-600">{riskAnalysis.highRisks}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-700">Mitigated Risks</span>
                    <span className="text-2xl font-bold text-green-600">{riskAnalysis.mitigatedRisks}</span>
                  </div>
                  {riskAnalysis.totalRisks > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Risk Mitigation Progress</span>
                        <span>{Math.round((riskAnalysis.mitigatedRisks / riskAnalysis.totalRisks) * 100)}%</span>
                      </div>
                      <Progress value={(riskAnalysis.mitigatedRisks / riskAnalysis.totalRisks) * 100} className="h-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stakeholder Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-700">{stakeholderEngagement.totalStakeholders}</p>
                    <p className="text-sm text-blue-600">Total Stakeholders</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-700">{stakeholderEngagement.activeStakeholders}</p>
                    <p className="text-sm text-green-600">Active Stakeholders</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-700">{stakeholderEngagement.recentMeetings}</p>
                    <p className="text-sm text-purple-600">Recent Meetings</p>
                  </div>
                </div>
                {stakeholderEngagement.totalStakeholders === 0 && (
                  <div className="mt-6 text-center text-muted-foreground">
                    <p className="text-sm">No stakeholder data available</p>
                    <p className="text-xs">Add stakeholders to your project to see engagement analytics</p>
                  </div>
                )}
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
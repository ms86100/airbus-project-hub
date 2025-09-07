import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip
} from 'recharts';
import {
  TrendingUp, DollarSign, Users, CheckCircle, AlertTriangle,
  Target, Activity, MessageSquare, Calendar, Star, PieChart as PieChartIcon
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
      const resp = await apiClient.getProjectOverviewAnalytics(projectId);
      if (!resp.success) {
        throw new Error(resp.error || 'Analytics request failed');
      }

      const apiData = resp.data;

      // Build analytics data from real API response with fallbacks
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
    <div className="space-y-8 p-6">
      {/* Main Project Overview Header */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Project Analytics Dashboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive insights and analytics for your project performance, budget, team efficiency, and progress tracking
        </p>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Project Health</p>
                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{projectHealth.overall}%</p>
                <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Overall Score
                </div>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                <Activity className="h-8 w-8 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <Progress value={projectHealth.overall} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950/50 dark:to-green-900/50 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Budget Status</p>
                {budgetAnalytics.totalAllocated > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-green-800 dark:text-green-200">₹{(budgetAnalytics.totalSpent / 1000).toFixed(0)}K</p>
                    <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                      <DollarSign className="h-3 w-3 mr-1" />
                      ₹{(budgetAnalytics.remainingBudget / 1000).toFixed(0)}K remaining
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No budget data</p>
                )}
              </div>
              <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
            </div>
            {budgetAnalytics.totalAllocated > 0 && (
              <Progress value={(budgetAnalytics.totalSpent / budgetAnalytics.totalAllocated) * 100} className="mt-4 h-2" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Team Performance</p>
                {teamPerformance.totalMembers > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{teamPerformance.utilizationRate}%</p>
                    <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                      <Users className="h-3 w-3 mr-1" />
                      {teamPerformance.activeMembers}/{teamPerformance.totalMembers} active
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No team data</p>
                )}
              </div>
              <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-full">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
            {teamPerformance.totalMembers > 0 && (
              <Progress value={teamPerformance.utilizationRate} className="mt-4 h-2" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Task Progress</p>
                {taskAnalytics.totalTasks > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-amber-800 dark:text-amber-200">{Math.round((taskAnalytics.completedTasks / taskAnalytics.totalTasks) * 100)}%</p>
                    <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {taskAnalytics.completedTasks}/{taskAnalytics.totalTasks} completed
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No task data</p>
                )}
              </div>
              <div className="p-3 bg-amber-200 dark:bg-amber-800 rounded-full">
                <CheckCircle className="h-8 w-8 text-amber-600 dark:text-amber-300" />
              </div>
            </div>
            {taskAnalytics.totalTasks > 0 && (
              <Progress value={(taskAnalytics.completedTasks / taskAnalytics.totalTasks) * 100} className="mt-4 h-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Health Radar */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-6 w-6 text-primary" />
              Project Health Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Multi-dimensional view of project performance across key areas
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={[
                { subject: 'Budget', A: projectHealth.budget, fullMark: 100 },
                { subject: 'Timeline', A: projectHealth.timeline, fullMark: 100 },
                { subject: 'Team', A: projectHealth.team, fullMark: 100 },
                { subject: 'Risks', A: projectHealth.risks, fullMark: 100 },
                { subject: 'Quality', A: 85, fullMark: 100 }
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" className="text-sm" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Health Score" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PieChartIcon className="h-6 w-6 text-primary" />
              Budget Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Breakdown of budget allocation and spending across categories
            </p>
          </CardHeader>
          <CardContent>
            {budgetAnalytics.spendByCategory && budgetAnalytics.spendByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={budgetAnalytics.spendByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {budgetAnalytics.spendByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                <div className="text-center space-y-2">
                  <PieChartIcon className="h-12 w-12 mx-auto opacity-50" />
                  <p>No budget categories available</p>
                  <p className="text-sm">Budget data will appear once configured</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Task Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Task Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Tasks</span>
                <span className="font-semibold">{taskAnalytics.totalTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-semibold text-green-600">{taskAnalytics.completedTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">In Progress</span>
                <span className="font-semibold text-blue-600">{taskAnalytics.totalTasks - taskAnalytics.completedTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Completion Time</span>
                <span className="font-semibold">{taskAnalytics.avgCompletionTime} days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Team Size</span>
                <span className="font-semibold">{teamPerformance.totalMembers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Members</span>
                <span className="font-semibold text-green-600">{teamPerformance.activeMembers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Capacity</span>
                <span className="font-semibold">{teamPerformance.avgCapacity}h/week</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Efficiency Rate</span>
                <span className="font-semibold">{teamPerformance.utilizationRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stakeholder Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Stakeholder Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Stakeholders</span>
                <span className="font-semibold">{stakeholderEngagement.totalStakeholders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Stakeholders</span>
                <span className="font-semibold text-green-600">{stakeholderEngagement.activeStakeholders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recent Meetings</span>
                <span className="font-semibold">{stakeholderEngagement.recentMeetings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Retrospectives</span>
                <span className="font-semibold">{retrospectiveInsights.totalRetros}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Analysis */}
      {riskAnalysis.totalRisks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Risk Analysis Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Current risk landscape and mitigation status
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{riskAnalysis.totalRisks}</div>
                <div className="text-sm text-muted-foreground">Total Risks</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{riskAnalysis.highRisks}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{riskAnalysis.mitigatedRisks}</div>
                <div className="text-sm text-muted-foreground">Mitigated</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {riskAnalysis.totalRisks > 0 ? Math.round((riskAnalysis.mitigatedRisks / riskAnalysis.totalRisks) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Mitigation Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items Summary */}
      {retrospectiveInsights.totalRetros > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6 text-purple-500" />
              Retrospective Insights
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Team feedback and continuous improvement metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{retrospectiveInsights.totalRetros}</div>
                <div className="text-sm text-muted-foreground">Retrospectives</div>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{retrospectiveInsights.actionItemsCreated}</div>
                <div className="text-sm text-muted-foreground">Action Items</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{retrospectiveInsights.actionItemsCompleted}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()} • All metrics are calculated in real-time
        </p>
      </div>
    </div>
  );
};
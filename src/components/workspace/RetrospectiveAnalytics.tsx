import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { apiClient } from '@/services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RetrospectiveAnalyticsProps {
  projectId: string;
  onBack: () => void;
}

interface AnalyticsData {
  totalRetrospectives: number;
  totalActionItems: number;
  convertedTasks: number;
  conversionRate: number;
  retrospectivesByFramework: Array<{ framework: string; count: number }>;
  actionItemsByStatus: Array<{ status: string; count: number }>;
  monthlyTrend: Array<{ month: string; retrospectives: number; actionItems: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

export function RetrospectiveAnalytics({ projectId, onBack }: RetrospectiveAnalyticsProps) {
  const { user } = useApiAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch retrospectives for this project
      const retrospectivesResponse = await apiClient.getRetrospectives(projectId);
      const retrospectives = Array.isArray(retrospectivesResponse.data) 
        ? retrospectivesResponse.data 
        : [];

      // Calculate analytics from retrospectives data
      const totalRetrospectives = retrospectives.length;
      
      // Calculate action items (simplified - would need API endpoint for actual data)
      const totalActionItems = retrospectives.reduce((acc, retro) => {
        // This would need to be fetched from action items endpoint
        return acc + (retro.columns?.reduce((colAcc, col) => 
          colAcc + (col.cards?.length || 0), 0) || 0);
      }, 0);

      // Framework distribution
      const frameworkCounts = retrospectives.reduce((acc, retro) => {
        acc[retro.framework] = (acc[retro.framework] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const retrospectivesByFramework = Object.entries(frameworkCounts).map(([framework, count]) => ({
        framework,
        count: count as number
      }));

      // Mock data for demonstration
      const mockAnalytics: AnalyticsData = {
        totalRetrospectives,
        totalActionItems,
        convertedTasks: Math.floor(totalActionItems * 0.3), // 30% conversion rate
        conversionRate: 30,
        retrospectivesByFramework,
        actionItemsByStatus: [
          { status: 'Open', count: Math.floor(totalActionItems * 0.4) },
          { status: 'In Progress', count: Math.floor(totalActionItems * 0.3) },
          { status: 'Done', count: Math.floor(totalActionItems * 0.3) }
        ],
        monthlyTrend: [
          { month: 'Jan', retrospectives: 2, actionItems: 8 },
          { month: 'Feb', retrospectives: 3, actionItems: 12 },
          { month: 'Mar', retrospectives: 1, actionItems: 4 },
          { month: 'Apr', retrospectives: 4, actionItems: 16 },
          { month: 'May', retrospectives: 2, actionItems: 9 },
          { month: 'Jun', retrospectives: totalRetrospectives, actionItems: totalActionItems }
        ]
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Retrospective Analytics</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Retrospective Analytics</h1>
          <p className="text-muted-foreground">Project retrospective metrics and insights</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retrospectives</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRetrospectives}</div>
            <p className="text-xs text-muted-foreground">
              All time retrospectives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalActionItems}</div>
            <p className="text-xs text-muted-foreground">
              Total action items created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.convertedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Action items → backlog tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Actions converted to tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Framework Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Framework Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.retrospectivesByFramework}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.retrospectivesByFramework.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Item Status */}
        <Card>
          <CardHeader>
            <CardTitle>Action Item Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.actionItemsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Retrospective Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="retrospectives" fill="hsl(var(--primary))" name="Retrospectives" />
              <Bar dataKey="actionItems" fill="hsl(var(--accent))" name="Action Items" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Framework Details */}
      <Card>
        <CardHeader>
          <CardTitle>Framework Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.retrospectivesByFramework.map((framework) => (
              <div key={framework.framework} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="font-medium">{framework.framework}</span>
                </div>
                <Badge variant="outline">{framework.count} retrospectives</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
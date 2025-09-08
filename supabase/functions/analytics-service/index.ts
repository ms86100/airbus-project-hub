import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const projectId = pathParts[pathParts.indexOf('projects') + 1]
    const analyticsType = pathParts[pathParts.length - 1]

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Analytics request for project ${projectId}, type: ${analyticsType}`)

    if (req.method === 'GET') {
      let analyticsData = {}

      switch (analyticsType) {
        case 'project-overview':
          analyticsData = await getProjectOverviewAnalytics(supabase, projectId)
          break
        case 'team-capacity':
          analyticsData = await getTeamCapacityAnalytics(supabase, projectId)
          break
        case 'retrospectives':
          analyticsData = await getRetrospectiveAnalytics(supabase, projectId)
          break
        case 'comprehensive':
          analyticsData = await getComprehensiveAnalytics(supabase, projectId)
          break
        default:
          return new Response(
            JSON.stringify({ error: 'Invalid analytics type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }

      return new Response(
        JSON.stringify({ success: true, data: analyticsData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Analytics service error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getProjectOverviewAnalytics(supabase: any, projectId: string) {
  try {
    console.log('🔍 Fetching analytics for project:', projectId);
    
    // Fetch all required data with detailed logging
    const [
      { data: project, error: projectError },
      { data: tasks, error: tasksError },
      { data: milestones, error: milestonesError },
      { data: risks, error: risksError },
      { data: stakeholders, error: stakeholdersError },
      { data: retrospectives, error: retrospectivesError },
      { data: budgets, error: budgetsError },
      { data: budgetSpending, error: spendingError },
      { data: teamCapacityIterations, error: teamError }
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('tasks').select('*').eq('project_id', projectId),
      supabase.from('milestones').select('*').eq('project_id', projectId),
      supabase.from('risk_register').select('*').eq('project_id', projectId),
      supabase.from('stakeholders').select('*').eq('project_id', projectId),
      supabase.from('retrospectives').select('*, retrospective_columns(*, retrospective_cards(*))').eq('project_id', projectId),
      supabase.from('project_budgets').select('*, budget_categories(*)').eq('project_id', projectId),
      supabase.rpc('get_project_budget_spending', { project_id_param: projectId }),
      supabase.from('team_capacity_iterations').select('*, team_capacity_members(*)').eq('project_id', projectId)
    ])

    console.log('📊 Data fetched:', {
      tasks: tasks?.length || 0,
      milestones: milestones?.length || 0,
      risks: risks?.length || 0,
      stakeholders: stakeholders?.length || 0,
      budgets: budgets?.length || 0,
      budgetSpending: budgetSpending?.length || 0,
      teamCapacityIterations: teamCapacityIterations?.length || 0
    });

    if (tasksError) console.log('❌ Tasks error:', tasksError);
    if (budgetsError) console.log('❌ Budgets error:', budgetsError);
    if (spendingError) console.log('❌ Spending error:', spendingError);

    // Process tasks with correct status mapping and build enhanced analytics
    const tasksData = tasks || []
    const completedTasks = tasksData.filter(task => 
      task.status === 'completed' || task.status === 'done'
    ).length
    const inProgressTasks = tasksData.filter(task => 
      task.status === 'in_progress' || task.status === 'in progress'
    ).length
    const todoTasks = tasksData.filter(task => 
      task.status === 'todo' || task.status === 'backlog'
    ).length
    const blockedTasks = tasksData.filter(task => 
      task.status === 'blocked'
    ).length
    const overdueTasks = tasksData.filter(task => {
      if (!task.due_date) return false
      return new Date() > new Date(task.due_date) && 
             !['completed', 'done'].includes(task.status)
    })
    
    // Build tasks by owner data from available task data
    const tasksByOwnerMap = tasksData.reduce((acc, task) => {
      const owner = task.owner_id || 'Unassigned'
      if (!acc[owner]) {
        acc[owner] = { owner, total: 0, completed: 0, inProgress: 0, blocked: 0 }
      }
      acc[owner].total++
      if (['completed', 'done'].includes(task.status)) acc[owner].completed++
      else if (['in_progress', 'in progress'].includes(task.status)) acc[owner].inProgress++
      else if (task.status === 'blocked') acc[owner].blocked++
      return acc
    }, {})
    
    const tasksByOwner = Object.values(tasksByOwnerMap) as Array<{ owner: string; total: number; completed: number; inProgress: number; blocked: number }>
    
    // Build overdue tasks list
    const overdueTasksList = overdueTasks.map(task => ({
      id: task.id,
      title: task.title,
      owner: task.owner_id || 'Unassigned',
      dueDate: task.due_date,
      daysOverdue: Math.ceil((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 3600 * 24))
    }))

    // Process risks with proper scoring
    const risksData = risks || []
    const highRisks = risksData.filter(risk => {
      const likelihood = risk.likelihood || 0
      const impact = risk.impact || 0
      return likelihood * impact >= 9
    }).length
    const mitigatedRisks = risksData.filter(risk => 
      ['closed', 'mitigated'].includes(risk.status)
    ).length

    // Process budget data properly
    const budgetData = budgets?.[0] || { total_budget_allocated: 0, total_budget_received: 0 }
    const categories = budgetData.budget_categories || []
    
    // Calculate budget allocations and spending
    const totalAllocated = categories.reduce((sum, cat) => sum + (cat.budget_allocated || 0), 0) || budgetData.total_budget_allocated || 0
    const totalSpent = categories.reduce((sum, cat) => {
      const categorySpent = cat.budget_spending?.reduce((spentSum, spending) => spentSum + (spending.amount || 0), 0) || 0
      return sum + categorySpent
    }, 0) || 0
    
    console.log('💰 Budget analysis:', {
      allocated: totalAllocated,
      spent: totalSpent,
      categories: categories.length,
      spendingEntries: budgetSpending?.length || 0
    });

    // Process team data from iterations
    const iterationsData = teamCapacityIterations || []
    const totalMembers = iterationsData.reduce((sum, iteration) => 
      sum + (iteration.team_capacity_members?.length || 0), 0)

    // Process retrospectives
    const retrospectivesData = retrospectives || []
    const totalActionItems = retrospectivesData.reduce((sum, retro) => {
      return sum + (retro.retrospective_columns?.reduce((colSum, col) => 
        colSum + (col.retrospective_cards?.length || 0), 0) || 0)
    }, 0)

    // Calculate health scores with improved logic
    const timelineHealth = milestones?.length > 0 ? 
      ((milestones.filter(m => m.status === 'completed').length / milestones.length) * 100) : 
      (tasksData.length > 0 ? ((completedTasks / tasksData.length) * 100) : 100)
      
    const budgetHealth = totalAllocated > 0 ? 
      Math.max(0, ((totalAllocated - totalSpent) / totalAllocated) * 100) : 100
      
    const riskHealth = risksData.length > 0 ? 
      Math.max(0, 100 - ((highRisks / risksData.length) * 100)) : 100
      
    const teamHealth = totalMembers > 0 ? 85 : 100 // Default team health when no team data
    
    const overallHealth = Math.round((timelineHealth + budgetHealth + riskHealth + teamHealth) / 4)

    // Build detailed analytics response
    const result = {
      projectHealth: {
        overall: overallHealth,
        budget: Math.round(budgetHealth),
        timeline: Math.round(timelineHealth),
        risks: Math.round(riskHealth),
        team: Math.round(teamHealth)
      },
      budgetAnalytics: {
        totalAllocated,
        totalSpent,
        remainingBudget: Math.max(0, totalAllocated - totalSpent),
        spendByCategory: categories.length > 0 ? categories.map((cat, index) => ({
          name: cat.name || 'Unknown',
          value: cat.budget_spending?.reduce((sum, spend) => sum + (spend.amount || 0), 0) || 0,
          color: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
        })) : [],
        burnRate: [] // Can be populated with historical data
      },
      taskAnalytics: {
        totalTasks: tasksData.length,
        completedTasks,
        overdueTasks: overdueTasks.length,
        avgCompletionTime: 0, // Can calculate from task data
        tasksByStatus: tasksData.length > 0 ? [
          { status: 'Completed', count: completedTasks, color: '#22c55e' },
          { status: 'In Progress', count: inProgressTasks, color: '#06b6d4' },
          { status: 'Todo', count: todoTasks, color: '#f97316' },
          { status: 'Blocked', count: blockedTasks, color: '#ef4444' }
        ] : [],
        tasksByOwner,
        overdueTasksList,
        productivityTrend: [] // Historical data needed
      },
      teamPerformance: {
        totalMembers,
        activeMembers: totalMembers,
        avgCapacity: iterationsData.length > 0 ? 
          Math.round(iterationsData.reduce((sum, iter) => {
            const avgCap = iter.team_capacity_members?.reduce((memberSum, member) => 
              memberSum + (member.effective_capacity_days || 0), 0) || 0
            return sum + (avgCap / Math.max(1, iter.team_capacity_members?.length || 1))
          }, 0) / iterationsData.length) : 0,
        avgEfficiency: iterationsData.length > 0 ? 
          Math.round(iterationsData.reduce((sum, iter) => {
            const avgEff = iter.team_capacity_members?.reduce((memberSum, member) => 
              memberSum + (member.availability_percent || 0), 0) || 0
            return sum + (avgEff / Math.max(1, iter.team_capacity_members?.length || 1))
          }, 0) / iterationsData.length) : 0,
        topPerformers: [],
        capacityTrend: []
      },
      riskAnalysis: {
        totalRisks: risksData.length,
        highRisks,
        mitigatedRisks,
        riskHeatmap: [],
        risksByCategory: []
      },
      stakeholderAnalytics: {
        totalStakeholders: (stakeholders || []).length,
        activeStakeholders: (stakeholders || []).length, // Assume all active for now
        recentMeetings: 0,
        communicationFrequency: []
      },
      retrospectiveAnalytics: {
        totalRetros: retrospectivesData.length,
        totalActionItems,
        convertedToTasks: 0, // Would need to track task conversion
        teamSatisfactionTrend: []
      }
    }

    console.log('📈 Analytics result:', {
      totalTasks: result.taskAnalytics.totalTasks,
      completedTasks: result.taskAnalytics.completedTasks,
      totalBudget: result.budgetAnalytics.totalAllocated,
      totalSpent: result.budgetAnalytics.totalSpent,
      categories: result.budgetAnalytics.spendByCategory.length,
      overallHealth: result.projectHealth.overall
    });

    return result
  } catch (error) {
    console.error('Error in getProjectOverviewAnalytics:', error)
    throw error
  }
}

async function getTeamCapacityAnalytics(supabase: any, projectId: string) {
  try {
    const { data: teams } = await supabase
      .from('team_capacity_teams')
      .select('*, team_capacity_members(*), team_capacity_iterations(*)')
      .eq('project_id', projectId)

    const teamsData = teams || []
    
    const capacityData = teamsData.map(team => {
      const members = team.team_capacity_members || []
      const iterations = team.team_capacity_iterations || []
      
      const avgCapacity = members.length > 0 ? 
        members.reduce((sum, member) => sum + (member.default_availability_percent || 0), 0) / members.length : 0
      
      return {
        team_name: team.team_name,
        members: members.length,
        iterations: iterations.length,
        capacity: Math.round(avgCapacity),
        efficiency: Math.round(avgCapacity * 0.9),
        utilization: Math.round(avgCapacity * 0.85),
        status: avgCapacity > 90 ? 'overloaded' : avgCapacity > 70 ? 'optimal' : 'underutilized'
      }
    })

    return {
      capacityData,
      overallMetrics: {
        totalTeams: teamsData.length,
        totalMembers: teamsData.reduce((sum, team) => sum + (team.team_capacity_members?.length || 0), 0),
        avgCapacity: capacityData.length > 0 ? 
          Math.round(capacityData.reduce((sum, team) => sum + team.capacity, 0) / capacityData.length) : 0,
        avgEfficiency: capacityData.length > 0 ? 
          Math.round(capacityData.reduce((sum, team) => sum + team.efficiency, 0) / capacityData.length) : 0
      }
    }
  } catch (error) {
    console.error('Error in getTeamCapacityAnalytics:', error)
    throw error
  }
}

async function getRetrospectiveAnalytics(supabase: any, projectId: string) {
  try {
    const { data: retrospectives } = await supabase
      .from('retrospectives')
      .select('*, retrospective_columns(*, retrospective_cards(*, retrospective_card_votes(*)))')
      .eq('project_id', projectId)

    const retrospectivesData = retrospectives || []
    
    // Collect all cards with votes
    const allCards = retrospectivesData.flatMap(retro => 
      retro.retrospective_columns?.flatMap(col => 
        col.retrospective_cards?.map(card => ({
          ...card,
          columnTitle: col.title,
          retrospectiveFramework: retro.framework,
          retrospectiveDate: retro.created_at,
          votes: card.retrospective_card_votes?.length || 0
        })) || []
      ) || []
    )

    const totalActionItems = allCards.length
    const totalVotes = allCards.reduce((sum, card) => sum + card.votes, 0)
    
    // Framework distribution
    const frameworkCounts = retrospectivesData.reduce((acc, retro) => {
      const displayName = getFrameworkDisplayName(retro.framework)
      acc[displayName] = (acc[displayName] || 0) + 1
      return acc
    }, {})

    const retrospectivesByFramework = Object.entries(frameworkCounts).map(([framework, count]) => ({
      framework,
      count: count as number
    }))

    return {
      totalRetrospectives: retrospectivesData.length,
      totalActionItems,
      totalVotes,
      conversionRate: 25, // 25% default conversion rate
      retrospectivesByFramework,
      topVotedCards: allCards
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 10)
        .map(card => ({
          id: card.id,
          text: card.text.length > 100 ? card.text.substring(0, 100) + '...' : card.text,
          votes: card.votes,
          column: card.columnTitle,
          retrospective: `${card.retrospectiveFramework} (${new Date(card.retrospectiveDate).toLocaleDateString()})`
        }))
    }
  } catch (error) {
    console.error('Error in getRetrospectiveAnalytics:', error)
    throw error
  }
}

async function getComprehensiveAnalytics(supabase: any, projectId: string) {
  try {
    const [projectOverview, teamCapacity, retrospectiveData] = await Promise.all([
      getProjectOverviewAnalytics(supabase, projectId),
      getTeamCapacityAnalytics(supabase, projectId),
      getRetrospectiveAnalytics(supabase, projectId)
    ])

    return {
      projectOverview,
      teamCapacity,
      retrospectives: retrospectiveData
    }
  } catch (error) {
    console.error('Error in getComprehensiveAnalytics:', error)
    throw error
  }
}

function getFrameworkDisplayName(framework: string) {
  const names = {
    'classic': 'Classic',
    '4ls': '4Ls', 
    'kiss': 'KISS',
    'sailboat': 'Sailboat',
    'mad_sad_glad': 'Mad/Sad/Glad'
  }
  return names[framework] || framework
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  handleCorsOptions,
  validateAuthToken,
  extractPathParams,
  logRequest,
} from '../shared/api-utils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function hasProjectAccess(userId: string, projectId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, created_by')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return { ok: false, reason: 'PROJECT_NOT_FOUND' };

  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (project.created_by === userId || adminRole) return { ok: true };

  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membership) return { ok: true };

  const { data: modulePerm } = await supabase
    .from('module_permissions')
    .select('id, module, access_level')
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (modulePerm && modulePerm.length > 0) return { ok: true };

  return { ok: false, reason: 'FORBIDDEN' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return createErrorResponse('No authorization header', 'UNAUTHORIZED', 401);
  }

  // Create authenticated client for user context
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  try {
    const { user, error: authError } = await validateAuthToken(req, supabase);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return createErrorResponse(authError || 'Authentication failed', 'UNAUTHORIZED', 401);
    }
    
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    logRequest(method, path, user);

    // GET /workspace-service/projects/:id/workspace
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/workspace')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/workspace');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      // Summary counts
      const [tasksCountRes, milestonesCountRes, risksCountRes, retrosCountRes] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('milestones').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('risk_register').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('retrospectives').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
      ]);

      const summary = {
        tasks: tasksCountRes.count || 0,
        milestones: milestonesCountRes.count || 0,
        risks: risksCountRes.count || 0,
        retrospectives: retrosCountRes.count || 0,
      };

      // Recent items
      const [{ data: recentTasks }, { data: upcomingMilestones }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, updated_at')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('milestones')
          .select('id, name, status, due_date')
          .eq('project_id', projectId)
          .order('due_date', { ascending: true })
          .limit(5),
      ]);

      return createSuccessResponse({
        projectId,
        summary,
        recentTasks: recentTasks || [],
        upcomingMilestones: upcomingMilestones || [],
      });
    }

    // GET /workspace-service/projects/:id/risks
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/risks')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/risks');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: risks, error } = await supabase
        .from('risk_register')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching risks:', error);
        return createErrorResponse('Failed to fetch risks', 'FETCH_ERROR');
      }

      return createSuccessResponse(risks || []);
    }

    // POST /workspace-service/projects/:id/risks
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/risks')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/risks');
      const projectId = params.id;
      const riskData = await req.json();

      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: risk, error } = await supabase
        .from('risk_register')
        .insert({
          ...riskData,
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating risk:', error);
        return createErrorResponse('Failed to create risk', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Risk created successfully', risk });
    }

    // PUT /workspace-service/projects/:id/risks/:riskId
    if (method === 'PUT' && path.includes('/risks/') && !path.endsWith('/risks')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const riskIdIndex = pathParts.findIndex(part => part === 'risks') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const riskId = pathParts[riskIdIndex];
      const riskData = await req.json();

      if (!projectId || !riskId) return createErrorResponse('Project ID and Risk ID are required', 'MISSING_IDS');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: risk, error } = await supabase
        .from('risk_register')
        .update(riskData)
        .eq('id', riskId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Error updating risk:', error);
        return createErrorResponse('Failed to update risk', 'UPDATE_ERROR');
      }

      return createSuccessResponse({ message: 'Risk updated successfully', risk });
    }

    // DELETE /workspace-service/projects/:id/risks/:riskId
    if (method === 'DELETE' && path.includes('/risks/') && !path.endsWith('/risks')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const riskIdIndex = pathParts.findIndex(part => part === 'risks') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const riskId = pathParts[riskIdIndex];

      if (!projectId || !riskId) return createErrorResponse('Project ID and Risk ID are required', 'MISSING_IDS');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { error } = await supabase
        .from('risk_register')
        .delete()
        .eq('id', riskId)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error deleting risk:', error);
        return createErrorResponse('Failed to delete risk', 'DELETE_ERROR');
      }

      return createSuccessResponse({ message: 'Risk deleted successfully' });
    }

    // GET /workspace-service/projects/:id/discussions
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/discussions')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/discussions');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: discussions, error } = await supabase
        .from('project_discussions')
        .select('*')
        .eq('project_id', projectId)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.error('Error fetching discussions:', error);
        return createErrorResponse('Failed to fetch discussions', 'FETCH_ERROR');
      }

      return createSuccessResponse(discussions || []);
    }

    // POST /workspace-service/projects/:id/discussions
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/discussions')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/discussions');
      const projectId = params.id;
      const discussionData = await req.json();

      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: discussion, error } = await supabase
        .from('project_discussions')
        .insert({
          ...discussionData,
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating discussion:', error);
        return createErrorResponse('Failed to create discussion', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Discussion created successfully', discussion });
    }

    // GET /workspace-service/projects/:id/action-items
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/action-items')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/action-items');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: actionItems, error } = await supabase
        .from('discussion_action_items')
        .select(`
          *,
          project_discussions!inner(project_id)
        `)
        .eq('project_discussions.project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching action items:', error);
        return createErrorResponse('Failed to fetch action items', 'FETCH_ERROR');
      }

      return createSuccessResponse(actionItems || []);
    }

    // GET /workspace-service/projects/:id/tasks
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/tasks')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/tasks');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return createErrorResponse('Failed to fetch tasks', 'FETCH_ERROR');
      }

      return createSuccessResponse(tasks || []);
    }

    // POST /workspace-service/projects/:id/tasks  
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/tasks')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/tasks');
      const projectId = params.id;
      const taskData = await req.json();

      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return createErrorResponse('Failed to create task', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Task created successfully', task });
    }

    // PUT /workspace-service/tasks/:taskId
    if (method === 'PUT' && path.includes('/tasks/') && !path.includes('/projects/')) {
      const pathParts = path.split('/');
      const taskIdIndex = pathParts.findIndex(part => part === 'tasks') + 1;
      const taskId = pathParts[taskIdIndex];
      const taskData = await req.json();

      if (!taskId) return createErrorResponse('Task ID is required', 'MISSING_TASK_ID');

      // Check if user has access to the project that owns this task
      const { data: task } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', taskId)
        .single();

      if (!task) return createErrorResponse('Task not found', 'TASK_NOT_FOUND', 404);

      const access = await hasProjectAccess(user.id, task.project_id);
      if (!access.ok) return createErrorResponse('Insufficient permissions', 'FORBIDDEN', 403);

      const { data: updatedTask, error } = await supabaseAuth
        .from('tasks')
        .update(taskData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        return createErrorResponse('Failed to update task', 'UPDATE_ERROR');
      }

      return createSuccessResponse({ message: 'Task updated successfully', task: updatedTask });
    }

    // GET /workspace-service/tasks/:taskId/history
    if (method === 'GET' && path.includes('/tasks/') && path.endsWith('/history')) {
      const pathParts = path.split('/');
      const taskIdIndex = pathParts.findIndex(part => part === 'tasks') + 1;
      const taskId = pathParts[taskIdIndex];

      if (!taskId) return createErrorResponse('Task ID is required', 'MISSING_TASK_ID');

      // Check if user has access to the project that owns this task
      const { data: task } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', taskId)
        .single();

      if (!task) return createErrorResponse('Task not found', 'TASK_NOT_FOUND', 404);

      const access = await hasProjectAccess(user.id, task.project_id);
      if (!access.ok) return createErrorResponse('Insufficient permissions', 'FORBIDDEN', 403);

      const { data: history, error } = await supabase
        .from('task_status_history')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching task history:', error);
        return createErrorResponse('Failed to fetch task history', 'FETCH_ERROR');
      }

      return createSuccessResponse(history || []);
    }

    // GET /workspace-service/projects/:id/milestones
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/milestones')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/milestones');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: milestones, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching milestones:', error);
        return createErrorResponse('Failed to fetch milestones', 'FETCH_ERROR');
      }

      return createSuccessResponse(milestones || []);
    }

    // PUT /workspace-service/projects/:id/discussions/:discussionId
    if (method === 'PUT' && path.includes('/discussions/') && !path.endsWith('/discussions')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const discussionIdIndex = pathParts.findIndex(part => part === 'discussions') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const discussionId = pathParts[discussionIdIndex];
      const discussionData = await req.json();

      if (!projectId || !discussionId) return createErrorResponse('Project ID and Discussion ID are required', 'MISSING_IDS');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: discussion, error } = await supabase
        .from('project_discussions')
        .update(discussionData)
        .eq('id', discussionId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Error updating discussion:', error);
        return createErrorResponse('Failed to update discussion', 'UPDATE_ERROR');
      }

      return createSuccessResponse({ message: 'Discussion updated successfully', discussion });
    }

    // DELETE /workspace-service/projects/:id/discussions/:discussionId
    if (method === 'DELETE' && path.includes('/discussions/') && !path.endsWith('/discussions')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const discussionIdIndex = pathParts.findIndex(part => part === 'discussions') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const discussionId = pathParts[discussionIdIndex];

      if (!projectId || !discussionId) return createErrorResponse('Project ID and Discussion ID are required', 'MISSING_IDS');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { error } = await supabase
        .from('project_discussions')
        .delete()
        .eq('id', discussionId)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error deleting discussion:', error);
        return createErrorResponse('Failed to delete discussion', 'DELETE_ERROR');
      }

      return createSuccessResponse({ message: 'Discussion deleted successfully' });
    }

    // POST /workspace-service/projects/:id/action-items
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/action-items')) {
      const params = extractPathParams(url, '/workspace-service/projects/:id/action-items');
      const projectId = params.id;
      const actionItemData = await req.json();

      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      // Need a discussion_id for action items
      if (!actionItemData.discussion_id) {
        return createErrorResponse('discussion_id is required for action items', 'MISSING_DISCUSSION_ID');
      }

      const { data: actionItem, error } = await supabase
        .from('discussion_action_items')
        .insert({
          ...actionItemData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating action item:', error);
        return createErrorResponse('Failed to create action item', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Action item created successfully', actionItem });
    }

    // PUT /workspace-service/projects/:id/action-items/:actionItemId
    if (method === 'PUT' && path.includes('/action-items/') && !path.endsWith('/action-items')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const actionItemIdIndex = pathParts.findIndex(part => part === 'action-items') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const actionItemId = pathParts[actionItemIdIndex];
      const actionItemData = await req.json();

      if (!projectId || !actionItemId) return createErrorResponse('Project ID and Action Item ID are required', 'MISSING_IDS');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { data: actionItem, error } = await supabase
        .from('discussion_action_items')
        .update(actionItemData)
        .eq('id', actionItemId)
        .select()
        .single();

      if (error) {
        console.error('Error updating action item:', error);
        return createErrorResponse('Failed to update action item', 'UPDATE_ERROR');
      }

      return createSuccessResponse({ message: 'Action item updated successfully', actionItem });
    }

    // DELETE /workspace-service/projects/:id/action-items/:actionItemId
    if (method === 'DELETE' && path.includes('/action-items/') && !path.endsWith('/action-items')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const actionItemIdIndex = pathParts.findIndex(part => part === 'action-items') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const actionItemId = pathParts[actionItemIdIndex];

      if (!projectId || !actionItemId) return createErrorResponse('Project ID and Action Item ID are required', 'MISSING_IDS');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const { error } = await supabase
        .from('discussion_action_items')
        .delete()
        .eq('id', actionItemId);

      if (error) {
        console.error('Error deleting action item:', error);
        return createErrorResponse('Failed to delete action item', 'DELETE_ERROR');
      }

      return createSuccessResponse({ message: 'Action item deleted successfully' });
    }

    return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404);
  } catch (error) {
    console.error('Workspace service error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
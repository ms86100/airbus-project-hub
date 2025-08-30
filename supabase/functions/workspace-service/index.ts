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

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  logRequest(method, path);

  try {
    const { user, error: authError } = await validateAuthToken(req, supabase);
    if (authError || !user) return createErrorResponse('Authentication required', 'UNAUTHORIZED', 401);

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
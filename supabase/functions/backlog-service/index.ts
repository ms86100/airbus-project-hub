import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  createSuccessResponse,
  createErrorResponse,
  handleCorsOptions,
  parseRequestBody,
  validateAuthToken,
  extractPathParams,
  logRequest,
} from '../shared/api-utils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type BacklogStatus = 'backlog' | 'in_progress' | 'blocked' | 'done';

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
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (modulePerm) return { ok: true };

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
    // Require auth for all endpoints
    const { user, error: authError } = await validateAuthToken(req, supabase);
    if (authError || !user) {
      return createErrorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // GET /backlog-service/projects/:id/backlog
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/backlog')) {
      const params = extractPathParams(url, '/backlog-service/projects/:id/backlog');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(
          access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions',
          access.reason,
          status
        );
      }

      const statusFilter = url.searchParams.get('status');

      let query = supabase
        .from('task_backlog')
        .select('id, project_id, title, description, status, priority, owner_id, target_date, source_type, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: items, error } = await query;

      if (error) {
        console.error('Error fetching backlog:', error);
        return createErrorResponse('Failed to fetch backlog', 'FETCH_ERROR');
      }

      return createSuccessResponse({ projectId, items: items || [] });
    }

    // POST /backlog-service/projects/:id/backlog
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/backlog')) {
      const params = extractPathParams(url, '/backlog-service/projects/:id/backlog');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(
          access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions',
          access.reason,
          status
        );
      }

      const body = await parseRequestBody(req);
      if (!body?.title) {
        return createErrorResponse('title is required', 'MISSING_FIELDS');
      }

      const { data: item, error } = await supabase
        .from('task_backlog')
        .insert({
          project_id: projectId,
          title: body.title,
          description: body.description || null,
          priority: body.priority || 'medium',
          status: (body.status as BacklogStatus) || 'backlog',
          owner_id: body.ownerId || null,
          target_date: body.targetDate || null,
          source_type: body.sourceType || 'manual',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating backlog item:', error);
        return createErrorResponse('Failed to create backlog item', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Backlog item created successfully', item });
    }

    return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404);
  } catch (error) {
    console.error('Backlog service error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
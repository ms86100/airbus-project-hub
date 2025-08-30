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

type MilestoneStatus = 'planning' | 'in_progress' | 'completed' | 'blocked';

interface CreateMilestoneBody {
  name: string;
  description?: string;
  dueDate: string; // ISO date string
  status?: MilestoneStatus;
}

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

    // GET /roadmap-service/projects/:id/roadmap
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/roadmap')) {
      const params = extractPathParams(url, '/roadmap-service/projects/:id/roadmap');
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

      const { data: milestones, error } = await supabase
        .from('milestones')
        .select('id, project_id, name, description, status, due_date, created_at, updated_at')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching roadmap:', error);
        return createErrorResponse('Failed to fetch roadmap', 'FETCH_ERROR');
      }

      const today = new Date().toISOString().slice(0, 10);
      const enriched = (milestones || []).map((m) => ({
        ...m,
        overdue: m.status !== 'completed' && m.due_date < today,
      }));

      return createSuccessResponse({ projectId, milestones: enriched });
    }

    // POST /roadmap-service/projects/:id/roadmap
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/roadmap')) {
      const params = extractPathParams(url, '/roadmap-service/projects/:id/roadmap');
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

      const body: CreateMilestoneBody = await parseRequestBody(req);
      if (!body.name || !body.dueDate) {
        return createErrorResponse('name and dueDate are required', 'MISSING_FIELDS');
      }

      const { data: milestone, error } = await supabase
        .from('milestones')
        .insert({
          project_id: projectId,
          name: body.name,
          description: body.description || null,
          status: body.status || 'planning',
          due_date: body.dueDate,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating milestone:', error);
        return createErrorResponse('Failed to create milestone', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Milestone created successfully', milestone });
    }

    return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404);
  } catch (error) {
    console.error('Roadmap service error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
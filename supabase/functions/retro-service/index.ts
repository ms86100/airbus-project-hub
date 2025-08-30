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

interface CreateRetrospectiveBody {
  framework?: string;
  iterationId?: string;
  columns?: { title: string; subtitle?: string }[];
}

interface CreateRetroActionBody {
  what_task: string;
  when_sprint?: string;
  who_responsible?: string;
  how_approach?: string;
  backlog_ref_id?: string;
}

async function hasProjectAccess(userId: string, projectId: string) {
  // Project exists?
  const { data: project } = await supabase
    .from('projects')
    .select('id, created_by')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return { ok: false, reason: 'PROJECT_NOT_FOUND' };

  // Admin?
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (project.created_by === userId || adminRole) return { ok: true };

  // Member?
  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membership) return { ok: true };

  // Any module permission?
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
    // All endpoints require authentication
    const { user, error: authError } = await validateAuthToken(req, supabase);
    if (authError || !user) {
      return createErrorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // GET /retro-service/projects/:id/retrospectives
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/retrospectives')) {
      const params = extractPathParams(url, '/retro-service/projects/:id/retrospectives');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      // Manually assemble nested structure to avoid relying on FK-based embedded selects
      const { data: retros, error: retrosError } = await supabase
        .from('retrospectives')
        .select('id, project_id, iteration_id, framework, status, created_at, updated_at, created_by')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (retrosError) {
        console.error('Error fetching retrospectives:', retrosError);
        return createErrorResponse('Failed to fetch retrospectives', 'FETCH_ERROR');
      }

      const retrospectives = retros || [];
      if (retrospectives.length === 0) {
        return createSuccessResponse([]);
      }

      const retroIds = retrospectives.map((r) => r.id);
      const { data: cols, error: colsError } = await supabase
        .from('retrospective_columns')
        .select('id, retrospective_id, title, subtitle, column_order, created_at, updated_at')
        .in('retrospective_id', retroIds)
        .order('column_order', { ascending: true });

      if (colsError) {
        console.error('Error fetching columns:', colsError);
        return createErrorResponse('Failed to fetch retrospectives', 'FETCH_ERROR');
      }

      const columnIds = (cols || []).map((c) => c.id);
      let cardsByColumn: Record<string, any[]> = {};
      if (columnIds.length > 0) {
        const { data: cards, error: cardsError } = await supabase
          .from('retrospective_cards')
          .select('id, column_id, text, votes, card_order, created_at, updated_at, created_by')
          .in('column_id', columnIds)
          .order('card_order', { ascending: true });

        if (cardsError) {
          console.error('Error fetching cards:', cardsError);
          return createErrorResponse('Failed to fetch retrospectives', 'FETCH_ERROR');
        }

        cardsByColumn = (cards || []).reduce((acc, card) => {
          (acc[card.column_id] ||= []).push({
            id: card.id,
            text: card.text,
            votes: card.votes,
            card_order: card.card_order,
            created_at: card.created_at,
            updated_at: card.updated_at,
            created_by: card.created_by,
          });
          return acc;
        }, {} as Record<string, any[]>);
      }

      const colsByRetro = (cols || []).reduce((acc, col) => {
        (acc[col.retrospective_id] ||= []).push({
          id: col.id,
          title: col.title,
          subtitle: col.subtitle,
          column_order: col.column_order,
          created_at: col.created_at,
          updated_at: col.updated_at,
          cards: cardsByColumn[col.id] || [],
        });
        return acc;
      }, {} as Record<string, any[]>);

      const assembled = retrospectives.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        iteration_id: r.iteration_id,
        framework: r.framework,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        created_by: r.created_by,
        columns: colsByRetro[r.id] || [],
      }));

      return createSuccessResponse(assembled);
    }

    // POST /retro-service/projects/:id/retrospectives
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/retrospectives')) {
      const params = extractPathParams(url, '/retro-service/projects/:id/retrospectives');
      const projectId = params.id;
      if (!projectId) return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');

      const access = await hasProjectAccess(user.id, projectId);
      if (!access.ok) {
        const status = access.reason === 'PROJECT_NOT_FOUND' ? 404 : 403;
        return createErrorResponse(access.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Insufficient permissions', access.reason, status);
      }

      const body: CreateRetrospectiveBody = await parseRequestBody(req);
      const framework = body.framework || 'Classic';

      // If no iterationId provided, get the latest one for this project
      let iterationId = body.iterationId;
      if (!iterationId) {
        const { data: latestIteration } = await supabase
          .from('team_capacity_iterations')
          .select('id')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!latestIteration) {
          return createErrorResponse('No iteration found for this project. Please create a team capacity iteration first.', 'NO_ITERATION');
        }
        iterationId = latestIteration.id;
      }

      const { data: retrospective, error: createError } = await supabase
        .from('retrospectives')
        .insert({
          project_id: projectId,
          iteration_id: iterationId,
          framework,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (createError || !retrospective) {
        console.error('Error creating retrospective:', createError);
        return createErrorResponse('Failed to create retrospective', 'CREATE_ERROR');
      }

      // Default columns if none provided
      const columns = body.columns && body.columns.length > 0 ? body.columns : [
        { title: 'Went well' },
        { title: 'To improve' },
        { title: 'Action items' },
      ];

      const toInsert = columns.map((c, idx) => ({
        retrospective_id: retrospective.id,
        title: c.title,
        subtitle: c.subtitle || null,
        column_order: idx,
      }));

      const { error: colError } = await supabase
        .from('retrospective_columns')
        .insert(toInsert);

      if (colError) {
        console.error('Error creating columns:', colError);
        return createErrorResponse('Retrospective created but failed to create columns', 'PARTIAL_CREATE');
      }

      return createSuccessResponse({
        message: 'Retrospective created successfully',
        retrospective,
      });
    }

    // POST /retro-service/retrospectives/:id/actions
    if (method === 'POST' && path.includes('/retrospectives/') && path.endsWith('/actions')) {
      const pathParts = path.split('/');
      const retroIdIndex = pathParts.findIndex((p) => p === 'retrospectives') + 1;
      const retrospectiveId = pathParts[retroIdIndex];
      if (!retrospectiveId) return createErrorResponse('Retrospective ID is required', 'MISSING_RETRO_ID');

      // Find project for access check
      const { data: retro } = await supabase
        .from('retrospectives')
        .select('id, project_id')
        .eq('id', retrospectiveId)
        .maybeSingle();

      if (!retro) return createErrorResponse('Retrospective not found', 'RETRO_NOT_FOUND', 404);

      const access = await hasProjectAccess(user.id, retro.project_id);
      if (!access.ok) return createErrorResponse('Insufficient permissions', 'FORBIDDEN', 403);

      const body: CreateRetroActionBody = await parseRequestBody(req);
      if (!body.what_task) return createErrorResponse('what_task is required', 'MISSING_FIELDS');

      const { data: action, error } = await supabase
        .from('retrospective_action_items')
        .insert({
          retrospective_id: retrospectiveId,
          what_task: body.what_task,
          when_sprint: body.when_sprint || null,
          who_responsible: body.who_responsible || null,
          how_approach: body.how_approach || null,
          backlog_ref_id: body.backlog_ref_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating action item:', error);
        return createErrorResponse('Failed to create action item', 'CREATE_ERROR');
      }

      return createSuccessResponse({
        message: 'Action item created successfully',
        action,
      });
    }

    // GET /retro-service/stats - Get global retrospective statistics
    if (method === 'GET' && path.endsWith('/stats')) {
      // Check if user is admin (only admins can see global stats)
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return createErrorResponse('Only admins can view global statistics', 'FORBIDDEN', 403);
      }

      const [retrosRes, actionsRes] = await Promise.all([
        supabase.from('retrospectives').select('*', { count: 'exact', head: true }),
        supabase.from('retrospective_action_items').select('*', { count: 'exact', head: true }),
      ]);

      const [convertedRes] = await Promise.all([
        supabase.from('retrospective_action_items').select('*', { count: 'exact', head: true }).eq('converted_to_task', true)
      ]);

      const totalRetrospectives = retrosRes.count || 0;
      const totalActionItems = actionsRes.count || 0;
      const convertedTasks = convertedRes.count || 0;
      const conversionRate = totalActionItems > 0 ? Math.round((convertedTasks / totalActionItems) * 100) : 0;

      return createSuccessResponse({
        totalRetrospectives,
        totalActionItems,
        convertedTasks,
        conversionRate,
      });
    }

    return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404);
  } catch (error) {
    console.error('Retro service error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
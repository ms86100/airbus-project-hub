import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  handleCorsOptions,
  parseRequestBody,
  validateAuthToken,
  logRequest,
} from '../shared/api-utils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // POST /wizard-service/projects/wizard/start
    if (method === 'POST' && path.endsWith('/projects/wizard/start')) {
      const body = await parseRequestBody(req);
      const sessionId = crypto.randomUUID();

      return createSuccessResponse({
        message: 'Wizard started',
        sessionId,
        seed: body || {},
      });
    }

    // POST /wizard-service/projects/wizard/complete
    if (method === 'POST' && path.endsWith('/projects/wizard/complete')) {
      const body = await parseRequestBody(req);
      const { name, description, startDate, endDate, priority, status, departmentId } = body || {};

      if (!name) return createErrorResponse('name is required', 'MISSING_FIELDS');

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
          priority: priority || 'medium',
          status: status || 'planning',
          department_id: departmentId || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project from wizard:', error);
        return createErrorResponse('Failed to create project', 'CREATE_ERROR');
      }

      return createSuccessResponse({ message: 'Project created', project });
    }

    return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404);
  } catch (error) {
    console.error('Wizard service error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
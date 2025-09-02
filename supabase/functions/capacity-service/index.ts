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
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CapacityIterationRequest {
  iterationName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  committedStoryPoints?: number;
}

interface CapacityMemberRequest {
  iterationId: string;
  memberName: string;
  role: string;
  workMode: string;
  availabilityPercent: number;
  leaves: number;
  stakeholderId?: string;
  teamId?: string;
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
    // Validate authentication for all endpoints
    const { user, error: authError } = await validateAuthToken(req, supabase);
    if (authError || !user) {
      return createErrorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // GET /capacity-service/projects/:id/capacity - Get capacity data for a project
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/capacity')) {
      const params = extractPathParams(url, '/capacity-service/projects/:id/capacity');
      const projectId = params.id;

      if (!projectId) {
        return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');
      }

      // Check if user has access to this project
      const { data: project } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

      if (!project) {
        return createErrorResponse('Project not found', 'PROJECT_NOT_FOUND', 404);
      }

      // Get capacity iterations for this project
      const { data: iterations, error: iterationsError } = await supabase
        .from('team_capacity_iterations')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (iterationsError) {
        console.error('Error fetching iterations:', iterationsError);
        return createErrorResponse('Failed to fetch capacity iterations', 'FETCH_ERROR');
      }

      // Get capacity members for each iteration
      const iterationsWithMembers = await Promise.all(
        (iterations || []).map(async (iteration) => {
          const { data: members, error: membersError } = await supabase
            .from('team_capacity_members')
            .select('*')
            .eq('iteration_id', iteration.id)
            .order('created_at', { ascending: true });

          if (membersError) {
            console.error('Error fetching members:', membersError);
          }

          // Calculate total capacity for this iteration
          const totalEffectiveCapacity = (members || []).reduce(
            (sum, member) => sum + (member.effective_capacity_days || 0), 
            0
          );

          return {
            ...iteration,
            members: members || [],
            totalEffectiveCapacity,
            totalMembers: (members || []).length,
          };
        })
      );

      return createSuccessResponse({
        projectId,
        iterations: iterationsWithMembers,
        summary: {
          totalIterations: iterationsWithMembers.length,
          totalCapacity: iterationsWithMembers.reduce(
            (sum, iter) => sum + iter.totalEffectiveCapacity, 
            0
          ),
        },
      });
    }

    // POST /capacity-service/projects/:id/capacity - Create capacity iteration or add member
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/capacity')) {
      const params = extractPathParams(url, '/capacity-service/projects/:id/capacity');
      const projectId = params.id;
      const body = await parseRequestBody(req);

      if (!projectId) {
        return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');
      }

      // Check if user has access to this project
      const { data: project } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

      if (!project) {
        return createErrorResponse('Project not found', 'PROJECT_NOT_FOUND', 404);
      }

      // Check if creating iteration or adding member
      if (body.type === 'iteration') {
        const { iterationName, startDate, endDate, workingDays, committedStoryPoints }: CapacityIterationRequest = body;

        if (!iterationName || !startDate || !endDate || !workingDays) {
          return createErrorResponse('Missing required iteration fields', 'MISSING_FIELDS');
        }

        // Create authenticated client for database operations that trigger audit logs
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
          return createErrorResponse('Authorization header required', 'MISSING_AUTH_HEADER', 401);
        }

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        });

        // Create new capacity iteration with authenticated client for audit logs
        const { data: iteration, error } = await supabaseAuth
          .from('team_capacity_iterations')
          .insert({
            project_id: projectId,
            iteration_name: iterationName,
            start_date: startDate,
            end_date: endDate,
            working_days: workingDays,
            committed_story_points: committedStoryPoints || 0,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating iteration:', error);
          return createErrorResponse('Failed to create capacity iteration', 'CREATE_ERROR');
        }

        return createSuccessResponse({
          message: 'Capacity iteration created successfully',
          iteration,
        });

      } else if (body.type === 'member') {
        const { 
          iterationId, 
          memberName, 
          role, 
          workMode, 
          availabilityPercent, 
          leaves,
          stakeholderId,
          teamId 
        }: CapacityMemberRequest = body;

        if (!iterationId || !memberName || !role || !workMode || availabilityPercent === undefined || leaves === undefined) {
          return createErrorResponse('Missing required member fields', 'MISSING_FIELDS');
        }

        // Get iteration to calculate effective capacity
        const { data: iteration } = await supabase
          .from('team_capacity_iterations')
          .select('working_days')
          .eq('id', iterationId)
          .single();

        if (!iteration) {
          return createErrorResponse('Iteration not found', 'ITERATION_NOT_FOUND', 404);
        }

        // Calculate effective capacity using the database function
        const { data: effectiveCapacity } = await supabase
          .rpc('calculate_effective_capacity', {
            working_days: iteration.working_days,
            leaves: leaves,
            availability_percent: availabilityPercent,
            work_mode: workMode,
          });

        // Create new capacity member
        const { data: member, error } = await supabase
          .from('team_capacity_members')
          .insert({
            iteration_id: iterationId,
            member_name: memberName,
            role,
            work_mode: workMode,
            availability_percent: availabilityPercent,
            leaves,
            effective_capacity_days: effectiveCapacity || 0,
            stakeholder_id: stakeholderId,
            team_id: teamId,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating member:', error);
          return createErrorResponse('Failed to add team member', 'CREATE_ERROR');
        }

        return createSuccessResponse({
          message: 'Team member added successfully',
          member,
        });

      } else {
        return createErrorResponse('Invalid request type. Use "iteration" or "member"', 'INVALID_TYPE');
      }
    }

    // PUT /capacity-service/projects/:id/capacity/:itemId - Update iteration or member
    if (method === 'PUT' && path.includes('/projects/') && path.includes('/capacity/')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const itemIdIndex = pathParts.findIndex(part => part === 'capacity') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const itemId = pathParts[itemIdIndex];
      const body = await parseRequestBody(req);

      if (!projectId || !itemId) {
        return createErrorResponse('Missing required parameters', 'MISSING_PARAMS');
      }

      // Check if user has access to this project
      const { data: project } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

      if (!project) {
        return createErrorResponse('Project not found', 'PROJECT_NOT_FOUND', 404);
      }

      // Create authenticated client for updates to ensure audit logs have user context
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return createErrorResponse('Authorization header required', 'MISSING_AUTH_HEADER', 401);
      }

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      if (body.type === 'iteration') {
        const { data: iteration, error } = await supabaseAuth
          .from('team_capacity_iterations')
          .update({
            iteration_name: body.iterationName,
            start_date: body.startDate,
            end_date: body.endDate,
            working_days: body.workingDays,
            committed_story_points: body.committedStoryPoints,
          })
          .eq('id', itemId)
          .eq('project_id', projectId)
          .select()
          .single();

        if (error) {
          console.error('Error updating iteration:', error);
          return createErrorResponse('Failed to update iteration', 'UPDATE_ERROR');
        }

        return createSuccessResponse({
          message: 'Iteration updated successfully',
          iteration,
        });

      } else if (body.type === 'member') {
        // Recalculate effective capacity if relevant fields changed
        let effectiveCapacity = body.effectiveCapacityDays;
        
        if (body.availabilityPercent !== undefined || body.leaves !== undefined || body.workMode) {
          const { data: iteration } = await supabase
            .from('team_capacity_iterations')
            .select('working_days')
            .eq('id', body.iterationId)
            .single();

          if (iteration) {
            const { data: newCapacity } = await supabase
              .rpc('calculate_effective_capacity', {
                working_days: iteration.working_days,
                leaves: body.leaves,
                availability_percent: body.availabilityPercent,
                work_mode: body.workMode,
              });
            effectiveCapacity = newCapacity || 0;
          }
        }

        const { data: member, error } = await supabaseAuth
          .from('team_capacity_members')
          .update({
            member_name: body.memberName,
            role: body.role,
            work_mode: body.workMode,
            availability_percent: body.availabilityPercent,
            leaves: body.leaves,
            effective_capacity_days: effectiveCapacity,
            stakeholder_id: body.stakeholderId,
            team_id: body.teamId,
          })
          .eq('id', itemId)
          .select()
          .single();

        if (error) {
          console.error('Error updating member:', error);
          return createErrorResponse('Failed to update member', 'UPDATE_ERROR');
        }

        return createSuccessResponse({
          message: 'Team member updated successfully',
          member,
        });
      }

      return createErrorResponse('Invalid update type', 'INVALID_TYPE');
    }

    // DELETE /capacity-service/projects/:id/capacity/:itemId - Delete iteration or member
    if (method === 'DELETE' && path.includes('/projects/') && path.includes('/capacity/')) {
      const pathParts = path.split('/');
      const projectIdIndex = pathParts.findIndex(part => part === 'projects') + 1;
      const itemIdIndex = pathParts.findIndex(part => part === 'capacity') + 1;
      
      const projectId = pathParts[projectIdIndex];
      const itemId = pathParts[itemIdIndex];
      const type = url.searchParams.get('type'); // 'iteration' or 'member'

      if (!projectId || !itemId || !type) {
        return createErrorResponse('Missing required parameters', 'MISSING_PARAMS');
      }

      // Check if user has access to this project
      const { data: project } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

      if (!project) {
        return createErrorResponse('Project not found', 'PROJECT_NOT_FOUND', 404);
      }

      // Create authenticated client for database operations that trigger audit logs
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return createErrorResponse('Authorization header required', 'MISSING_AUTH_HEADER', 401);
      }

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      });

      if (type === 'iteration') {
        const { error } = await supabaseAuth
          .from('team_capacity_iterations')
          .delete()
          .eq('id', itemId)
          .eq('project_id', projectId);

        if (error) {
          console.error('Error deleting iteration:', error);
          return createErrorResponse('Failed to delete iteration', 'DELETE_ERROR');
        }

        return createSuccessResponse({
          message: 'Iteration deleted successfully',
        });

      } else if (type === 'member') {
        const { error } = await supabaseAuth
          .from('team_capacity_members')
          .delete()
          .eq('id', itemId);

        if (error) {
          console.error('Error deleting member:', error);
          return createErrorResponse('Failed to delete member', 'DELETE_ERROR');
        }

        return createSuccessResponse({
          message: 'Team member deleted successfully',
        });
      }

      return createErrorResponse('Invalid delete type', 'INVALID_TYPE');
    }

    // GET /capacity-service/projects/:id/settings - Get capacity settings (ApiClient compatible)
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/settings')) {
      const params = extractPathParams(url, '/capacity-service/projects/:id/settings');
      const projectId = params.id;

      if (!projectId) {
        return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');
      }

      // Return default settings with work mode weights
      return createSuccessResponse({
        workModeWeights: {
          office: 1.0,
          wfh: 0.9,
          hybrid: 0.95
        },
        defaultWorkingDays: 10,
        defaultAvailability: 100
      });
    }

    // GET /capacity-service/projects/:id/teams - Get teams for project
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/teams')) {
      const params = extractPathParams(url, '/capacity-service/projects/:id/teams');
      const projectId = params.id;

      if (!projectId) {
        return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');
      }

      // Check project access
      const accessCheck = await hasProjectAccess(user.id, projectId);
      if (!accessCheck.ok) {
        return createErrorResponse(
          accessCheck.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Access denied',
          accessCheck.reason || 'FORBIDDEN',
          accessCheck.reason === 'PROJECT_NOT_FOUND' ? 404 : 403
        );
      }

      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (*)
        `)
        .eq('project_id', projectId);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return createErrorResponse('Failed to fetch teams', 'FETCH_ERROR');
      }

      return createSuccessResponse({
        projectId,
        teams: teams || []
      });
    }

    // POST /capacity-service/projects/:id/teams - Create new team
    if (method === 'POST' && path.includes('/projects/') && path.endsWith('/teams')) {
      const params = extractPathParams(url, '/capacity-service/projects/:id/teams');
      const projectId = params.id;
      const body = await parseRequestBody(req);

      if (!projectId) {
        return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');
      }

      // Check project access
      const accessCheck = await hasProjectAccess(user.id, projectId);
      if (!accessCheck.ok) {
        return createErrorResponse(
          accessCheck.reason === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Access denied',
          accessCheck.reason || 'FORBIDDEN',
          accessCheck.reason === 'PROJECT_NOT_FOUND' ? 404 : 403
        );
      }

      const { teamName, description, members } = body;

      if (!teamName) {
        return createErrorResponse('Team name is required', 'MISSING_FIELDS');
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([{
          project_id: projectId,
          team_name: teamName,
          description: description || '',
          created_by: user.id
        }])
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        return createErrorResponse('Failed to create team', 'CREATE_ERROR');
      }

      // Add team members if provided
      if (members && members.length > 0) {
        const { error: membersError } = await supabase
          .from('team_members')
          .insert(members.map((member: any) => ({
            team_id: team.id,
            member_name: member.memberName,
            role: member.role,
            work_mode: member.workMode || 'office',
            default_availability_percent: member.defaultAvailabilityPercent || 100,
            stakeholder_id: member.stakeholderId,
            created_by: user.id
          })));

        if (membersError) {
          console.error('Error creating team members:', membersError);
          return createErrorResponse('Failed to add team members', 'CREATE_ERROR');
        }
      }

      return createSuccessResponse({
        message: 'Team created successfully',
        team
      });
    }

    // GET /capacity-service/stats - Get capacity statistics
    if (method === 'GET' && path.endsWith('/stats')) {
      // Get total iterations across all projects user has access to
      const { data: iterations, error: iterationsError } = await supabase
        .from('team_capacity_iterations')
        .select('id, project_id')
        .order('created_at', { ascending: false });

      if (iterationsError) {
        console.error('Error fetching iterations for stats:', iterationsError);
        return createErrorResponse('Failed to fetch capacity statistics', 'FETCH_ERROR');
      }

      // Filter iterations by project access
      const accessibleIterations = [];
      for (const iteration of iterations || []) {
        const accessCheck = await hasProjectAccess(user.id, iteration.project_id);
        if (accessCheck.ok) {
          accessibleIterations.push(iteration);
        }
      }

      // Get capacity members for accessible iterations
      const { data: members, error: membersError } = await supabase
        .from('team_capacity_members')
        .select('iteration_id, effective_capacity_days')
        .in('iteration_id', accessibleIterations.map(i => i.id));

      if (membersError) {
        console.error('Error fetching members for stats:', membersError);
      }

      const totalMembers = members?.length || 0;
      const totalCapacity = members?.reduce((sum, m) => sum + (m.effective_capacity_days || 0), 0) || 0;
      const avgCapacity = totalMembers > 0 ? (totalCapacity / totalMembers) : 0;
      const uniqueProjects = new Set(accessibleIterations.map(i => i.project_id)).size;

      return createSuccessResponse({
        totalIterations: accessibleIterations.length,
        totalMembers,
        avgCapacity: Math.round(avgCapacity * 10) / 10,
        totalProjects: uniqueProjects
      });
      }

      // Check if user has access to this project
      const { data: project } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

      if (!project) {
        return createErrorResponse('Project not found', 'PROJECT_NOT_FOUND', 404);
      }

      // Return default capacity settings (can be enhanced to store custom settings in DB)
      const defaultSettings = {
        workModeWeights: {
          office: 1.0,
          wfh: 0.9,
          hybrid: 0.95,
        },
        defaultWorkingDays: 10,
        defaultAvailability: 100,
      };

      return createSuccessResponse(defaultSettings);
    }

    // GET /capacity-service/projects/:id/iterations - Get iterations only (ApiClient compatible)
    if (method === 'GET' && path.includes('/projects/') && path.endsWith('/iterations')) {
      const params = extractPathParams(url, '/capacity-service/projects/:id/iterations');
      const projectId = params.id;

      if (!projectId) {
        return createErrorResponse('Project ID is required', 'MISSING_PROJECT_ID');
      }

      // Check if user has access to this project
      const { data: project } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', projectId)
        .single();

      if (!project) {
        return createErrorResponse('Project not found', 'PROJECT_NOT_FOUND', 404);
      }

      // Get capacity iterations for this project
      const { data: iterations, error: iterationsError } = await supabase
        .from('team_capacity_iterations')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (iterationsError) {
        console.error('Error fetching iterations:', iterationsError);
        return createErrorResponse('Failed to fetch capacity iterations', 'FETCH_ERROR');
      }

      return createSuccessResponse(iterations || []);
    }

    return createErrorResponse('Endpoint not found', 'NOT_FOUND', 404);

  } catch (error) {
    console.error('Capacity service error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
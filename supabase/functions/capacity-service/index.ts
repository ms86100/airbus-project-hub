import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const url = new URL(req.url);
    const normalizedPath = url.pathname
      .replace(/^\/functions\/v1\/capacity-service/, '')
      .replace(/^\/capacity-service/, '') || '/';
    const pathParts = normalizedPath.split('/').filter(Boolean);
    console.log(`[${req.method}] ${normalizedPath} - User: ${user.id}`);

    if (req.method === 'GET') {
      // GET /projects/:projectId/teams
      if (pathParts[0] === 'projects' && pathParts[2] === 'teams') {
        const projectId = pathParts[1];
        
        const { data: teams, error } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            description,
            project_id,
            created_at
          `)
          .eq('project_id', projectId);

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get member counts for each team
        const teamsWithCounts = [];
        for (const team of teams || []) {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);
            
          teamsWithCounts.push({
            ...team,
            member_count: count || 0
          });
        }

        return new Response(
          JSON.stringify({ success: true, data: teamsWithCounts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /teams/:teamId/members
      if (pathParts[0] === 'teams' && pathParts[2] === 'members') {
        const teamId = pathParts[1];
        
        const { data: members, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId);

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: members || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /projects/:projectId/iterations
      if (pathParts[0] === 'projects' && pathParts[2] === 'iterations') {
        const projectId = pathParts[1];
        
        const { data: iterations, error } = await supabase
          .from('iterations')
          .select(`
            id,
            name,
            type,
            project_id,
            team_id,
            start_date,
            end_date,
            weeks_count,
            created_at
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get team names
        const iterationsWithTeamNames = [];
        for (const iteration of iterations || []) {
          const { data: team } = await supabase
            .from('teams')
            .select('name')
            .eq('id', iteration.team_id)
            .single();
            
          iterationsWithTeamNames.push({
            ...iteration,
            team_name: team?.name || 'Unknown Team'
          });
        }

        return new Response(
          JSON.stringify({ success: true, data: iterationsWithTeamNames }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /iterations/:iterationId
      if (pathParts[0] === 'iterations' && pathParts.length === 2) {
        const iterationId = pathParts[1];
        
        // Get iteration details
        const { data: iteration, error: iterationError } = await supabase
          .from('iterations')
          .select('*')
          .eq('id', iterationId)
          .single();

        if (iterationError) {
          return new Response(
            JSON.stringify({ success: false, error: iterationError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get iteration weeks
        const { data: weeks, error: weeksError } = await supabase
          .from('iteration_weeks')
          .select('*')
          .eq('iteration_id', iterationId)
          .order('week_index');

        // Get weekly availability
        const { data: availability, error: availabilityError } = await supabase
          .from('member_weekly_availability')
          .select('*')
          .in('iteration_week_id', weeks?.map(w => w.id) || []);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              iteration,
              weeks: weeks || [],
              availability: availability || []
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();

      // POST /projects/:projectId/teams
      if (pathParts[0] === 'projects' && pathParts[2] === 'teams') {
        const projectId = pathParts[1];
        
        const { data: team, error } = await supabase
          .from('teams')
          .insert({
            project_id: projectId,
            name: body.name,
            description: body.description,
            created_by: user.id
          })
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: team }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /teams/:teamId/members
      if (pathParts[0] === 'teams' && pathParts[2] === 'members') {
        const teamId = pathParts[1];
        
        let member = null;
        let lastError: any = null;

        const nameValue = body.member_name ?? body.display_name ?? body.name;
        const payloads = [
          { team_id: teamId, member_name: nameValue, role: body.role ?? null, email: body.email ?? null },
          { team_id: teamId, display_name: nameValue, role: body.role ?? null, email: body.email ?? null },
          { team_id: teamId, name: nameValue, role: body.role ?? null, email: body.email ?? null },
        ];

        for (const payload of payloads) {
          const { data, error } = await supabase
            .from('team_members')
            .insert(payload)
            .select()
            .maybeSingle();
          if (!error && data) {
            member = data;
            break;
          }
          lastError = error;
        }

        if (!member) {
          return new Response(
            JSON.stringify({ success: false, error: lastError?.message || 'Failed to create member' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: member }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /projects/:projectId/iterations
      if (pathParts[0] === 'projects' && pathParts[2] === 'iterations') {
        const projectId = pathParts[1];
        
        // Create iteration
        const { data: iteration, error: iterationError } = await supabase
          .from('iterations')
          .insert({
            project_id: projectId,
            team_id: body.team_id,
            name: body.name,
            type: body.type,
            start_date: body.start_date,
            end_date: body.end_date,
            weeks_count: body.weeks_count,
            created_by: user.id
          })
          .select()
          .single();

        if (iterationError) {
          return new Response(
            JSON.stringify({ success: false, error: iterationError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Generate iteration weeks
        const weeks = [];
        const startDate = new Date(body.start_date);
        
        for (let i = 0; i < body.weeks_count; i++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          // Don't let week end go beyond iteration end date
          const iterationEnd = new Date(body.end_date);
          if (weekEnd > iterationEnd) {
            weekEnd.setTime(iterationEnd.getTime());
          }
          
          weeks.push({
            iteration_id: iteration.id,
            week_index: i + 1,
            week_start: weekStart.toISOString().split('T')[0],
            week_end: weekEnd.toISOString().split('T')[0]
          });
        }

        // Insert weeks
        if (weeks.length > 0) {
          await supabase
            .from('iteration_weeks')
            .insert(weeks);
        }

        return new Response(
          JSON.stringify({ success: true, data: iteration }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /iterations/:iterationId/availability
      if (pathParts[0] === 'iterations' && pathParts[2] === 'availability') {
        const iterationId = pathParts[1];
        
        // Insert or update availability data
        const availabilityData = body.availability.map((avail: any) => ({
          ...avail,
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('member_weekly_availability')
          .upsert(availabilityData, {
            onConflict: 'iteration_week_id,team_member_id'
          });

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Availability saved successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Endpoint not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
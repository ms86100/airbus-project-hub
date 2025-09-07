-- Check if teams table exists and create it with proper schema
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS iterations CASCADE;
DROP TABLE IF EXISTS iteration_weeks CASCADE;
DROP TABLE IF EXISTS member_weekly_availability CASCADE;

-- Create teams table with proper schema
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  work_mode TEXT DEFAULT 'office',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create iterations table
CREATE TABLE public.iterations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  weeks_count INTEGER NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create iteration_weeks table
CREATE TABLE public.iteration_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iteration_id UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
  week_index INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create member_weekly_availability table
CREATE TABLE public.member_weekly_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iteration_week_id UUID NOT NULL REFERENCES iteration_weeks(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  leaves INTEGER DEFAULT 0,
  availability_percent INTEGER DEFAULT 100,
  effective_capacity NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(iteration_week_id, team_member_id)
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iteration_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_weekly_availability ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams
CREATE POLICY "Users can view teams in their projects" ON teams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = teams.project_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create teams in their projects" ON teams
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = teams.project_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update teams in their projects" ON teams
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = teams.project_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete teams in their projects" ON teams
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = teams.project_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Create similar policies for other tables
CREATE POLICY "Users can manage team members" ON team_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = team_members.team_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage iterations" ON iterations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = iterations.project_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage iteration weeks" ON iteration_weeks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM iterations i
    JOIN projects p ON p.id = i.project_id
    WHERE i.id = iteration_weeks.iteration_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage availability" ON member_weekly_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM iteration_weeks iw
    JOIN iterations i ON i.id = iw.iteration_id
    JOIN projects p ON p.id = i.project_id
    WHERE iw.id = member_weekly_availability.iteration_week_id 
    AND (
      p.created_by = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iterations_updated_at
  BEFORE UPDATE ON iterations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iteration_weeks_updated_at
  BEFORE UPDATE ON iteration_weeks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON member_weekly_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
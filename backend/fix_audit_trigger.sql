-- Fix audit trigger for local development
-- Run this script in your local PostgreSQL database

-- Option 1: Update the audit trigger to handle null user_id
CREATE OR REPLACE FUNCTION public.log_audit_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _project_id UUID;
  _module module_name;
  _entity_type TEXT;
  _action TEXT;
  _description TEXT;
  _user_id UUID;
BEGIN
  -- Get user_id from the record being modified (fallback for local dev)
  _user_id := COALESCE(
    (SELECT auth.uid()), -- This will be null in local dev
    COALESCE(NEW.created_by, OLD.created_by), -- Use created_by from the record
    '00000000-0000-0000-0000-000000000000'::uuid -- Default fallback
  );

  -- Determine project_id and module based on table
  CASE TG_TABLE_NAME
    WHEN 'tasks' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'tasks_milestones';
      _entity_type := 'task';
    WHEN 'milestones' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'tasks_milestones';
      _entity_type := 'milestone';
    WHEN 'stakeholders' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'stakeholders';
      _entity_type := 'stakeholder';
    WHEN 'risk_register' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'risk_register';
      _entity_type := 'risk';
    WHEN 'project_discussions' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'discussions';
      _entity_type := 'discussion';
    WHEN 'task_backlog' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'task_backlog';
      _entity_type := 'backlog_item';
    WHEN 'retrospectives' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'retrospectives';
      _entity_type := 'retrospective';
    WHEN 'team_capacity_iterations' THEN
      _project_id := COALESCE(NEW.project_id, OLD.project_id);
      _module := 'team_capacity';
      _entity_type := 'capacity_iteration';
    ELSE
      RETURN COALESCE(NEW, OLD);
  END CASE;

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    _action := 'created';
    _description := _entity_type || ' created';
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'updated';
    _description := _entity_type || ' updated';
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'deleted';
    _description := _entity_type || ' deleted';
  END IF;

  -- Insert audit log entry (skip if user_id is still null)
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.audit_log (
      project_id,
      user_id,
      module,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      description
    ) VALUES (
      _project_id,
      _user_id,
      _module,
      _action,
      _entity_type,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      _description
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Option 2: If you prefer to disable audit logging for local development
-- Uncomment the lines below instead:

-- DROP TRIGGER IF EXISTS audit_tasks ON tasks;
-- DROP TRIGGER IF EXISTS audit_milestones ON milestones;
-- DROP TRIGGER IF EXISTS audit_stakeholders ON stakeholders;
-- DROP TRIGGER IF EXISTS audit_risk_register ON risk_register;
-- DROP TRIGGER IF EXISTS audit_project_discussions ON project_discussions;
-- DROP TRIGGER IF EXISTS audit_task_backlog ON task_backlog;
-- DROP TRIGGER IF EXISTS audit_retrospectives ON retrospectives;
-- DROP TRIGGER IF EXISTS audit_team_capacity_iterations ON team_capacity_iterations;
-- Fix team capacity functions/triggers for localhost (no table creation)
-- Uses existing tables: public.team_capacity_iterations, public.team_capacity_members

-- 1) Working days for members (fixes "current_date" syntax error by using work_day variable)
CREATE OR REPLACE FUNCTION public.calculate_member_working_days()
RETURNS trigger AS $$
DECLARE
  start_d date;
  end_d date;
  work_day date;
  wd integer := 0;
BEGIN
  SELECT tci.start_date, tci.end_date
  INTO start_d, end_d
  FROM public.team_capacity_iterations tci
  WHERE tci.id = NEW.iteration_id;

  IF start_d IS NULL OR end_d IS NULL THEN
    NEW.working_days := COALESCE(NEW.working_days, 0);
    RETURN NEW;
  END IF;

  work_day := start_d;
  wd := 0;
  WHILE work_day <= end_d LOOP
    IF EXTRACT(DOW FROM work_day) NOT IN (0, 6) THEN
      wd := wd + 1;
    END IF;
    work_day := work_day + INTERVAL '1 day';
  END LOOP;

  NEW.working_days := wd;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_member_working_days ON public.team_capacity_members;
CREATE TRIGGER trigger_calculate_member_working_days
  BEFORE INSERT OR UPDATE ON public.team_capacity_members
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_member_working_days();

-- 2) Working days for iterations
CREATE OR REPLACE FUNCTION public.calculate_iteration_working_days()
RETURNS trigger AS $$
DECLARE
  work_day date;
  wd integer := 0;
BEGIN
  work_day := NEW.start_date;
  wd := 0;
  WHILE work_day <= NEW.end_date LOOP
    IF EXTRACT(DOW FROM work_day) NOT IN (0, 6) THEN
      wd := wd + 1;
    END IF;
    work_day := work_day + INTERVAL '1 day';
  END LOOP;

  NEW.working_days := wd;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_iteration_working_days ON public.team_capacity_iterations;
CREATE TRIGGER trigger_calculate_iteration_working_days
  BEFORE INSERT OR UPDATE ON public.team_capacity_iterations
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_iteration_working_days();

-- 3) Effective capacity for members (uses existing public.calculate_effective_capacity function)
CREATE OR REPLACE FUNCTION public.trg_member_effective_capacity()
RETURNS trigger AS $$
BEGIN
  NEW.effective_capacity_days := public.calculate_effective_capacity(
    NEW.working_days,
    NEW.leaves,
    NEW.availability_percent,
    COALESCE(NEW.work_mode, 'office')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_member_effective_capacity ON public.team_capacity_members;
CREATE TRIGGER trigger_member_effective_capacity
  BEFORE INSERT OR UPDATE ON public.team_capacity_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_member_effective_capacity();

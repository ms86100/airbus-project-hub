-- Create missing budget spending function that analytics service needs
CREATE OR REPLACE FUNCTION public.get_project_budget_spending(project_id_param UUID)
RETURNS TABLE(
  project_id UUID,
  total_allocated NUMERIC,
  total_spent NUMERIC,
  category_count BIGINT,
  spending_entries_count BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id as project_id,
    COALESCE(SUM(bc.budget_allocated), 0) as total_allocated,
    COALESCE(SUM(bc.amount_spent), 0) as total_spent,
    COUNT(DISTINCT bc.id) as category_count,
    COALESCE(SUM(
      (SELECT COUNT(*) FROM budget_spending bs WHERE bs.budget_category_id = bc.id)
    ), 0) as spending_entries_count
  FROM projects p
  LEFT JOIN project_budgets pb ON pb.project_id = p.id
  LEFT JOIN budget_categories bc ON bc.project_budget_id = pb.id
  WHERE p.id = project_id_param
  GROUP BY p.id;
$$;
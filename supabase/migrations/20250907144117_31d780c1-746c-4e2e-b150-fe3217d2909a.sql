-- Fix budget-service relations and enum for cloud without affecting localhost

-- 1) Ensure FK between budget_categories and project_budgets so PostgREST can infer relationships
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_budget_categories_project_budget'
  ) THEN
    ALTER TABLE public.budget_categories
    ADD CONSTRAINT fk_budget_categories_project_budget
    FOREIGN KEY (project_budget_id)
    REFERENCES public.project_budgets(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful index for relationship
CREATE INDEX IF NOT EXISTS idx_budget_categories_project_budget_id
  ON public.budget_categories(project_budget_id);

-- 2) Ensure FK between budget_spending and budget_categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_budget_spending_category'
  ) THEN
    ALTER TABLE public.budget_spending
    ADD CONSTRAINT fk_budget_spending_category
    FOREIGN KEY (budget_category_id)
    REFERENCES public.budget_categories(id)
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budget_spending_category_id
  ON public.budget_spending(budget_category_id);

-- 3) (Optional but consistent) FKs for other budget tables used by service
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_budget_receipts_project_budget'
  ) THEN
    ALTER TABLE public.budget_receipts
    ADD CONSTRAINT fk_budget_receipts_project_budget
    FOREIGN KEY (project_budget_id)
    REFERENCES public.project_budgets(id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_budget_comments_project_budget'
  ) THEN
    ALTER TABLE public.budget_comments
    ADD CONSTRAINT fk_budget_comments_project_budget
    FOREIGN KEY (project_budget_id)
    REFERENCES public.project_budgets(id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_budget_alert_rules_project_budget'
  ) THEN
    ALTER TABLE public.budget_alert_rules
    ADD CONSTRAINT fk_budget_alert_rules_project_budget
    FOREIGN KEY (project_budget_id)
    REFERENCES public.project_budgets(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Optional index helpers
CREATE INDEX IF NOT EXISTS idx_budget_receipts_project_budget_id
  ON public.budget_receipts(project_budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_comments_project_budget_id
  ON public.budget_comments(project_budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alert_rules_project_budget_id
  ON public.budget_alert_rules(project_budget_id);

-- 4) Add missing enum value for module_name used by access audit ('budget')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'module_name' AND e.enumlabel = 'budget'
  ) THEN
    ALTER TYPE public.module_name ADD VALUE 'budget';
  END IF;
END $$;
-- Insert sample budget data for the project
INSERT INTO project_budgets (id, project_id, total_budget_allocated, total_budget_received, currency, start_date, end_date, created_by, department_id) 
VALUES (
  gen_random_uuid(),
  '67c23315-401b-4c4d-9992-5bc3424e824a',
  50000,
  45000,
  'INR',
  '2025-09-01',
  '2025-12-31',
  '6dc39f1e-2af3-4b78-8488-317d90f4f538',
  '3af3b0f4-adca-4f11-826c-20ed36b31d46'
);

-- Insert budget categories
INSERT INTO budget_categories (id, project_budget_id, name, budget_allocated, budget_received, amount_spent, budget_type_code, comments, created_by)
SELECT 
  gen_random_uuid(),
  pb.id,
  category_name,
  allocated,
  received,
  spent,
  type_code,
  comment_text,
  '6dc39f1e-2af3-4b78-8488-317d90f4f538'
FROM project_budgets pb,
(VALUES 
  ('Development', 20000, 18000, 15000, 'DEV', 'Software development costs'),
  ('Infrastructure', 15000, 15000, 8000, 'INFRA', 'Server and hosting costs'),
  ('Marketing', 10000, 8000, 5000, 'MKT', 'Marketing and promotion'),
  ('Operations', 5000, 4000, 2000, 'OPS', 'General operations')
) AS categories(category_name, allocated, received, spent, type_code, comment_text)
WHERE pb.project_id = '67c23315-401b-4c4d-9992-5bc3424e824a';

-- Insert stakeholders
INSERT INTO stakeholders (id, project_id, name, role, contact_email, influence_level, interest_level, communication_frequency, created_by, department_id)
VALUES 
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', 'John Smith', 'Project Sponsor', 'john.smith@company.com', 'high', 'high', 'weekly', '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46'),
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', 'Sarah Johnson', 'Technical Lead', 'sarah.johnson@company.com', 'high', 'high', 'daily', '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46'),
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', 'Mike Chen', 'Business Analyst', 'mike.chen@company.com', 'medium', 'high', 'weekly', '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46');

-- Insert team capacity iterations
INSERT INTO team_capacity_iterations (id, project_id, name, start_date, end_date, status, created_by, department_id)
VALUES 
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', 'Sprint 1', '2025-09-01', '2025-09-15', 'completed', '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46'),
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', 'Sprint 2', '2025-09-16', '2025-09-30', 'active', '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46');

-- Insert team members
INSERT INTO team_members (id, project_id, user_id, role, capacity_hours_per_week, efficiency_rating, created_by, department_id)
VALUES 
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', '6dc39f1e-2af3-4b78-8488-317d90f4f538', 'Project Manager', 40, 95, '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46'),
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', '250524df-1dd3-4657-a378-91b036b81db7', 'Developer', 40, 88, '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46');

-- Insert retrospectives
INSERT INTO retrospectives (id, project_id, framework, status, iteration_id, created_by, department_id)
VALUES 
  (gen_random_uuid(), '67c23315-401b-4c4d-9992-5bc3424e824a', 'What Went Well', 'completed', 'Sprint 1', '6dc39f1e-2af3-4b78-8488-317d90f4f538', '3af3b0f4-adca-4f11-826c-20ed36b31d46');

-- Update some existing tasks to completed status
UPDATE tasks 
SET status = 'completed', updated_at = now()
WHERE project_id = '67c23315-401b-4c4d-9992-5bc3424e824a' 
AND id IN (
  SELECT id FROM tasks 
  WHERE project_id = '67c23315-401b-4c4d-9992-5bc3424e824a' 
  LIMIT 3
);
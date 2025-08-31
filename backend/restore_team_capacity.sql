-- SQL script to restore team capacity functionality for localhost
-- Run this script in your PostgreSQL database to restore the team capacity logic

-- First, let's ensure we have the stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    influence VARCHAR(50) DEFAULT 'medium',
    interest VARCHAR(50) DEFAULT 'medium',
    communication_preference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create capacity iterations table
CREATE TABLE IF NOT EXISTS capacity_iterations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_days INTEGER DEFAULT 0,
    committed_story_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create team capacity members table based on stakeholders
CREATE TABLE IF NOT EXISTS team_capacity_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id UUID REFERENCES capacity_iterations(id) ON DELETE CASCADE,
    stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
    member_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    work_mode VARCHAR(50) DEFAULT 'full-time',
    availability_percent INTEGER DEFAULT 100 CHECK (availability_percent >= 0 AND availability_percent <= 100),
    leaves INTEGER DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    effective_capacity_days DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(iteration_id, stakeholder_id)
);

-- Create function to calculate effective capacity
CREATE OR REPLACE FUNCTION calculate_effective_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate effective capacity: (working_days - leaves) * (availability_percent / 100)
    NEW.effective_capacity_days = (NEW.working_days - NEW.leaves) * (NEW.availability_percent / 100.0);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate effective capacity
DROP TRIGGER IF EXISTS trigger_calculate_effective_capacity ON team_capacity_members;
CREATE TRIGGER trigger_calculate_effective_capacity
    BEFORE INSERT OR UPDATE ON team_capacity_members
    FOR EACH ROW
    EXECUTE FUNCTION calculate_effective_capacity();

-- Create function to update working days based on iteration dates
CREATE OR REPLACE FUNCTION calculate_working_days_for_iteration()
RETURNS TRIGGER AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    total_days INTEGER;
    working_days INTEGER;
    current_date DATE;
BEGIN
    -- Get iteration dates
    SELECT ci.start_date, ci.end_date 
    INTO start_date, end_date
    FROM capacity_iterations ci 
    WHERE ci.id = NEW.iteration_id;
    
    -- Calculate working days (excluding weekends)
    working_days := 0;
    current_date := start_date;
    
    WHILE current_date <= end_date LOOP
        -- Add day if it's not weekend (1=Sunday, 7=Saturday in PostgreSQL)
        IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
            working_days := working_days + 1;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    NEW.working_days = working_days;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate working days for team members
DROP TRIGGER IF EXISTS trigger_calculate_working_days ON team_capacity_members;
CREATE TRIGGER trigger_calculate_working_days
    BEFORE INSERT OR UPDATE ON team_capacity_members
    FOR EACH ROW
    EXECUTE FUNCTION calculate_working_days_for_iteration();

-- Update capacity iterations to auto-calculate working days
CREATE OR REPLACE FUNCTION calculate_iteration_working_days()
RETURNS TRIGGER AS $$
DECLARE
    working_days INTEGER;
    current_date DATE;
BEGIN
    -- Calculate working days (excluding weekends)
    working_days := 0;
    current_date := NEW.start_date;
    
    WHILE current_date <= NEW.end_date LOOP
        -- Add day if it's not weekend (1=Sunday, 7=Saturday in PostgreSQL)
        IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
            working_days := working_days + 1;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    NEW.working_days = working_days;
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for iterations
DROP TRIGGER IF EXISTS trigger_calculate_iteration_working_days ON capacity_iterations;
CREATE TRIGGER trigger_calculate_iteration_working_days
    BEFORE INSERT OR UPDATE ON capacity_iterations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_iteration_working_days();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_capacity_iterations_project_id ON capacity_iterations(project_id);
CREATE INDEX IF NOT EXISTS idx_team_capacity_members_iteration_id ON team_capacity_members(iteration_id);
CREATE INDEX IF NOT EXISTS idx_team_capacity_members_stakeholder_id ON team_capacity_members(stakeholder_id);

-- Insert some sample data if tables are empty (optional)
-- You can remove this section if you don't want sample data

-- Sample stakeholders (only if none exist)
INSERT INTO stakeholders (project_id, name, role, department, email)
SELECT 
    p.id,
    'John Doe',
    'Frontend Developer',
    'Engineering',
    'john.doe@company.com'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM stakeholders WHERE project_id = p.id)
LIMIT 1;

INSERT INTO stakeholders (project_id, name, role, department, email)
SELECT 
    p.id,
    'Jane Smith',
    'Backend Developer',
    'Engineering',
    'jane.smith@company.com'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM stakeholders WHERE project_id = p.id AND name = 'Jane Smith')
LIMIT 1;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Team Capacity tables have been successfully restored!';
    RAISE NOTICE 'Tables created: stakeholders, capacity_iterations, team_capacity_members';
    RAISE NOTICE 'Functions created: calculate_effective_capacity, calculate_working_days_for_iteration, calculate_iteration_working_days';
    RAISE NOTICE 'Triggers created for auto-calculation of working days and effective capacity';
END $$;
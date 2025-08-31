const express = require('express');
const { query } = require('../config/database');
const { verifyToken, verifyProjectAccess } = require('../middleware/auth');
const { createSuccessResponse, createErrorResponse, sendResponse } = require('../utils/responses');

const router = express.Router();

// GET /workspace-service/projects/:id/workspace
router.get('/projects/:id/workspace', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    
    // Get project summary
    const projectQuery = `
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_tasks,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as total_milestones,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'completed') as completed_milestones,
        d.name as department_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.id = $1
    `;
    
    const projectResult = await query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      return sendResponse(res, createErrorResponse('Project not found', 'NOT_FOUND', 404));
    }
    
    const project = projectResult.rows[0];
    
    // Get recent tasks
    const recentTasksQuery = `
      SELECT t.*, m.name as milestone_name, pr.full_name as created_by_name
      FROM tasks t
      LEFT JOIN milestones m ON t.milestone_id = m.id
      LEFT JOIN profiles pr ON t.created_by = pr.id
      WHERE t.project_id = $1
      ORDER BY t.updated_at DESC
      LIMIT 10
    `;
    
    const recentTasksResult = await query(recentTasksQuery, [projectId]);
    
    // Get upcoming milestones
    const upcomingMilestonesQuery = `
      SELECT m.*, pr.full_name as created_by_name,
        CASE 
          WHEN m.due_date < CURRENT_DATE AND m.status NOT IN ('completed') THEN true
          ELSE false
        END as overdue
      FROM milestones m
      LEFT JOIN profiles pr ON m.created_by = pr.id
      WHERE m.project_id = $1 AND m.status != 'completed'
      ORDER BY m.due_date
      LIMIT 5
    `;
    
    const upcomingMilestonesResult = await query(upcomingMilestonesQuery, [projectId]);
    
    // Calculate completion percentages
    const taskCompletionRate = project.total_tasks > 0 
      ? Math.round((project.completed_tasks / project.total_tasks) * 100) 
      : 0;
    
    const milestoneCompletionRate = project.total_milestones > 0 
      ? Math.round((project.completed_milestones / project.total_milestones) * 100) 
      : 0;
    
    const summary = {
      ...project,
      taskCompletionRate,
      milestoneCompletionRate
    };
    
    sendResponse(res, createSuccessResponse({
      projectId,
      summary,
      recentTasks: recentTasksResult.rows,
      upcomingMilestones: upcomingMilestonesResult.rows
    }));
  } catch (error) {
    console.error('Get workspace error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch workspace data', 'FETCH_ERROR', 500));
  }
});

// GET /workspace-service/projects/:id/tasks
router.get('/projects/:id/tasks', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    const tasksQuery = `
      SELECT t.*, m.name AS milestone_name
      FROM tasks t
      LEFT JOIN milestones m ON t.milestone_id = m.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await query(tasksQuery, [projectId]);
    sendResponse(res, createSuccessResponse(result.rows));
  } catch (error) {
    console.error('Get project tasks error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch tasks', 'FETCH_ERROR', 500));
  }
});

// GET /workspace-service/projects/:id/milestones
router.get('/projects/:id/milestones', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    const milestonesQuery = `
      SELECT m.*, COALESCE(COUNT(t.id), 0) AS task_count
      FROM milestones m
      LEFT JOIN tasks t ON t.milestone_id = m.id
      WHERE m.project_id = $1
      GROUP BY m.id
      ORDER BY m.due_date NULLS LAST, m.created_at DESC
    `;
    const result = await query(milestonesQuery, [projectId]);
    sendResponse(res, createSuccessResponse(result.rows));
  } catch (error) {
    console.error('Get project milestones error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch milestones', 'FETCH_ERROR', 500));
  }
});

module.exports = router;
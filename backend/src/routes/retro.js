const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyToken, verifyProjectAccess, verifyAdmin } = require('../middleware/auth');
const { createSuccessResponse, createErrorResponse, sendResponse } = require('../utils/responses');

const router = express.Router();

// GET /retro-service/projects/:id/retrospectives
router.get('/projects/:id/retrospectives', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    
    const retrospectivesQuery = `
      SELECT r.*, pr.full_name as created_by_name
      FROM retrospectives r
      LEFT JOIN profiles pr ON r.created_by = pr.id
      WHERE r.project_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await query(retrospectivesQuery, [projectId]);
    
    sendResponse(res, createSuccessResponse(result.rows));
  } catch (error) {
    console.error('Get retrospectives error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch retrospectives', 'FETCH_ERROR', 500));
  }
});

// POST /retro-service/projects/:id/retrospectives
router.post('/projects/:id/retrospectives', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    const userId = req.user.id;
    const { framework, iterationId, columns } = req.body;
    
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      const retrospectiveId = uuidv4();
      const now = new Date();
      
      // Create retrospective
      const retroResult = await client.query(`
        INSERT INTO retrospectives (id, project_id, iteration_id, framework, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        retrospectiveId,
        projectId,
        iterationId || retrospectiveId, // Use retro ID if no iteration provided
        framework || 'Classic',
        'active',
        userId,
        now,
        now
      ]);
      
      // Create default columns if provided
      if (columns && Array.isArray(columns)) {
        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          const columnId = uuidv4();
          
          await client.query(`
            INSERT INTO retrospective_columns (id, retrospective_id, title, subtitle, column_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            columnId,
            retrospectiveId,
            column.title,
            column.subtitle || null,
            i,
            now,
            now
          ]);
        }
      } else {
        // Create default columns for Classic framework
        const defaultColumns = [
          { title: 'What went well?', subtitle: 'Things that worked' },
          { title: 'What could be improved?', subtitle: 'Areas for growth' },
          { title: 'Action items', subtitle: 'Next steps' }
        ];
        
        for (let i = 0; i < defaultColumns.length; i++) {
          const column = defaultColumns[i];
          const columnId = uuidv4();
          
          await client.query(`
            INSERT INTO retrospective_columns (id, retrospective_id, title, subtitle, column_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            columnId,
            retrospectiveId,
            column.title,
            column.subtitle,
            i,
            now,
            now
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      sendResponse(res, createSuccessResponse({
        message: 'Retrospective created successfully',
        retrospective: retroResult.rows[0]
      }));
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Create retrospective error:', error);
    sendResponse(res, createErrorResponse('Failed to create retrospective', 'CREATE_ERROR', 500));
  }
});

// POST /retro-service/retrospectives/:id/actions
router.post('/retrospectives/:id/actions', verifyToken, async (req, res) => {
  try {
    const retrospectiveId = req.params.id;
    const userId = req.user.id;
    const { what_task, when_sprint, who_responsible, how_approach, backlog_ref_id } = req.body;
    
    if (!what_task) {
      return sendResponse(res, createErrorResponse('Task description required', 'MISSING_FIELDS', 400));
    }

    // Verify user has access to the retrospective's project
    const accessQuery = `
      SELECT EXISTS (
        SELECT 1 FROM retrospectives r
        JOIN projects p ON r.project_id = p.id
        WHERE r.id = $1 AND (
          p.created_by = $2 OR
          EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = $2 AND ur.role = 'admin') OR
          EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2) OR
          EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.project_id = p.id AND mp.user_id = $2)
        )
      ) as has_access
    `;
    
    const accessResult = await query(accessQuery, [retrospectiveId, userId]);
    
    if (!accessResult.rows[0].has_access) {
      return sendResponse(res, createErrorResponse('Retrospective access denied', 'FORBIDDEN', 403));
    }

    const actionId = uuidv4();
    const now = new Date();
    
    const insertQuery = `
      INSERT INTO retrospective_action_items (id, retrospective_id, what_task, when_sprint, who_responsible, how_approach, backlog_ref_id, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      actionId,
      retrospectiveId,
      what_task,
      when_sprint || null,
      who_responsible || null,
      how_approach || null,
      backlog_ref_id || null,
      userId,
      now,
      now
    ]);
    
    sendResponse(res, createSuccessResponse({
      message: 'Action item created successfully',
      action: result.rows[0]
    }));
  } catch (error) {
    console.error('Create action item error:', error);
    sendResponse(res, createErrorResponse('Failed to create action item', 'CREATE_ERROR', 500));
  }
});

// GET /retro-service/stats
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM retrospectives) as total_retrospectives,
        (SELECT COUNT(*) FROM retrospective_action_items) as total_action_items,
        (SELECT COUNT(*) FROM retrospective_action_items WHERE converted_to_task = true) as converted_tasks,
        CASE 
          WHEN (SELECT COUNT(*) FROM retrospective_action_items) > 0 
          THEN (SELECT COUNT(*) FROM retrospective_action_items WHERE converted_to_task = true) * 100.0 / (SELECT COUNT(*) FROM retrospective_action_items)
          ELSE 0
        END as conversion_rate
    `;
    
    const result = await query(statsQuery);
    const stats = result.rows[0];
    
    sendResponse(res, createSuccessResponse({
      totalRetrospectives: parseInt(stats.total_retrospectives),
      totalActionItems: parseInt(stats.total_action_items),
      convertedTasks: parseInt(stats.converted_tasks),
      conversionRate: parseFloat(stats.conversion_rate) || 0
    }));
  } catch (error) {
    console.error('Get retro stats error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch retrospective statistics', 'STATS_ERROR', 500));
  }
});

module.exports = router;
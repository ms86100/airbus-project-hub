const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyToken, verifyProjectAccess, verifyAdmin } = require('../middleware/auth');
const { createSuccessResponse, createErrorResponse, sendResponse } = require('../utils/responses');

const router = express.Router();

// GET /capacity-service/projects/:id/capacity
router.get('/projects/:id/capacity', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    
    // Get iterations
    const iterationsQuery = `
      SELECT tci.*, pr.full_name as created_by_name
      FROM team_capacity_iterations tci
      LEFT JOIN profiles pr ON tci.created_by = pr.id
      WHERE tci.project_id = $1
      ORDER BY tci.start_date DESC
    `;
    
    const iterationsResult = await query(iterationsQuery, [projectId]);
    const iterations = iterationsResult.rows;
    
    // Get members for all iterations
    const iterationIds = iterations.map(i => i.id);
    let members = [];
    
    if (iterationIds.length > 0) {
      const membersQuery = `
        SELECT tcm.*, pr.full_name as created_by_name, s.name as stakeholder_name
        FROM team_capacity_members tcm
        LEFT JOIN profiles pr ON tcm.created_by = pr.id
        LEFT JOIN stakeholders s ON tcm.stakeholder_id = s.id
        WHERE tcm.iteration_id = ANY($1::uuid[])
        ORDER BY tcm.member_name
      `;
      
      const membersResult = await query(membersQuery, [iterationIds]);
      members = membersResult.rows;
    }
    
    // Calculate summary
    const totalCapacity = members.reduce((sum, member) => sum + (member.effective_capacity_days || 0), 0);
    
    sendResponse(res, createSuccessResponse({
      projectId,
      iterations,
      members,
      summary: {
        totalIterations: iterations.length,
        totalCapacity: Math.round(totalCapacity * 10) / 10
      }
    }));
  } catch (error) {
    console.error('Get capacity error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch capacity data', 'FETCH_ERROR', 500));
  }
});

// POST /capacity-service/projects/:id/capacity
router.post('/projects/:id/capacity', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    const userId = req.user.id;
    const { type, ...data } = req.body;
    
    if (type === 'iteration') {
      const { iterationName, startDate, endDate, workingDays, committedStoryPoints } = data;
      
      if (!iterationName || !startDate || !endDate || !workingDays) {
        return sendResponse(res, createErrorResponse('Iteration name, dates, and working days required', 'MISSING_FIELDS', 400));
      }

      const iterationId = uuidv4();
      const now = new Date();
      
      const insertQuery = `
        INSERT INTO team_capacity_iterations (id, project_id, iteration_name, start_date, end_date, working_days, committed_story_points, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        iterationId,
        projectId,
        iterationName,
        startDate,
        endDate,
        workingDays,
        committedStoryPoints || 0,
        userId,
        now,
        now
      ]);
      
      sendResponse(res, createSuccessResponse({
        message: 'Capacity iteration created successfully',
        iteration: result.rows[0]
      }));
    } else if (type === 'member') {
      const { iterationId, memberName, role, workMode, availabilityPercent, leaves, stakeholderId, teamId } = data;
      
      if (!iterationId || !memberName || !role) {
        return sendResponse(res, createErrorResponse('Iteration ID, member name, and role required', 'MISSING_FIELDS', 400));
      }

      // Calculate effective capacity
      const iterationResult = await query('SELECT working_days FROM team_capacity_iterations WHERE id = $1', [iterationId]);
      
      if (iterationResult.rows.length === 0) {
        return sendResponse(res, createErrorResponse('Iteration not found', 'ITERATION_NOT_FOUND', 404));
      }
      
      const workingDays = iterationResult.rows[0].working_days;
      const effectiveCapacity = (workingDays - (leaves || 0)) * ((availabilityPercent || 100) / 100);
      
      const memberId = uuidv4();
      const now = new Date();
      
      const insertQuery = `
        INSERT INTO team_capacity_members (id, iteration_id, stakeholder_id, team_id, member_name, role, work_mode, leaves, availability_percent, effective_capacity_days, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        memberId,
        iterationId,
        stakeholderId || null,
        teamId || null,
        memberName,
        role,
        workMode || 'office',
        leaves || 0,
        availabilityPercent || 100,
        effectiveCapacity,
        userId,
        now,
        now
      ]);
      
      sendResponse(res, createSuccessResponse({
        message: 'Team member added successfully',
        member: result.rows[0]
      }));
    } else {
      sendResponse(res, createErrorResponse('Invalid type. Must be "iteration" or "member"', 'INVALID_TYPE', 400));
    }
  } catch (error) {
    console.error('Create capacity item error:', error);
    sendResponse(res, createErrorResponse('Failed to create capacity item', 'CREATE_ERROR', 500));
  }
});

// PUT /capacity-service/projects/:id/capacity/:itemId
router.put('/projects/:id/capacity/:itemId', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    const itemId = req.params.itemId;
    const { type, ...updateData } = req.body;
    
    if (type === 'iteration') {
      const { iterationName, startDate, endDate, workingDays, committedStoryPoints } = updateData;
      
      const updateQuery = `
        UPDATE team_capacity_iterations 
        SET iteration_name = COALESCE($2, iteration_name),
            start_date = COALESCE($3, start_date),
            end_date = COALESCE($4, end_date),
            working_days = COALESCE($5, working_days),
            committed_story_points = COALESCE($6, committed_story_points),
            updated_at = $7
        WHERE id = $1 AND project_id = $8
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        itemId,
        iterationName,
        startDate,
        endDate,
        workingDays,
        committedStoryPoints,
        new Date(),
        projectId
      ]);
      
      if (result.rows.length === 0) {
        return sendResponse(res, createErrorResponse('Iteration not found', 'NOT_FOUND', 404));
      }
      
      sendResponse(res, createSuccessResponse({
        message: 'Iteration updated successfully',
        iteration: result.rows[0]
      }));
    } else if (type === 'member') {
      const { memberName, role, workMode, availabilityPercent, leaves } = updateData;
      
      // Recalculate effective capacity if working days changed
      let effectiveCapacity = null;
      if (availabilityPercent !== undefined || leaves !== undefined) {
        const memberResult = await query(`
          SELECT tcm.*, tci.working_days
          FROM team_capacity_members tcm
          JOIN team_capacity_iterations tci ON tcm.iteration_id = tci.id
          WHERE tcm.id = $1
        `, [itemId]);
        
        if (memberResult.rows.length > 0) {
          const member = memberResult.rows[0];
          const workingDays = member.working_days;
          const newLeaves = leaves !== undefined ? leaves : member.leaves;
          const newAvailability = availabilityPercent !== undefined ? availabilityPercent : member.availability_percent;
          effectiveCapacity = (workingDays - newLeaves) * (newAvailability / 100);
        }
      }
      
      const updateQuery = `
        UPDATE team_capacity_members 
        SET member_name = COALESCE($2, member_name),
            role = COALESCE($3, role),
            work_mode = COALESCE($4, work_mode),
            availability_percent = COALESCE($5, availability_percent),
            leaves = COALESCE($6, leaves),
            effective_capacity_days = COALESCE($7, effective_capacity_days),
            updated_at = $8
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        itemId,
        memberName,
        role,
        workMode,
        availabilityPercent,
        leaves,
        effectiveCapacity,
        new Date()
      ]);
      
      if (result.rows.length === 0) {
        return sendResponse(res, createErrorResponse('Team member not found', 'NOT_FOUND', 404));
      }
      
      sendResponse(res, createSuccessResponse({
        message: 'Team member updated successfully',
        member: result.rows[0]
      }));
    } else {
      sendResponse(res, createErrorResponse('Invalid type. Must be "iteration" or "member"', 'INVALID_TYPE', 400));
    }
  } catch (error) {
    console.error('Update capacity item error:', error);
    sendResponse(res, createErrorResponse('Failed to update capacity item', 'UPDATE_ERROR', 500));
  }
});

// DELETE /capacity-service/projects/:id/capacity/:itemId
router.delete('/projects/:id/capacity/:itemId', verifyToken, verifyProjectAccess, async (req, res) => {
  try {
    const projectId = req.projectId;
    const itemId = req.params.itemId;
    const { type } = req.query;
    
    if (type === 'iteration') {
      const deleteQuery = 'DELETE FROM team_capacity_iterations WHERE id = $1 AND project_id = $2 RETURNING id';
      const result = await query(deleteQuery, [itemId, projectId]);
      
      if (result.rows.length === 0) {
        return sendResponse(res, createErrorResponse('Iteration not found', 'NOT_FOUND', 404));
      }
      
      sendResponse(res, createSuccessResponse({ message: 'Iteration deleted successfully' }));
    } else if (type === 'member') {
      const deleteQuery = 'DELETE FROM team_capacity_members WHERE id = $1 RETURNING id';
      const result = await query(deleteQuery, [itemId]);
      
      if (result.rows.length === 0) {
        return sendResponse(res, createErrorResponse('Team member not found', 'NOT_FOUND', 404));
      }
      
      sendResponse(res, createSuccessResponse({ message: 'Team member deleted successfully' }));
    } else {
      sendResponse(res, createErrorResponse('Type parameter required (iteration or member)', 'MISSING_TYPE', 400));
    }
  } catch (error) {
    console.error('Delete capacity item error:', error);
    sendResponse(res, createErrorResponse('Failed to delete capacity item', 'DELETE_ERROR', 500));
  }
});

// GET /capacity-service/stats
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM team_capacity_iterations) as total_iterations,
        (SELECT COUNT(*) FROM team_capacity_members) as total_members,
        (SELECT AVG(effective_capacity_days) FROM team_capacity_members) as avg_capacity,
        (SELECT COUNT(DISTINCT project_id) FROM team_capacity_iterations) as total_projects
    `;
    
    const result = await query(statsQuery);
    const stats = result.rows[0];
    
    sendResponse(res, createSuccessResponse({
      totalIterations: parseInt(stats.total_iterations),
      totalMembers: parseInt(stats.total_members),
      avgCapacity: parseFloat(stats.avg_capacity) || 0,
      totalProjects: parseInt(stats.total_projects)
    }));
  } catch (error) {
    console.error('Get capacity stats error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch capacity statistics', 'STATS_ERROR', 500));
  }
});

module.exports = router;
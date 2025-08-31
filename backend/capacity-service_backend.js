const express = require('express');
const { ok, fail, requireAuth, checkProjectAccess } = require('./_utils_backend');
const pool = require('./db_backend');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/projects/:projectId/capacity', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🔧 Backend - GET /capacity called:', { projectId, userId: req.user?.id });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const iterationsResult = await pool.query(`
      SELECT * FROM team_capacity_iterations 
      WHERE project_id = $1 
      ORDER BY start_date DESC
    `, [projectId]);

    const membersResult = await pool.query(`
      SELECT tcm.*, tci.iteration_name 
      FROM team_capacity_members tcm
      JOIN team_capacity_iterations tci ON tcm.iteration_id = tci.id
      WHERE tci.project_id = $1
      ORDER BY tci.start_date DESC, tcm.member_name
    `, [projectId]);

    const iterations = iterationsResult.rows.map(iteration => ({
      ...iteration,
      members: membersResult.rows.filter(member => member.iteration_id === iteration.id)
    }));

    console.log('🔧 Backend - Found iterations:', iterations.length);
    return res.json(ok({
      projectId,
      iterations,
      summary: { 
        totalIterations: iterations.length, 
        totalCapacity: membersResult.rows.reduce((sum, member) => sum + (member.effective_capacity_days || 0), 0) 
      }
    }));
  } catch (error) {
    console.error('🔧 Backend - Get capacity error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to fetch capacity data: ' + error.message, 'FETCH_ERROR'));
  }
});

router.post('/projects/:projectId/capacity', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const body = req.body || {};
    console.log('🔧 Backend - POST /capacity called:', {
      projectId,
      userId: req.user?.id,
      body: body,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        contentType: req.headers['content-type']
      }
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (body.type === 'iteration') {
      // Create capacity iteration
      const { iteration_name, start_date, end_date, working_days, committed_story_points } = body;
      
      if (!iteration_name || !start_date || !end_date || working_days === undefined) {
        console.log('🔧 Backend - Missing required fields for iteration');
        return res.json(fail('Iteration name, dates, and working days are required', 'MISSING_FIELDS'));
      }

      const iterationId = uuidv4();
      console.log('🔧 Backend - Creating iteration with ID:', iterationId);

      const result = await pool.query(`
        INSERT INTO team_capacity_iterations (id, project_id, iteration_name, start_date, end_date, working_days, committed_story_points, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [iterationId, projectId, iteration_name, start_date, end_date, working_days, committed_story_points || 0, req.user.id]);

      console.log('🔧 Backend - Iteration created successfully:', result.rows[0]);
      return res.json(ok({ message: 'Iteration created successfully', iteration: result.rows[0] }));
    } else if (body.type === 'member') {
      // Create team member for iteration
      const { iteration_id, member_name, role, work_mode, leaves, availability_percent } = body;
      
      if (!iteration_id || !member_name || !role || !work_mode) {
        console.log('🔧 Backend - Missing required fields for member');
        return res.json(fail('Iteration ID, member name, role, and work mode are required', 'MISSING_FIELDS'));
      }

      const memberId = uuidv4();
      console.log('🔧 Backend - Creating member with ID:', memberId);

      const result = await pool.query(`
        INSERT INTO team_capacity_members (id, iteration_id, member_name, role, work_mode, leaves, availability_percent, effective_capacity_days, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, NOW(), NOW())
        RETURNING *
      `, [memberId, iteration_id, member_name, role, work_mode, leaves || 0, availability_percent || 100, req.user.id]);

      console.log('🔧 Backend - Member created successfully:', result.rows[0]);
      return res.json(ok({ message: 'Member created successfully', member: result.rows[0] }));
    } else {
      console.log('🔧 Backend - Invalid type specified:', body.type);
      return res.json(fail('Invalid type specified. Must be "iteration" or "member"', 'INVALID_TYPE'));
    }
  } catch (error) {
    console.error('🔧 Backend - Create capacity error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to create capacity item: ' + error.message, 'CREATE_ERROR'));
  }
});

router.put('/projects/:projectId/capacity/:id', (req, res) => {
  return res.json(ok({ message: 'Updated (stub)' }));
});

router.delete('/projects/:projectId/capacity/:id', (req, res) => {
  return res.json(ok({ message: 'Deleted (stub)' }));
});

// Get project capacity settings
router.get('/projects/:projectId/settings', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🔧 Backend - GET /settings called:', { projectId, userId: req.user?.id });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    // Return default capacity settings
    const settings = {
      defaultWorkingDays: 10,
      defaultAvailabilityPercent: 100,
      defaultCapacityPerDay: 8
    };

    console.log('🔧 Backend - Returning settings:', settings);
    return res.json(ok(settings));
  } catch (error) {
    console.error('🔧 Backend - Get settings error:', error);
    res.json(fail('Failed to fetch settings: ' + error.message, 'FETCH_ERROR'));
  }
});

// Get project iterations only
router.get('/projects/:projectId/iterations', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🔧 Backend - GET /iterations called:', { projectId, userId: req.user?.id });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const iterationsResult = await pool.query(`
      SELECT * FROM team_capacity_iterations 
      WHERE project_id = $1 
      ORDER BY start_date DESC
    `, [projectId]);

    console.log('🔧 Backend - Found iterations:', iterationsResult.rows.length);
    return res.json(ok({ iterations: iterationsResult.rows }));
  } catch (error) {
    console.error('🔧 Backend - Get iterations error:', error);
    res.json(fail('Failed to fetch iterations: ' + error.message, 'FETCH_ERROR'));
  }
});

router.get('/stats', (_req, res) => {
  return res.json(ok({ totalIterations: 0, totalMembers: 0, avgCapacity: 0, totalProjects: 0 }));
});

module.exports = router;

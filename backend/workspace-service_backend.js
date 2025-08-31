const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ok, fail, requireAuth, checkProjectAccess, pool } = require('./_utils_backend');

const router = express.Router();

// Workspace summary
router.get('/projects/:projectId/workspace', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const [tasksResult, milestonesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM tasks WHERE project_id = $1', [projectId]),
      pool.query('SELECT COUNT(*) as count FROM milestones WHERE project_id = $1', [projectId])
    ]);

    const recentTasks = await pool.query(`
      SELECT id, title, status, created_at 
      FROM tasks 
      WHERE project_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [projectId]);

    const upcomingMilestones = await pool.query(`
      SELECT id, name, due_date, status 
      FROM milestones 
      WHERE project_id = $1 AND due_date >= CURRENT_DATE 
      ORDER BY due_date ASC 
      LIMIT 5
    `, [projectId]);

    return res.json(ok({
      projectId,
      summary: { 
        tasks: parseInt(tasksResult.rows[0].count), 
        milestones: parseInt(milestonesResult.rows[0].count)
      },
      recentTasks: recentTasks.rows,
      upcomingMilestones: upcomingMilestones.rows
    }));
  } catch (error) {
    console.error('Get workspace error:', error);
    res.json(fail('Failed to fetch workspace data', 'FETCH_ERROR'));
  }
});

// Tasks endpoints
router.get('/projects/:projectId/tasks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT t.*, m.name as milestone_name 
      FROM tasks t
      LEFT JOIN milestones m ON t.milestone_id = m.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [projectId]);

    res.json(ok(result.rows));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.json(fail('Failed to fetch tasks', 'FETCH_ERROR'));
  }
});

router.post('/projects/:projectId/tasks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🔧 Backend - POST /tasks called:', {
      projectId,
      userId: req.user?.id,
      body: req.body,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        contentType: req.headers['content-type']
      }
    });

    const { title, description, status, priority, due_date, owner_id, milestone_id } = req.body;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (!title) {
      console.log('🔧 Backend - Missing title field');
      return res.json(fail('Title is required', 'MISSING_FIELDS'));
    }

    const taskId = uuidv4();
    console.log('🔧 Backend - Creating task with ID:', taskId);

    const result = await pool.query(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, owner_id, milestone_id, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [taskId, projectId, title, description, status || 'todo', priority || 'medium', due_date, owner_id, milestone_id, req.user.id]);

    console.log('🔧 Backend - Task created successfully:', result.rows[0]);
    res.json(ok({ message: 'Task created successfully', task: result.rows[0] }));
  } catch (error) {
    console.error('🔧 Backend - Create task error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to create task: ' + error.message, 'CREATE_ERROR'));
  }
});

router.put('/projects/:projectId/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    console.log('🔧 Backend - PUT /tasks/:taskId called:', {
      projectId,
      taskId,
      userId: req.user?.id,
      body: req.body,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        contentType: req.headers['content-type']
      }
    });

    const { title, description, status, priority, due_date, owner_id, milestone_id } = req.body;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    console.log('🔧 Backend - Updating task with fields:', {
      title, description, status, priority, due_date, owner_id, milestone_id
    });

    const result = await pool.query(`
      UPDATE tasks
      SET title = COALESCE($3, title),
          description = COALESCE($4, description),
          status = COALESCE($5, status),
          priority = COALESCE($6, priority),
          due_date = COALESCE($7, due_date),
          owner_id = COALESCE($8, owner_id),
          milestone_id = COALESCE($9, milestone_id),
          updated_at = NOW()
      WHERE id = $1 AND project_id = $2
      RETURNING *
    `, [taskId, projectId, title, description, status, priority, due_date, owner_id, milestone_id]);

    if (result.rows.length === 0) {
      console.log('🔧 Backend - Task not found:', taskId);
      return res.json(fail('Task not found', 'NOT_FOUND'));
    }

    console.log('🔧 Backend - Task updated successfully:', result.rows[0]);
    res.json(ok({ message: 'Task updated successfully', task: result.rows[0] }));
  } catch (error) {
    console.error('🔧 Backend - Update task error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to update task: ' + error.message, 'UPDATE_ERROR'));
  }
});

// Update task (alternative endpoint for backwards compatibility)
router.put('/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, due_date, owner_id, milestone_id } = req.body;

    // Check project access through task
    const taskCheck = await pool.query(`
      SELECT t.project_id 
      FROM tasks t
      WHERE t.id = $1
    `, [taskId]);

    if (taskCheck.rows.length === 0) {
      return res.json(fail('Task not found', 'NOT_FOUND'));
    }

    if (!await checkProjectAccess(req.user.id, taskCheck.rows[0].project_id)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      UPDATE tasks
      SET title = COALESCE($2, title),
          description = COALESCE($3, description),
          status = COALESCE($4, status),
          priority = COALESCE($5, priority),
          due_date = COALESCE($6, due_date),
          owner_id = COALESCE($7, owner_id),
          milestone_id = COALESCE($8, milestone_id),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [taskId, title, description, status, priority, due_date, owner_id, milestone_id]);

    if (result.rows.length === 0) {
      return res.json(fail('Task not found', 'NOT_FOUND'));
    }

    res.json(ok({ message: 'Task updated successfully', task: result.rows[0] }));
  } catch (error) {
    console.error('Update task error:', error);
    res.json(fail('Failed to update task', 'UPDATE_ERROR'));
  }
});

router.delete('/projects/:projectId/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    console.log('🔧 Backend - DELETE /projects/:projectId/tasks/:taskId called:', {
      projectId, taskId, userId: req.user?.id
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING id', [taskId, projectId]);

    if (result.rowCount === 0) {
      console.log('🔧 Backend - Task not found:', taskId);
      return res.json(fail('Task not found', 'NOT_FOUND'));
    }

    console.log('🔧 Backend - Task deleted successfully:', taskId);
    res.json(ok({ message: 'Task deleted successfully' }));
  } catch (error) {
    console.error('🔧 Backend - Delete task error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to delete task: ' + error.message, 'DELETE_ERROR'));
  }
});

// Keep the old endpoint for backwards compatibility
router.delete('/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check project access through task
    const taskCheck = await pool.query(`
      SELECT t.project_id 
      FROM tasks t
      WHERE t.id = $1
    `, [taskId]);

    if (taskCheck.rows.length === 0) {
      return res.json(fail('Task not found', 'NOT_FOUND'));
    }

    if (!await checkProjectAccess(req.user.id, taskCheck.rows[0].project_id)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    res.json(ok({ message: 'Task deleted successfully' }));
  } catch (error) {
    console.error('Delete task error:', error);
    res.json(fail('Failed to delete task', 'DELETE_ERROR'));
  }
});

// Task status history
router.get('/tasks/:taskId/status-history', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check project access through task
    const taskCheck = await pool.query(`
      SELECT t.project_id 
      FROM tasks t
      WHERE t.id = $1
    `, [taskId]);

    if (taskCheck.rows.length === 0) {
      return res.json(fail('Task not found', 'NOT_FOUND'));
    }

    if (!await checkProjectAccess(req.user.id, taskCheck.rows[0].project_id)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT tsh.*, p.full_name as changed_by_name
      FROM task_status_history tsh
      LEFT JOIN profiles p ON tsh.changed_by = p.id
      WHERE tsh.task_id = $1
      ORDER BY tsh.changed_at DESC
    `, [taskId]);

    res.json(ok({ history: result.rows }));
  } catch (error) {
    console.error('Get task status history error:', error);
    res.json(fail('Failed to fetch task status history', 'FETCH_ERROR'));
  }
});

// Risk Register endpoints
router.get('/projects/:projectId/risks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT * FROM risk_register
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);

    res.json(ok(result.rows));
  } catch (error) {
    console.error('Get risks error:', error);
    res.json(fail('Failed to fetch risks', 'FETCH_ERROR'));
  }
});

router.post('/projects/:projectId/risks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const riskData = req.body;
    
    console.log('🔧 Backend - POST /risks called:', {
      projectId,
      userId: req.user?.id,
      body: riskData,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        contentType: req.headers['content-type']
      }
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (!riskData.title || !riskData.risk_code) {
      console.log('🔧 Backend - Missing required fields:', { title: riskData.title, risk_code: riskData.risk_code });
      return res.json(fail('Title and risk code are required', 'MISSING_FIELDS'));
    }

    const riskId = uuidv4();

    console.log('🔧 Backend - Creating risk with ID:', riskId);

    const result = await pool.query(`
      INSERT INTO risk_register (
        id, project_id, risk_code, title, description, category, cause, consequence,
        likelihood, impact, owner, response_strategy, mitigation_plan,
        contingency_plan, residual_likelihood, residual_impact,
        status, identified_date, last_updated, next_review_date, notes, created_by,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *
    `, [
      riskId, projectId, riskData.risk_code, riskData.title, riskData.description,
      riskData.category, riskData.cause, riskData.consequence, riskData.likelihood,
      riskData.impact, riskData.owner, riskData.response_strategy,
      riskData.mitigation_plan, riskData.contingency_plan, riskData.residual_likelihood,
      riskData.residual_impact, riskData.status || 'open',
      riskData.identified_date, riskData.last_updated, riskData.next_review_date,
      riskData.notes, req.user.id
    ]);

    console.log('🔧 Backend - Risk created successfully:', result.rows[0]);
    res.json(ok({ message: 'Risk created successfully', risk: result.rows[0] }));
  } catch (error) {
    console.error('🔧 Backend - Create risk error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to create risk: ' + error.message, 'CREATE_ERROR'));
  }
});

router.put('/projects/:projectId/risks/:riskId', requireAuth, async (req, res) => {
  try {
    const { projectId, riskId } = req.params;
    const riskData = req.body;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      UPDATE risk_register
      SET risk_code = COALESCE($3, risk_code),
          title = COALESCE($4, title),
          description = COALESCE($5, description),
          category = COALESCE($6, category),
          cause = COALESCE($7, cause),
          consequence = COALESCE($8, consequence),
          likelihood = COALESCE($9, likelihood),
          impact = COALESCE($10, impact),
          owner = COALESCE($11, owner),
          response_strategy = COALESCE($12, response_strategy),
          mitigation_plan = COALESCE($13, mitigation_plan),
          contingency_plan = COALESCE($14, contingency_plan),
          residual_likelihood = COALESCE($15, residual_likelihood),
          residual_impact = COALESCE($16, residual_impact),
          status = COALESCE($17, status),
          identified_date = COALESCE($18, identified_date),
          last_updated = COALESCE($19, last_updated),
          next_review_date = COALESCE($20, next_review_date),
          notes = COALESCE($21, notes),
          updated_at = NOW()
      WHERE id = $1 AND project_id = $2
      RETURNING *
    `, [
      riskId, projectId, riskData.risk_code, riskData.title, riskData.description,
      riskData.category, riskData.cause, riskData.consequence, riskData.likelihood,
      riskData.impact, riskData.owner, riskData.response_strategy,
      riskData.mitigation_plan, riskData.contingency_plan, riskData.residual_likelihood,
      riskData.residual_impact, riskData.status,
      riskData.identified_date, riskData.last_updated, riskData.next_review_date,
      riskData.notes
    ]);

    if (result.rows.length === 0) {
      return res.json(fail('Risk not found', 'NOT_FOUND'));
    }

    res.json(ok({ message: 'Risk updated successfully', risk: result.rows[0] }));
  } catch (error) {
    console.error('Update risk error:', error);
    res.json(fail('Failed to update risk', 'UPDATE_ERROR'));
  }
});

router.delete('/projects/:projectId/risks/:riskId', requireAuth, async (req, res) => {
  try {
    const { projectId, riskId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      DELETE FROM risk_register
      WHERE id = $1 AND project_id = $2
    `, [riskId, projectId]);

    if (result.rowCount === 0) {
      return res.json(fail('Risk not found', 'NOT_FOUND'));
    }

    res.json(ok({ message: 'Risk deleted successfully' }));
  } catch (error) {
    console.error('Delete risk error:', error);
    res.json(fail('Failed to delete risk', 'DELETE_ERROR'));
  }
});

// Discussions endpoints
router.get('/projects/:projectId/discussions', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT pd.*, p.full_name as created_by_name
      FROM project_discussions pd
      LEFT JOIN profiles p ON pd.created_by = p.id
      WHERE pd.project_id = $1
      ORDER BY pd.meeting_date DESC, pd.created_at DESC
    `, [projectId]);

    res.json(ok(result.rows));
  } catch (error) {
    console.error('Get discussions error:', error);
    res.json(fail('Failed to fetch discussions', 'FETCH_ERROR'));
  }
});

router.post('/projects/:projectId/discussions', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { meeting_title, meeting_date, summary_notes, attendees } = req.body;
    
    console.log('🔧 Backend - POST /discussions called:', {
      projectId,
      userId: req.user?.id,
      body: { meeting_title, meeting_date, summary_notes, attendees },
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        contentType: req.headers['content-type']
      }
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (!meeting_title || !meeting_date) {
      console.log('🔧 Backend - Missing required fields:', { meeting_title, meeting_date });
      return res.json(fail('Meeting title and date are required', 'MISSING_FIELDS'));
    }

    const discussionId = uuidv4();
    console.log('🔧 Backend - Creating discussion with ID:', discussionId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Disable triggers in local DB and log manually to avoid NOT NULL on changed_by
      await client.query("SET LOCAL session_replication_role = 'replica'");

      const result = await client.query(`
        INSERT INTO project_discussions (id, project_id, meeting_title, meeting_date, summary_notes, attendees, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [discussionId, projectId, meeting_title, meeting_date, summary_notes, JSON.stringify(attendees || []), req.user.id]);

      // Manual change log entry to replace DB trigger behavior in local env
      const changedBy = req.user?.id || result.rows[0]?.created_by || '00000000-0000-0000-0000-000000000000';
      console.log('🔧 Backend - Discussion change log context:', { reqUser: req.user, created_by: result.rows[0]?.created_by, changedBy });
      await client.query(`
        INSERT INTO discussion_change_log (discussion_id, change_type, field_name, new_value, changed_by)
        VALUES ($1, 'created', 'discussion', 'Discussion created', $2)
      `, [result.rows[0].id, changedBy]);

      await client.query('COMMIT');
      console.log('🔧 Backend - Discussion created successfully:', result.rows[0]);
      res.json(ok({ message: 'Discussion created successfully', discussion: result.rows[0] }));
    } catch (txErr) {
      try { await client.query('ROLLBACK'); } catch(_) {}
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🔧 Backend - Create discussion error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    const details = { message: error.message, code: error.code, detail: error.detail, schema: error.schema, table: error.table, constraint: error.constraint, position: error.position };
    console.error('🔧 Backend - Error details:', details);
    res.json(fail('Failed to create discussion: ' + JSON.stringify(details), 'CREATE_ERROR'));
  }
});

// Discussion action items
router.get('/projects/:projectId/discussions/:discussionId/action-items', requireAuth, async (req, res) => {
  try {
    const { projectId, discussionId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT dai.*, p.full_name as owner_name, p2.full_name as created_by_name
      FROM discussion_action_items dai
      LEFT JOIN profiles p ON dai.owner_id = p.id
      LEFT JOIN profiles p2 ON dai.created_by = p2.id
      WHERE dai.discussion_id = $1
      ORDER BY dai.created_at DESC
    `, [discussionId]);

    res.json(ok(result.rows));
  } catch (error) {
    console.error('Get action items error:', error);
    res.json(fail('Failed to fetch action items', 'FETCH_ERROR'));
  }
});

router.post('/projects/:projectId/discussions/:discussionId/action-items', requireAuth, async (req, res) => {
  try {
    const { projectId, discussionId } = req.params;
    const { task_description, owner_id, target_date, status } = req.body;

    console.log('🔧 Create action item request:', {
      projectId,
      discussionId,
      body: req.body,
      user: req.user,
      task_description,
      owner_id,
      target_date,
      status
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (!task_description) {
      console.log('🔧 Task description missing from body:', req.body);
      return res.json(fail('Task description is required', 'MISSING_FIELDS'));
    }

    const actionItemId = uuidv4();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL session_replication_role = 'replica'");

      const result = await client.query(`
        INSERT INTO discussion_action_items (id, discussion_id, task_description, owner_id, target_date, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [actionItemId, discussionId, task_description, owner_id, target_date, status || 'open', req.user.id]);

      // Manual change log entry to replace DB trigger behavior in local env
      await client.query(`
        INSERT INTO discussion_change_log (discussion_id, action_item_id, change_type, field_name, new_value, changed_by)
        VALUES ($1, $2, 'created', 'action_item', 'Action item created', $3)
      `, [discussionId, result.rows[0].id, req.user.id]);

      await client.query('COMMIT');
      res.json(ok({ message: 'Action item created successfully', actionItem: result.rows[0] }));
    } catch (txErr) {
      try { await client.query('ROLLBACK'); } catch(_) {}
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create action item error:', error);
    res.json(fail('Failed to create action item', 'CREATE_ERROR'));
  }
});

// Project-level Action Items - list all action items for a project across discussions
router.get('/projects/:projectId/action-items', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT dai.*, p.full_name as owner_name, p2.full_name as created_by_name
      FROM discussion_action_items dai
      JOIN project_discussions pd ON pd.id = dai.discussion_id
      LEFT JOIN profiles p ON dai.owner_id = p.id
      LEFT JOIN profiles p2 ON dai.created_by = p2.id
      WHERE pd.project_id = $1
      ORDER BY dai.created_at DESC
    `, [projectId]);

    res.json(ok(result.rows));
  } catch (error) {
    console.error('Get project action items error:', error);
    res.json(fail('Failed to fetch action items', 'FETCH_ERROR'));
  }
});

// Project-level Action Items - update
router.put('/projects/:projectId/action-items/:actionItemId', requireAuth, async (req, res) => {
  const { projectId, actionItemId } = req.params;
  const { task_description, owner_id, target_date, status } = req.body;

  try {
    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: oldRows } = await client.query(`SELECT * FROM discussion_action_items WHERE id = $1`, [actionItemId]);
      if (oldRows.length === 0) {
        await client.query('ROLLBACK');
        return res.json(fail('Action item not found', 'NOT_FOUND'));
      }
      const oldItem = oldRows[0];

      const { rows: updatedRows } = await client.query(`
        UPDATE discussion_action_items
        SET task_description = COALESCE($1, task_description),
            owner_id = COALESCE($2, owner_id),
            target_date = COALESCE($3, target_date),
            status = COALESCE($4, status),
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [task_description, owner_id, target_date, status, actionItemId]);

      const updated = updatedRows[0];
      if (status && oldItem.status !== updated.status) {
        await client.query(`
          INSERT INTO discussion_change_log (discussion_id, action_item_id, change_type, field_name, old_value, new_value, changed_by)
          VALUES ($1, $2, 'updated', 'status', $3, $4, $5)
        `, [updated.discussion_id, updated.id, oldItem.status, updated.status, req.user.id]);
      }

      await client.query('COMMIT');
      res.json(ok({ message: 'Action item updated successfully', actionItem: updated }));
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('Update action item error:', e);
      const details = { message: e.message, code: e.code, detail: e.detail, schema: e.schema, table: e.table, constraint: e.constraint, position: e.position };
      res.json(fail('Failed to update action item: ' + JSON.stringify(details), 'UPDATE_ERROR'));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update action item outer error:', error);
    const details = { message: error.message, code: error.code, detail: error.detail, schema: error.schema, table: error.table, constraint: error.constraint, position: error.position };
    res.json(fail('Failed to update action item: ' + JSON.stringify(details), 'UPDATE_ERROR'));
  }
});

// Project-level Action Items - delete
router.delete('/projects/:projectId/action-items/:actionItemId', requireAuth, async (req, res) => {
  const { projectId, actionItemId } = req.params;

  try {
    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`SELECT * FROM discussion_action_items WHERE id = $1`, [actionItemId]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.json(ok({ message: 'Action item already deleted' }));
      }
      const item = rows[0];

      await client.query(`DELETE FROM discussion_action_items WHERE id = $1`, [actionItemId]);

      await client.query(`
        INSERT INTO discussion_change_log (discussion_id, action_item_id, change_type, field_name, old_value, changed_by)
        VALUES ($1, $2, 'deleted', 'action_item', 'Action item deleted', $3)
      `, [item.discussion_id, item.id, req.user.id]);

      await client.query('COMMIT');
      res.json(ok({ message: 'Action item deleted successfully' }));
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('Delete action item error:', e);
      res.json(fail('Failed to delete action item', 'DELETE_ERROR'));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete action item outer error:', error);
    res.json(fail('Failed to delete action item', 'DELETE_ERROR'));
  }
});

module.exports = router;

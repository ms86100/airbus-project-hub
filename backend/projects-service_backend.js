const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ok, fail, requireAuth, pool } = require('./_utils_backend');

const router = express.Router();

// Get all projects for user
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT p.*
      FROM projects p
      WHERE p.created_by = $1
      OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = $1 AND ur.role = 'admin')
      OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1)
      OR EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.project_id = p.id AND mp.user_id = $1)
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json(ok(result.rows));
  } catch (error) {
    console.error('Get projects error:', error);
    res.json(fail('Failed to fetch projects', 'FETCH_ERROR'));
  }
});

// Create project
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { name, description, startDate, endDate, priority, status, departmentId } = req.body;

    if (!name) {
      return res.json(fail('Project name is required', 'MISSING_NAME'));
    }

    const projectId = uuidv4();
    
    const result = await pool.query(`
      INSERT INTO projects (id, name, description, start_date, end_date, priority, status, department_id, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [projectId, name, description, startDate, endDate, priority || 'medium', status || 'planning', departmentId, req.user.id]);

    res.json(ok(result.rows[0]));
  } catch (error) {
    console.error('Create project error:', error);
    res.json(fail('Failed to create project', 'CREATE_ERROR'));
  }
});

// Get single project
router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT p.*
      FROM projects p
      WHERE p.id = $1 AND (
        p.created_by = $2
        OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = $2 AND ur.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2)
        OR EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.project_id = $1 AND mp.user_id = $2)
      )
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.json(fail('Project not found or access denied', 'NOT_FOUND'));
    }

    res.json(ok(result.rows[0]));
  } catch (error) {
    console.error('Get project error:', error);
    res.json(fail('Failed to fetch project', 'FETCH_ERROR'));
  }
});

// Update project
router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, priority, status } = req.body;

    // Check access
    const accessResult = await pool.query(`
      SELECT 1 FROM projects WHERE id = $1 AND (
        created_by = $2 
        OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = $2 AND ur.role = 'admin')
      )
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.json(fail('Project not found or access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      UPDATE projects 
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          priority = COALESCE($6, priority),
          status = COALESCE($7, status),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, name, description, startDate, endDate, priority, status]);

    res.json(ok(result.rows[0]));
  } catch (error) {
    console.error('Update project error:', error);
    res.json(fail('Failed to update project', 'UPDATE_ERROR'));
  }
});

// Delete project
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check access (owner or admin)
    const projRes = await pool.query(`SELECT created_by FROM projects WHERE id = $1`, [id]);
    if (projRes.rows.length === 0) {
      return res.json(fail('Project not found', 'NOT_FOUND'));
    }
    const isOwner = projRes.rows[0].created_by === req.user.id;
    const adminRes = await pool.query(`SELECT 1 FROM user_roles ur WHERE ur.user_id = $1 AND ur.role = 'admin'`, [req.user.id]);
    const isAdmin = adminRes.rows.length > 0;
    if (!isOwner && !isAdmin) {
      return res.json(fail('Project not found or access denied', 'ACCESS_DENIED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Avoid trigger/auth issues in local env and speed up cascading deletes
      await client.query("SET LOCAL session_replication_role = 'replica'");

      // Discussions and their logs/items
      await client.query(`
        DELETE FROM discussion_change_log
        WHERE discussion_id IN (SELECT id FROM project_discussions WHERE project_id = $1)
      `, [id]);
      await client.query(`
        DELETE FROM discussion_action_items
        WHERE discussion_id IN (SELECT id FROM project_discussions WHERE project_id = $1)
      `, [id]);
      await client.query(`DELETE FROM project_discussions WHERE project_id = $1`, [id]);

      // Retrospectives and related
      await client.query(`
        DELETE FROM retrospective_card_votes
        WHERE card_id IN (
          SELECT rc.id FROM retrospective_cards rc
          JOIN retrospective_columns rcol ON rcol.id = rc.column_id
          JOIN retrospectives r ON r.id = rcol.retrospective_id
          WHERE r.project_id = $1
        )
      `, [id]);
      await client.query(`
        DELETE FROM retrospective_cards
        USING retrospective_columns rcol, retrospectives r
        WHERE retrospective_cards.column_id = rcol.id
          AND rcol.retrospective_id = r.id
          AND r.project_id = $1
      `, [id]);
      await client.query(`
        DELETE FROM retrospective_columns
        WHERE retrospective_id IN (SELECT id FROM retrospectives WHERE project_id = $1)
      `, [id]);
      await client.query(`
        DELETE FROM retrospective_action_items
        WHERE retrospective_id IN (SELECT id FROM retrospectives WHERE project_id = $1)
      `, [id]);
      await client.query(`DELETE FROM retrospectives WHERE project_id = $1`, [id]);

      // Team capacity
      await client.query(`
        DELETE FROM team_capacity_members
        WHERE iteration_id IN (SELECT id FROM team_capacity_iterations WHERE project_id = $1)
      `, [id]);
      await client.query(`DELETE FROM team_capacity_iterations WHERE project_id = $1`, [id]);

      // Tasks and related
      await client.query(`
        DELETE FROM task_status_history
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)
      `, [id]);
      await client.query(`DELETE FROM tasks WHERE project_id = $1`, [id]);

      // Backlog
      await client.query(`DELETE FROM task_backlog WHERE project_id = $1`, [id]);

      // Milestones
      await client.query(`DELETE FROM milestones WHERE project_id = $1`, [id]);

      // Stakeholders
      await client.query(`DELETE FROM stakeholders WHERE project_id = $1`, [id]);

      // Access and memberships
      await client.query(`DELETE FROM module_permissions WHERE project_id = $1`, [id]);
      await client.query(`DELETE FROM project_members WHERE project_id = $1`, [id]);

      // Audits
      await client.query(`DELETE FROM audit_log WHERE project_id = $1`, [id]);
      await client.query(`DELETE FROM module_access_audit WHERE project_id = $1`, [id]);

      // Risks
      await client.query(`DELETE FROM risk_register WHERE project_id = $1`, [id]);

      // Finally the project
      await client.query(`DELETE FROM projects WHERE id = $1`, [id]);

      await client.query('COMMIT');
      return res.json(ok({ message: 'Project deleted successfully' }));
    } catch (txErr) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('Delete project tx error:', txErr);
      return res.json(fail('Failed to delete project', 'DELETE_ERROR'));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete project error:', error);
    res.json(fail('Failed to delete project', 'DELETE_ERROR'));
  }
});

module.exports = router;
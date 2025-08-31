const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ok, fail, requireAuth, checkProjectAccess, pool } = require('./_utils_backend');

const router = express.Router();

// Get roadmap (milestones) for project
router.get('/projects/:projectId/roadmap', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      SELECT m.*, 
             CASE WHEN m.due_date < CURRENT_DATE AND m.status != 'completed' THEN true ELSE false END as overdue
      FROM milestones m
      WHERE m.project_id = $1
      ORDER BY m.due_date ASC
    `, [projectId]);

    res.json(ok({ projectId, milestones: result.rows }));
  } catch (error) {
    console.error('Get roadmap error:', error);
    res.json(fail('Failed to fetch roadmap', 'FETCH_ERROR'));
  }
});

// Create milestone
router.post('/projects/:projectId/roadmap', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, dueDate, status } = req.body;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (!name || !dueDate) {
      return res.json(fail('Name and due date are required', 'MISSING_FIELDS'));
    }

    const milestoneId = uuidv4();

    const result = await pool.query(`
      INSERT INTO milestones (id, project_id, name, description, due_date, status, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [milestoneId, projectId, name, description, dueDate, status || 'planning', req.user.id]);

    res.json(ok({ message: 'Milestone created successfully', milestone: result.rows[0] }));
  } catch (error) {
    console.error('Create milestone error:', error);
    res.json(fail('Failed to create milestone', 'CREATE_ERROR'));
  }
});

// Update milestone
router.put('/projects/:projectId/roadmap/:milestoneId', requireAuth, async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;
    const { name, description, dueDate, status } = req.body;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      UPDATE milestones
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          due_date = COALESCE($5, due_date),
          status = COALESCE($6, status),
          updated_at = NOW()
      WHERE id = $1 AND project_id = $2
      RETURNING *
    `, [milestoneId, projectId, name, description, dueDate, status]);

    if (result.rows.length === 0) {
      return res.json(fail('Milestone not found', 'NOT_FOUND'));
    }

    res.json(ok({ message: 'Milestone updated successfully', milestone: result.rows[0] }));
  } catch (error) {
    console.error('Update milestone error:', error);
    res.json(fail('Failed to update milestone', 'UPDATE_ERROR'));
  }
});

// Delete milestone
router.delete('/projects/:projectId/roadmap/:milestoneId', requireAuth, async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;

    if (!await checkProjectAccess(req.user.id, projectId)) {
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      DELETE FROM milestones
      WHERE id = $1 AND project_id = $2
    `, [milestoneId, projectId]);

    if (result.rowCount === 0) {
      return res.json(fail('Milestone not found', 'NOT_FOUND'));
    }

    res.json(ok({ message: 'Milestone deleted successfully' }));
  } catch (error) {
    console.error('Delete milestone error:', error);
    res.json(fail('Failed to delete milestone', 'DELETE_ERROR'));
  }
});

module.exports = router;
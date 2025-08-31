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

    // Check if user is admin or project owner
    const accessResult = await pool.query(`
      SELECT 1 FROM projects WHERE id = $1 AND (
        created_by = $2 
        OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = $2 AND ur.role = 'admin')
      )
    `, [id, req.user.id]);

    if (accessResult.rows.length === 0) {
      return res.json(fail('Project not found or access denied', 'ACCESS_DENIED'));
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    
    res.json(ok({ message: 'Project deleted successfully' }));
  } catch (error) {
    console.error('Delete project error:', error);
    res.json(fail('Failed to delete project', 'DELETE_ERROR'));
  }
});

module.exports = router;
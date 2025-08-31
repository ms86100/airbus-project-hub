const express = require('express');
const { ok, fail, requireAuth, checkProjectAccess } = require('./_utils_backend');
const pool = require('./db_backend');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/projects/:projectId/stakeholders', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🔧 Backend - GET /stakeholders called:', { projectId, userId: req.user?.id });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query('SELECT * FROM stakeholders WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
    console.log('🔧 Backend - Found stakeholders:', result.rows.length);
    
    res.json(ok({ projectId, stakeholders: result.rows }));
  } catch (error) {
    console.error('🔧 Backend - Get stakeholders error:', error);
    res.json(fail('Failed to fetch stakeholders: ' + error.message, 'FETCH_ERROR'));
  }
});

router.post('/projects/:projectId/stakeholders', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, email, department, raci, influence_level, notes } = req.body;
    
    console.log('🔧 Backend - POST /stakeholders called:', {
      projectId,
      userId: req.user?.id,
      body: req.body
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    if (!name) {
      console.log('🔧 Backend - Missing name field');
      return res.json(fail('Name is required', 'MISSING_FIELDS'));
    }

    const stakeholderId = uuidv4();
    console.log('🔧 Backend - Creating stakeholder with ID:', stakeholderId);

    const result = await pool.query(`
      INSERT INTO stakeholders (id, project_id, name, email, department, raci, influence_level, notes, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [stakeholderId, projectId, name, email, department, raci, influence_level, notes, req.user.id]);

    console.log('🔧 Backend - Stakeholder created successfully:', result.rows[0]);
    res.json(ok({ message: 'Stakeholder created successfully', stakeholder: result.rows[0] }));
  } catch (error) {
    console.error('🔧 Backend - Create stakeholder error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to create stakeholder: ' + error.message, 'CREATE_ERROR'));
  }
});

router.put('/projects/:projectId/stakeholders/:stakeholderId', requireAuth, async (req, res) => {
  try {
    const { projectId, stakeholderId } = req.params;
    const { name, email, department, raci, influence_level, notes } = req.body;
    
    console.log('🔧 Backend - PUT /stakeholders called:', {
      projectId, stakeholderId, userId: req.user?.id, body: req.body
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query(`
      UPDATE stakeholders 
      SET name = $1, email = $2, department = $3, raci = $4, influence_level = $5, notes = $6, updated_at = NOW()
      WHERE id = $7 AND project_id = $8
      RETURNING *
    `, [name, email, department, raci, influence_level, notes, stakeholderId, projectId]);

    if (result.rowCount === 0) {
      console.log('🔧 Backend - Stakeholder not found:', stakeholderId);
      return res.json(fail('Stakeholder not found', 'NOT_FOUND'));
    }

    console.log('🔧 Backend - Stakeholder updated successfully:', result.rows[0]);
    res.json(ok({ message: 'Stakeholder updated successfully', stakeholder: result.rows[0] }));
  } catch (error) {
    console.error('🔧 Backend - Update stakeholder error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to update stakeholder: ' + error.message, 'UPDATE_ERROR'));
  }
});

router.delete('/projects/:projectId/stakeholders/:stakeholderId', requireAuth, async (req, res) => {
  try {
    const { projectId, stakeholderId } = req.params;
    console.log('🔧 Backend - DELETE /stakeholders called:', {
      projectId, stakeholderId, userId: req.user?.id
    });

    if (!await checkProjectAccess(req.user.id, projectId)) {
      console.log('🔧 Backend - Access denied for user:', req.user.id, 'project:', projectId);
      return res.json(fail('Access denied', 'ACCESS_DENIED'));
    }

    const result = await pool.query('DELETE FROM stakeholders WHERE id = $1 AND project_id = $2 RETURNING id', [stakeholderId, projectId]);

    if (result.rowCount === 0) {
      console.log('🔧 Backend - Stakeholder not found:', stakeholderId);
      return res.json(fail('Stakeholder not found', 'NOT_FOUND'));
    }

    console.log('🔧 Backend - Stakeholder deleted successfully:', stakeholderId);
    res.json(ok({ message: 'Stakeholder deleted successfully' }));
  } catch (error) {
    console.error('🔧 Backend - Delete stakeholder error:', error);
    console.error('🔧 Backend - Error stack:', error.stack);
    res.json(fail('Failed to delete stakeholder: ' + error.message, 'DELETE_ERROR'));
  }
});

module.exports = router;

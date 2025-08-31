const express = require('express');
const { ok, fail } = require('./_utils_backend');
const pool = require('./db_backend');

const router = express.Router();

// Get all departments from database
router.get('/departments', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM departments ORDER BY name');
    return res.json(ok(result.rows));
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.json(fail('Failed to fetch departments', 'DB_ERROR'));
  }
});

// Create a new department
router.post('/departments', async (req, res) => {
  const { name } = req.body || {};
  
  if (!name || !name.trim()) {
    return res.json(fail('Department name is required', 'VALIDATION_ERROR'));
  }

  try {
    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
      [name.trim()]
    );
    return res.json(ok({ message: 'Department created successfully', department: result.rows[0] }));
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.json(fail('Department name already exists', 'DUPLICATE_ERROR'));
    }
    return res.json(fail('Failed to create department', 'DB_ERROR'));
  }
});

// Delete a department
router.delete('/departments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.json(fail('Department not found', 'NOT_FOUND'));
    }
    return res.json(ok({ message: 'Department deleted successfully' }));
  } catch (error) {
    console.error('Error deleting department:', error);
    return res.json(fail('Failed to delete department', 'DB_ERROR'));
  }
});

module.exports = router;
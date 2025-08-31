const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db_backend');

function ok(data) {
  return { success: true, data };
}

function fail(error, code = 'ERROR') {
  return { success: false, error, code };
}

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json(fail('No token provided', 'UNAUTHORIZED'));
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, full_name FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json(fail('User not found', 'UNAUTHORIZED'));
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json(fail('Invalid token', 'UNAUTHORIZED'));
  }
}

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function checkProjectAccess(userId, projectId) {
  const result = await pool.query(`
    SELECT 1 FROM projects p
    WHERE p.id = $1 AND (
      p.created_by = $2 OR
      EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = $2 AND ur.role = 'admin') OR
      EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2) OR
      EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.project_id = $1 AND mp.user_id = $2)
    )
  `, [projectId, userId]);
  
  return result.rows.length > 0;
}

module.exports = {
  ok,
  fail,
  requireAuth,
  generateToken,
  hashPassword,
  comparePassword,
  checkProjectAccess,
  pool
};
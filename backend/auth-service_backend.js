const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ok, fail, requireAuth, generateToken, hashPassword, comparePassword, pool } = require('./_utils_backend');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json(fail('Email and password required', 'MISSING_FIELDS'));
    }

    // Get user with password from auth.users equivalent
    const result = await pool.query(`
      SELECT p.id, p.email, p.full_name, au.encrypted_password 
      FROM profiles p
      LEFT JOIN auth.users au ON au.id = p.id
      WHERE LOWER(p.email) = LOWER($1)
    `, [email]);

    if (result.rows.length === 0) {
      return res.json(fail('Invalid credentials', 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];
    
    // For development, if no encrypted_password, allow any password
    if (user.encrypted_password) {
      const isValid = await comparePassword(password, user.encrypted_password);
      if (!isValid) {
        return res.json(fail('Invalid credentials', 'INVALID_CREDENTIALS'));
      }
    }

    const token = generateToken(user.id);
    const session = {
      access_token: token,
      refresh_token: `refresh_${uuidv4()}`,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    };

    res.json(ok({ user: session.user, session }));
  } catch (error) {
    console.error('Login error:', error);
    res.json(fail('Login failed', 'LOGIN_ERROR'));
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.json(fail('Email and password required', 'MISSING_FIELDS'));
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.json(fail('User already exists', 'USER_EXISTS'));
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    // Insert into profiles
    await pool.query(`
      INSERT INTO profiles (id, email, full_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
    `, [userId, email, fullName || email]);

    // Insert default role
    await pool.query(`
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, 'project_coordinator')
    `, [userId]);

    const token = generateToken(userId);
    const user = { id: userId, email, full_name: fullName || email };
    const session = {
      access_token: token,
      refresh_token: `refresh_${uuidv4()}`,
      user
    };

    res.json(ok({ message: 'User registered successfully', user, session }));
  } catch (error) {
    console.error('Register error:', error);
    res.json(fail('Registration failed', 'REGISTER_ERROR'));
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json(ok({ message: 'Logged out successfully' }));
});

// Get current user
router.get('/user', requireAuth, (req, res) => {
  res.json(ok({ user: req.user }));
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.json(fail('Refresh token required', 'MISSING_REFRESH_TOKEN'));
    }

    // For simplicity, extract user ID from refresh token (in production, store in DB)
    const userId = refresh_token.split('_')[1];
    
    const result = await pool.query('SELECT id, email, full_name FROM profiles WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.json(fail('Invalid refresh token', 'INVALID_REFRESH_TOKEN'));
    }

    const user = result.rows[0];
    const token = generateToken(user.id);
    const session = {
      access_token: token,
      refresh_token: refresh_token,
      user
    };

    res.json(ok({ user, session }));
  } catch (error) {
    console.error('Refresh error:', error);
    res.json(fail('Token refresh failed', 'REFRESH_ERROR'));
  }
});

// Get session
router.get('/session', requireAuth, async (req, res) => {
  try {
    const roleResult = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [req.user.id]);
    const role = roleResult.rows[0]?.role || 'project_coordinator';
    
    res.json(ok({ user: req.user, role }));
  } catch (error) {
    console.error('Session error:', error);
    res.json(fail('Failed to get session', 'SESSION_ERROR'));
  }
});

// Get user profile by ID
router.get('/users/:id/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await pool.query(
      `SELECT p.id, p.email, p.full_name, p.department_id, d.name AS department_name
       FROM profiles p
       LEFT JOIN departments d ON d.id = p.department_id
       WHERE p.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json(fail('User not found', 'USER_NOT_FOUND'));
    }

    const row = result.rows[0];
    const profile = {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      department_id: row.department_id,
      ...(row.department_name ? { departments: { name: row.department_name } } : {})
    };

    res.json(ok(profile));
  } catch (error) {
    console.error('Get profile error:', error);
    res.json(fail('Failed to fetch user profile', 'PROFILE_ERROR'));
  }
});

// Get user role by ID
router.get('/users/:id/role', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await pool.query('SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1', [userId]);
    const role = result.rows[0]?.role || null;
    res.json(ok({ role }));
  } catch (error) {
    console.error('Get role error:', error);
    res.json(fail('Failed to fetch user role', 'ROLE_ERROR'));
  }
});

// Assign department to user
router.post('/assign-department', requireAuth, async (req, res) => {
  try {
    const { userId, departmentId } = req.body;
    
    if (!userId || !departmentId) {
      return res.json(fail('User ID and Department ID are required', 'MISSING_FIELDS'));
    }

    // Update user's department in profiles table
    const result = await pool.query(
      'UPDATE profiles SET department_id = $1, updated_at = NOW() WHERE id = $2 RETURNING id, department_id',
      [departmentId, userId]
    );

    if (result.rows.length === 0) {
      return res.json(fail('User not found', 'USER_NOT_FOUND'));
    }

    res.json(ok({ 
      message: 'Department assigned successfully',
      profile: result.rows[0]
    }));
  } catch (error) {
    console.error('Assign department error:', error);
    res.json(fail('Failed to assign department', 'ASSIGN_ERROR'));
  }
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { createSuccessResponse, createErrorResponse, sendResponse } = require('../utils/responses');

const router = express.Router();

// Helper function to generate tokens
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '30d'
  });
  
  return { accessToken, refreshToken };
};

// POST /auth-service/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return sendResponse(res, createErrorResponse('Email and password required', 'MISSING_FIELDS', 400));
    }

    // Find user by email
    const userResult = await query(
      'SELECT p.*, au.encrypted_password FROM profiles p JOIN auth.users au ON p.id = au.id WHERE p.email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return sendResponse(res, createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS', 401));
    }

    const user = userResult.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.encrypted_password);
    if (!isValidPassword) {
      return sendResponse(res, createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS', 401));
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Create session object
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 604800, // 7 days in seconds
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };

    sendResponse(res, createSuccessResponse({
      user: session.user,
      session
    }));
  } catch (error) {
    console.error('Login error:', error);
    sendResponse(res, createErrorResponse('Login failed', 'LOGIN_ERROR', 500));
  }
});

// POST /auth-service/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    if (!email || !password) {
      return sendResponse(res, createErrorResponse('Email and password required', 'MISSING_FIELDS', 400));
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM profiles WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return sendResponse(res, createErrorResponse('User already exists', 'USER_EXISTS', 400));
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate user ID
    const userId = uuidv4();
    
    // Start transaction
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insert into auth.users (simulated)
      await client.query(
        'INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, email.toLowerCase(), hashedPassword, new Date(), new Date(), new Date()]
      );
      
      // Insert into profiles
      await client.query(
        'INSERT INTO profiles (id, email, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, email.toLowerCase(), fullName || email, new Date(), new Date()]
      );
      
      // Assign default role
      const role = email.toLowerCase() === process.env.ADMIN_EMAIL ? 'admin' : 'project_coordinator';
      await client.query(
        'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
        [userId, role]
      );
      
      await client.query('COMMIT');
      
      const user = {
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName || email,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      
      // Create session object
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 604800,
        expires_at: Math.floor(Date.now() / 1000) + 604800,
        user
      };

      sendResponse(res, createSuccessResponse({
        user,
        session,
        message: 'Registration successful'
      }));
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      sendResponse(res, createErrorResponse('User already exists', 'USER_EXISTS', 400));
    } else {
      sendResponse(res, createErrorResponse('Registration failed', 'REGISTRATION_ERROR', 500));
    }
  }
});

// POST /auth-service/logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    sendResponse(res, createSuccessResponse({ message: 'Logged out successfully' }));
  } catch (error) {
    console.error('Logout error:', error);
    sendResponse(res, createErrorResponse('Logout failed', 'LOGOUT_ERROR', 500));
  }
});

// GET /auth-service/user
router.get('/user', verifyToken, async (req, res) => {
  try {
    sendResponse(res, createSuccessResponse({ user: req.user }));
  } catch (error) {
    console.error('Get user error:', error);
    sendResponse(res, createErrorResponse('Failed to get user', 'GET_USER_ERROR', 500));
  }
});

// POST /auth-service/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return sendResponse(res, createErrorResponse('Refresh token required', 'MISSING_REFRESH_TOKEN', 400));
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
    
    // Get user from database
    const userResult = await query(
      'SELECT id, email, full_name, created_at, updated_at FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return sendResponse(res, createErrorResponse('User not found', 'USER_NOT_FOUND', 401));
    }

    const user = userResult.rows[0];
    
    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      user
    };

    sendResponse(res, createSuccessResponse({ user, session }));
  } catch (error) {
    console.error('Refresh token error:', error);
    sendResponse(res, createErrorResponse('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401));
  }
});

// GET /auth-service/users/:id/profile
router.get('/users/:id/profile', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const userResult = await query(
      'SELECT id, email, full_name, department_id, created_at, updated_at FROM profiles WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return sendResponse(res, createErrorResponse('Profile not found', 'PROFILE_NOT_FOUND', 404));
    }

    sendResponse(res, createSuccessResponse(userResult.rows[0]));
  } catch (error) {
    console.error('Get profile error:', error);
    sendResponse(res, createErrorResponse('Failed to get profile', 'GET_PROFILE_ERROR', 500));
  }
});

// GET /auth-service/users/:id/role
router.get('/users/:id/role', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const roleResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) {
      return sendResponse(res, createSuccessResponse({ role: null }));
    }

    sendResponse(res, createSuccessResponse({ role: roleResult.rows[0].role }));
  } catch (error) {
    console.error('Get role error:', error);
    sendResponse(res, createErrorResponse('Failed to get user role', 'GET_ROLE_ERROR', 500));
  }
});

// GET /auth-service/session
router.get('/session', verifyToken, async (req, res) => {
  try {
    // Get user role
    const roleResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [req.user.id]
    );

    const role = roleResult.rows.length > 0 ? roleResult.rows[0].role : null;

    sendResponse(res, createSuccessResponse({
      user: req.user,
      role
    }));
  } catch (error) {
    console.error('Get session error:', error);
    sendResponse(res, createErrorResponse('Failed to get session', 'GET_SESSION_ERROR', 500));
  }
});

module.exports = router;
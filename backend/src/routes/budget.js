const express = require('express');
// Budget routes using local Postgres via query helper and API-style responses
const { verifyToken, verifyProjectAccess } = require('../middleware/auth');
const { createSuccessResponse, createErrorResponse, sendResponse } = require('../utils/responses');
const { query } = require('../config/database');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Get project budget
router.get('/projects/:projectId/budget', verifyProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    console.log('🔍 Fetching budget for project:', projectId, 'user:', userId);

    // Get project budget
    const budgetResult = await query('SELECT * FROM project_budgets WHERE project_id = $1 LIMIT 1', [projectId]);
    const budget = budgetResult.rows[0] || null;

    // Get budget categories (via project_budgets -> budget_categories)
    const categoriesResult = await query(`
      SELECT bc.*,
             btc.label AS budget_type_label
      FROM budget_categories bc
      JOIN project_budgets pb ON pb.id = bc.project_budget_id
      LEFT JOIN budget_type_config btc ON btc.code = bc.budget_type_code
      WHERE pb.project_id = $1
      ORDER BY bc.name
    `, [projectId]);
    const categories = categoriesResult.rows || [];

    // Get spending entries for project
    const spendingResult = await query(`
      SELECT bs.*
      FROM budget_spending bs
      JOIN budget_categories bc ON bc.id = bs.budget_category_id
      JOIN project_budgets pb ON pb.id = bc.project_budget_id
      WHERE pb.project_id = $1
      ORDER BY bs.created_at DESC
    `, [projectId]);
    const spendingEntries = spendingResult.rows || [];

    // Get budget types
    const budgetTypesResult = await query(`
      SELECT id, code, label, default_allocation_percent, notes
      FROM budget_type_config
      WHERE enabled = true
      ORDER BY dropdown_display_order, label
    `, []);
    const budgetTypes = budgetTypesResult.rows || [];

    console.log('✅ Budget data fetched successfully');
    
    // Build nested structure expected by UI
    let budgetWithNested = budget;
    if (budget) {
      const categoriesWithSpending = categories.map(c => ({
        ...c,
        budget_spending: spendingEntries.filter(se => se.budget_category_id === c.id)
      }));
      budgetWithNested = { ...budget, budget_categories: categoriesWithSpending };
    }
    
    sendResponse(res, createSuccessResponse({
      budget: budgetWithNested,
      categories,
      spendingEntries,
      budgetTypes,
      analytics: null
    }));

  } catch (error) {
    console.error('❌ Budget fetch error:', error);
    const msg = process.env.NODE_ENV === 'production' ? 'Failed to fetch budget' : `Failed to fetch budget: ${error.message}`;
    sendResponse(res, createErrorResponse(msg, 'FETCH_ERROR', 500));
  }
});

// Create or update project budget
router.post('/projects/:projectId/budget', verifyProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { total_budget, budget_type_id, fiscal_year, description } = req.body;
    const userId = req.user?.id;

    console.log('💰 Creating/updating budget for project:', projectId);

    // Explicit upsert since project_id is not unique
    const existing = await query('SELECT id FROM project_budgets WHERE project_id = $1', [projectId]);

    let result;
    if (existing.rows.length > 0) {
      result = await query(`
        UPDATE project_budgets
        SET currency = COALESCE($2, currency),
            total_budget_allocated = COALESCE($3, total_budget_allocated),
            total_budget_received = COALESCE($4, total_budget_received),
            start_date = $5,
            end_date = $6,
            updated_at = NOW()
        WHERE project_id = $1
        RETURNING *;
      `, [
        projectId,
        req.body.currency || null,
        req.body.total_budget_allocated || null,
        req.body.total_budget_received || null,
        req.body.start_date || null,
        req.body.end_date || null,
      ]);
    } else {
      result = await query(`
        INSERT INTO project_budgets (project_id, currency, total_budget_allocated, total_budget_received, start_date, end_date, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `, [
        projectId,
        req.body.currency || 'INR',
        req.body.total_budget_allocated || 0,
        req.body.total_budget_received || 0,
        req.body.start_date || null,
        req.body.end_date || null,
        userId
      ]);
    }

    console.log('✅ Budget saved successfully');
    sendResponse(res, createSuccessResponse(result.rows[0]));

  } catch (error) {
    console.error('❌ Budget save error:', error);
    const msg = process.env.NODE_ENV === 'production' ? 'Failed to save budget' : `Failed to save budget: ${error.message}`;
    sendResponse(res, createErrorResponse(msg, 'SAVE_ERROR', 500));
  }
});

// Create budget category
router.post('/projects/:projectId/categories', verifyProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, allocated_amount, description } = req.body;
    const userId = req.user?.id;

    console.log('📁 Creating budget category for project:', projectId);

    // Ensure there is a project_budgets row and get its id
    let pb = await query('SELECT id FROM project_budgets WHERE project_id = $1', [projectId]);
    let projectBudgetId;
    if (pb.rows.length === 0) {
      const created = await query(
        'INSERT INTO project_budgets (project_id, currency, created_by) VALUES ($1, $2, $3) RETURNING id',
        [projectId, 'INR', userId]
      );
      projectBudgetId = created.rows[0].id;
    } else {
      projectBudgetId = pb.rows[0].id;
    }

    const insertQuery = `
      INSERT INTO budget_categories (project_budget_id, budget_type_code, name, budget_allocated, budget_received, comments, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await query(insertQuery, [projectBudgetId, req.body.budget_type_code, req.body.name, req.body.budget_allocated || 0, req.body.budget_received || 0, req.body.comments || null, userId]);

    console.log('✅ Budget category created successfully');
    sendResponse(res, createSuccessResponse(result.rows[0]));

  } catch (error) {
    console.error('❌ Category creation error:', error);
    const msg = process.env.NODE_ENV === 'production' ? 'Failed to create budget category' : `Failed to create budget category: ${error.message}`;
    sendResponse(res, createErrorResponse(msg, 'CREATE_ERROR', 500));
  }
});

// Create spending entry
router.post('/categories/:categoryId/spending', verifyToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { amount, description, expense_date } = req.body;
    const userId = req.user?.id;

    console.log('💸 Creating spending entry for category:', categoryId);

    const insertQuery = `
      INSERT INTO budget_spending (budget_category_id, date, vendor, description, invoice_id, amount, payment_method, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const result = await query(insertQuery, [
      categoryId,
      req.body.date,
      req.body.vendor || null,
      req.body.description,
      req.body.invoice_id || null,
      req.body.amount,
      req.body.payment_method || null,
      req.body.status || 'pending',
      userId
    ]);

    console.log('✅ Spending entry created successfully');
    sendResponse(res, createSuccessResponse(result.rows[0]));

  } catch (error) {
    console.error('❌ Spending entry creation error:', error);
    const msg = process.env.NODE_ENV === 'production' ? 'Failed to create spending entry' : `Failed to create spending entry: ${error.message}`;
    sendResponse(res, createErrorResponse(msg, 'CREATE_ERROR', 500));
  }
});

// Get budget types
router.get('/budget-types', verifyToken, async (req, res) => {
  try {
    console.log('📋 Fetching budget types');

    const result = await query(`
      SELECT id, code, label, default_allocation_percent, notes
      FROM budget_type_config
      WHERE enabled = true
      ORDER BY dropdown_display_order, label
    `, []);

    console.log('✅ Budget types fetched successfully');
    sendResponse(res, createSuccessResponse(result.rows || []));

  } catch (error) {
    console.error('❌ Budget types fetch error:', error);
    const msg = process.env.NODE_ENV === 'production' ? 'Failed to fetch budget types' : `Failed to fetch budget types: ${error.message}`;
    sendResponse(res, createErrorResponse(msg, 'FETCH_ERROR', 500));
  }
});

module.exports = router;
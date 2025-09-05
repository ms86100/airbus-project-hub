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

    // Get budget categories
    const categoriesResult = await query('SELECT * FROM budget_categories WHERE project_id = $1 ORDER BY name', [projectId]);
    const categories = categoriesResult.rows || [];

    // Get spending entries for each category
    let spendingEntries = [];
    const categoryIds = categories.map(c => c.id);
    if (categoryIds.length > 0) {
      const spendingResult = await query(
        'SELECT * FROM spending_entries WHERE category_id = ANY($1::uuid[]) ORDER BY created_at DESC',
        [categoryIds]
      );
      spendingEntries = spendingResult.rows || [];
    }

    // Get budget types
    const budgetTypesResult = await query('SELECT * FROM budget_types ORDER BY name', []);
    const budgetTypes = budgetTypesResult.rows || [];

    console.log('✅ Budget data fetched successfully');
    
    sendResponse(res, createSuccessResponse({
      budget,
      categories,
      spendingEntries,
      budgetTypes
    }));

  } catch (error) {
    console.error('❌ Budget fetch error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch budget', 'FETCH_ERROR', 500));
  }
});

// Create or update project budget
router.post('/projects/:projectId/budget', verifyProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { total_budget, budget_type_id, fiscal_year, description } = req.body;
    const userId = req.user?.id;

    console.log('💰 Creating/updating budget for project:', projectId);

    const upsertQuery = `
      INSERT INTO project_budgets (project_id, total_budget, budget_type_id, fiscal_year, description, created_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (project_id) DO UPDATE SET
        total_budget = EXCLUDED.total_budget,
        budget_type_id = EXCLUDED.budget_type_id,
        fiscal_year = EXCLUDED.fiscal_year,
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await query(upsertQuery, [projectId, total_budget, budget_type_id, fiscal_year, description, userId]);

    console.log('✅ Budget saved successfully');
    sendResponse(res, createSuccessResponse(result.rows[0]));

  } catch (error) {
    console.error('❌ Budget save error:', error);
    sendResponse(res, createErrorResponse('Failed to save budget', 'SAVE_ERROR', 500));
  }
});

// Create budget category
router.post('/projects/:projectId/categories', verifyProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, allocated_amount, description } = req.body;
    const userId = req.user?.id;

    console.log('📁 Creating budget category for project:', projectId);

    const insertQuery = `
      INSERT INTO budget_categories (project_id, name, allocated_amount, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await query(insertQuery, [projectId, name, allocated_amount, description, userId]);

    console.log('✅ Budget category created successfully');
    sendResponse(res, createSuccessResponse(result.rows[0]));

  } catch (error) {
    console.error('❌ Category creation error:', error);
    sendResponse(res, createErrorResponse('Failed to create budget category', 'CREATE_ERROR', 500));
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
      INSERT INTO spending_entries (category_id, amount, description, expense_date, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await query(insertQuery, [categoryId, amount, description, expense_date, userId]);

    console.log('✅ Spending entry created successfully');
    sendResponse(res, createSuccessResponse(result.rows[0]));

  } catch (error) {
    console.error('❌ Spending entry creation error:', error);
    sendResponse(res, createErrorResponse('Failed to create spending entry', 'CREATE_ERROR', 500));
  }
});

// Get budget types
router.get('/budget-types', verifyToken, async (req, res) => {
  try {
    console.log('📋 Fetching budget types');

    const result = await query('SELECT * FROM budget_types ORDER BY name', []);

    console.log('✅ Budget types fetched successfully');
    sendResponse(res, createSuccessResponse(result.rows || []));

  } catch (error) {
    console.error('❌ Budget types fetch error:', error);
    sendResponse(res, createErrorResponse('Failed to fetch budget types', 'FETCH_ERROR', 500));
  }
});

module.exports = router;
const express = require('express');
const { auth } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/responses');
const { supabase } = require('../config/database');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Get project budget
router.get('/projects/:projectId/budget', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    console.log('🔍 Fetching budget for project:', projectId, 'user:', userId);

    // Get project budget
    const { data: budget, error: budgetError } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (budgetError && budgetError.code !== 'PGRST116') {
      console.error('❌ Budget fetch error:', budgetError);
      return errorResponse(res, 'Failed to fetch budget', 500);
    }

    // Get budget categories
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    if (categoriesError) {
      console.error('❌ Categories fetch error:', categoriesError);
      return errorResponse(res, 'Failed to fetch budget categories', 500);
    }

    // Get spending entries for each category
    const categoryIds = categories?.map(c => c.id) || [];
    let spendingEntries = [];
    
    if (categoryIds.length > 0) {
      const { data: spending, error: spendingError } = await supabase
        .from('spending_entries')
        .select('*')
        .in('category_id', categoryIds)
        .order('created_at', { ascending: false });

      if (spendingError) {
        console.error('❌ Spending fetch error:', spendingError);
        return errorResponse(res, 'Failed to fetch spending entries', 500);
      }

      spendingEntries = spending || [];
    }

    // Get budget types
    const { data: budgetTypes, error: typesError } = await supabase
      .from('budget_types')
      .select('*')
      .order('name');

    if (typesError) {
      console.error('❌ Budget types fetch error:', typesError);
      return errorResponse(res, 'Failed to fetch budget types', 500);
    }

    console.log('✅ Budget data fetched successfully');
    
    successResponse(res, {
      budget: budget || null,
      categories: categories || [],
      spendingEntries: spendingEntries || [],
      budgetTypes: budgetTypes || []
    });

  } catch (error) {
    console.error('❌ Budget fetch error:', error);
    errorResponse(res, error.message, 500);
  }
});

// Create or update project budget
router.post('/projects/:projectId/budget', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { total_budget, budget_type_id, fiscal_year, description } = req.body;
    const userId = req.user?.id;

    console.log('💰 Creating/updating budget for project:', projectId);

    const { data, error } = await supabase
      .from('project_budgets')
      .upsert({
        project_id: projectId,
        total_budget,
        budget_type_id,
        fiscal_year,
        description,
        created_by: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Budget upsert error:', error);
      return errorResponse(res, 'Failed to save budget', 500);
    }

    console.log('✅ Budget saved successfully');
    successResponse(res, data);

  } catch (error) {
    console.error('❌ Budget save error:', error);
    errorResponse(res, error.message, 500);
  }
});

// Create budget category
router.post('/projects/:projectId/categories', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, allocated_amount, description } = req.body;
    const userId = req.user?.id;

    console.log('📁 Creating budget category for project:', projectId);

    const { data, error } = await supabase
      .from('budget_categories')
      .insert({
        project_id: projectId,
        name,
        allocated_amount,
        description,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Category creation error:', error);
      return errorResponse(res, 'Failed to create budget category', 500);
    }

    console.log('✅ Budget category created successfully');
    successResponse(res, data);

  } catch (error) {
    console.error('❌ Category creation error:', error);
    errorResponse(res, error.message, 500);
  }
});

// Create spending entry
router.post('/categories/:categoryId/spending', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { amount, description, expense_date } = req.body;
    const userId = req.user?.id;

    console.log('💸 Creating spending entry for category:', categoryId);

    const { data, error } = await supabase
      .from('spending_entries')
      .insert({
        category_id: categoryId,
        amount,
        description,
        expense_date,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Spending entry creation error:', error);
      return errorResponse(res, 'Failed to create spending entry', 500);
    }

    console.log('✅ Spending entry created successfully');
    successResponse(res, data);

  } catch (error) {
    console.error('❌ Spending entry creation error:', error);
    errorResponse(res, error.message, 500);
  }
});

// Get budget types
router.get('/budget-types', async (req, res) => {
  try {
    console.log('📋 Fetching budget types');

    const { data, error } = await supabase
      .from('budget_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Budget types fetch error:', error);
      return errorResponse(res, 'Failed to fetch budget types', 500);
    }

    console.log('✅ Budget types fetched successfully');
    successResponse(res, data || []);

  } catch (error) {
    console.error('❌ Budget types fetch error:', error);
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
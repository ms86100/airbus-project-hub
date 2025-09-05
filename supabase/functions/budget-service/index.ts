import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateJWT } from '../shared/api-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('🏷️ Budget service request:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication
    const user = await validateJWT(req, supabase);
    if (!user) {
      return new Response(
        JSON.stringify({ code: 401, message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Route: /budget-service/projects/{projectId}/budget
    if (pathParts.length >= 4 && pathParts[0] === 'budget-service' && pathParts[1] === 'projects' && pathParts[3] === 'budget') {
      const projectId = pathParts[2];
      
      if (req.method === 'GET') {
        // Get project budget with categories, spending, receipts
        console.log('📊 Getting budget for project:', projectId);
        
        const { data: budget, error: budgetError } = await supabase
          .from('project_budgets')
          .select(`
            *,
            budget_categories (
              *,
              budget_spending (*)
            ),
            budget_receipts (*),
            budget_comments (*),
            budget_alert_rules (*)
          `)
          .eq('project_id', projectId)
          .maybeSingle();

        if (budgetError) {
          console.error('❌ Error fetching budget:', budgetError);
          return new Response(
            JSON.stringify({ code: 500, message: 'Failed to fetch budget', error: budgetError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get budget types for reference
        const { data: budgetTypes, error: typesError } = await supabase
          .from('budget_type_config')
          .select('*')
          .eq('enabled', true)
          .order('dropdown_display_order');

        if (typesError) {
          console.error('❌ Error fetching budget types:', typesError);
          return new Response(
            JSON.stringify({ code: 500, message: 'Failed to fetch budget types', error: typesError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = {
          budget,
          budgetTypes,
          analytics: budget ? calculateBudgetAnalytics(budget) : null
        };

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (req.method === 'POST') {
        // Create or update project budget
        const body = await req.json();
        console.log('💰 Creating/updating budget for project:', projectId, body);

        const { data: existingBudget } = await supabase
          .from('project_budgets')
          .select('id')
          .eq('project_id', projectId)
          .maybeSingle();

        let budgetResult;
        
        if (existingBudget) {
          // Update existing budget
          const { data, error } = await supabase
            .from('project_budgets')
            .update({
              currency: body.currency || 'INR',
              total_budget_allocated: body.total_budget_allocated || 0,
              total_budget_received: body.total_budget_received || 0,
              start_date: body.start_date,
              end_date: body.end_date,
            })
            .eq('id', existingBudget.id)
            .select()
            .single();

          budgetResult = { data, error };
        } else {
          // Create new budget
          const { data, error } = await supabase
            .from('project_budgets')
            .insert({
              project_id: projectId,
              currency: body.currency || 'INR',
              total_budget_allocated: body.total_budget_allocated || 0,
              total_budget_received: body.total_budget_received || 0,
              start_date: body.start_date,
              end_date: body.end_date,
              created_by: user.id,
            })
            .select()
            .single();

          budgetResult = { data, error };
        }

        if (budgetResult.error) {
          console.error('❌ Error saving budget:', budgetResult.error);
          return new Response(
            JSON.stringify({ code: 500, message: 'Failed to save budget', error: budgetResult.error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: budgetResult.data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route: /budget-service/projects/{projectId}/categories
    if (pathParts.length >= 4 && pathParts[0] === 'budget-service' && pathParts[1] === 'projects' && pathParts[3] === 'categories') {
      const projectId = pathParts[2];

      if (req.method === 'POST') {
        // Create budget category
        const body = await req.json();
        console.log('📂 Creating budget category for project:', projectId, body);

        // Get the project budget first
        const { data: projectBudget } = await supabase
          .from('project_budgets')
          .select('id')
          .eq('project_id', projectId)
          .single();

        if (!projectBudget) {
          return new Response(
            JSON.stringify({ code: 404, message: 'Project budget not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('budget_categories')
          .insert({
            project_budget_id: projectBudget.id,
            budget_type_code: body.budget_type_code,
            name: body.name,
            budget_allocated: body.budget_allocated || 0,
            budget_received: body.budget_received || 0,
            comments: body.comments,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating category:', error);
          return new Response(
            JSON.stringify({ code: 500, message: 'Failed to create category', error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route: /budget-service/categories/{categoryId}/spending
    if (pathParts.length >= 4 && pathParts[0] === 'budget-service' && pathParts[1] === 'categories' && pathParts[3] === 'spending') {
      const categoryId = pathParts[2];

      if (req.method === 'POST') {
        // Create spending entry
        const body = await req.json();
        console.log('💸 Creating spending entry for category:', categoryId, body);

        const { data, error } = await supabase
          .from('budget_spending')
          .insert({
            budget_category_id: categoryId,
            date: body.date,
            vendor: body.vendor,
            description: body.description,
            invoice_id: body.invoice_id,
            amount: body.amount,
            payment_method: body.payment_method,
            status: body.status || 'pending',
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating spending:', error);
          return new Response(
            JSON.stringify({ code: 500, message: 'Failed to create spending', error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update category amount_spent
        await updateCategorySpentAmount(supabase, categoryId);

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route: /budget-service/budget-types
    if (pathParts.length >= 2 && pathParts[0] === 'budget-service' && pathParts[1] === 'budget-types') {
      if (req.method === 'GET') {
        // Get all budget types
        const { data, error } = await supabase
          .from('budget_type_config')
          .select('*')
          .eq('enabled', true)
          .order('dropdown_display_order');

        if (error) {
          console.error('❌ Error fetching budget types:', error);
          return new Response(
            JSON.stringify({ code: 500, message: 'Failed to fetch budget types', error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ code: 404, message: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Budget service error:', error);
    return new Response(
      JSON.stringify({ code: 500, message: 'Internal server error', error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to calculate budget analytics
function calculateBudgetAnalytics(budget: any) {
  const categories = budget.budget_categories || [];
  
  let totalAllocated = 0;
  let totalReceived = 0;
  let totalSpent = 0;
  
  categories.forEach((category: any) => {
    totalAllocated += Number(category.budget_allocated || 0);
    totalReceived += Number(category.budget_received || 0);
    totalSpent += Number(category.amount_spent || 0);
  });

  const remainingTotal = totalReceived - totalSpent;
  const overallVarianceAmount = remainingTotal;
  const overallVariancePercent = totalReceived > 0 ? (overallVarianceAmount / totalReceived) * 100 : 0;

  return {
    totals: {
      allocated_total: totalAllocated,
      received_total: totalReceived,
      spent_total: totalSpent,
      remaining_total: remainingTotal,
    },
    variance_summary: {
      overall_variance_amount: overallVarianceAmount,
      overall_variance_percent: Math.round(overallVariancePercent * 100) / 100,
    },
    category_breakdown: categories.map((category: any) => ({
      code: category.budget_type_code,
      name: category.name,
      allocated: Number(category.budget_allocated || 0),
      received: Number(category.budget_received || 0),
      spent: Number(category.amount_spent || 0),
      variance: Number(category.budget_received || 0) - Number(category.amount_spent || 0),
      percent_spent: Number(category.budget_received || 0) > 0 ? 
        Math.round((Number(category.amount_spent || 0) / Number(category.budget_received || 0)) * 10000) / 100 : 0,
    })),
  };
}

// Helper function to update category spent amount
async function updateCategorySpentAmount(supabase: any, categoryId: string) {
  const { data: spending } = await supabase
    .from('budget_spending')
    .select('amount')
    .eq('budget_category_id', categoryId)
    .eq('status', 'paid');

  const totalSpent = spending?.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) || 0;

  await supabase
    .from('budget_categories')
    .update({ amount_spent: totalSpent })
    .eq('id', categoryId);
}
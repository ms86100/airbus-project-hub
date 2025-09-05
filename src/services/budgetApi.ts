import { supabase } from '@/integrations/supabase/client';

// Environment-aware API service for budget management
class BudgetApiService {
  private getBaseUrl(): string {
    // Check if we're running on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api'; // Adjust port as needed
    }
    
    // For cloud/production, use Supabase functions
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Budget operations
  async getProjectBudget(projectId: string) {
    return this.makeRequest(`/budget-service/projects/${projectId}/budget`);
  }

  async createOrUpdateBudget(projectId: string, budgetData: any) {
    return this.makeRequest(`/budget-service/projects/${projectId}/budget`, {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  // Budget categories
  async createBudgetCategory(projectId: string, categoryData: any) {
    return this.makeRequest(`/budget-service/projects/${projectId}/categories`, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  // Spending entries
  async createSpendingEntry(categoryId: string, spendingData: any) {
    return this.makeRequest(`/budget-service/categories/${categoryId}/spending`, {
      method: 'POST',
      body: JSON.stringify(spendingData),
    });
  }

  // Budget types
  async getBudgetTypes() {
    return this.makeRequest('/budget-service/budget-types');
  }
}

export const budgetApi = new BudgetApiService();
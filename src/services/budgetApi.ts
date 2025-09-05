import { supabase } from '@/integrations/supabase/client';

// Environment-aware API service for budget management
class BudgetApiService {
  private getBaseUrl(): string {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost 
      ? 'http://localhost:3001/api' 
      : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    
    console.log('🌐 Budget API Base URL:', {
      hostname: window.location.hostname,
      isLocalhost,
      baseUrl,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL
    });
    
    return baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    console.log('🔐 Getting auth headers...');
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    console.log('🔐 Auth session status:', {
      hasSession: !!session.data.session,
      hasToken: !!token,
      userId: session.data.session?.user?.id,
      expiresAt: session.data.session?.expires_at
    });
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };
    
    console.log('🔐 Request headers:', {
      hasAuth: !!headers.Authorization,
      hasApiKey: !!headers.apikey,
      authLength: headers.Authorization.length
    });
    
    return headers;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const headers = await this.getAuthHeaders();
    const fullUrl = `${baseUrl}${endpoint}`;
    
    console.log('🔗 Budget API Request:', {
      method: options.method || 'GET',
      url: fullUrl,
      headers: headers,
      body: options.body
    });
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      console.log('📡 Budget API Response:', {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Budget API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: fullUrl
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Budget API Success:', result);
      return result;
    } catch (error) {
      console.error('❌ Budget API Network Error:', {
        error: error.message,
        url: fullUrl,
        stack: error.stack
      });
      throw error;
    }
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
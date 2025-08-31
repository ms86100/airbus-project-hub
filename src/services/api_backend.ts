// LOCAL BACKEND API CLIENT - For testing with local PostgreSQL
// This is a copy of api.ts modified to work with your local Node.js backend

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClientBackend {
  private baseUrl: string;

  constructor() {
    // Point to your local Node.js backend running on port 4000
    this.baseUrl = 'http://localhost:4000';
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      // Use microservice-stored session tokens only (no Supabase SDK coupling)
      const storedAuth = localStorage.getItem('auth_session') || localStorage.getItem('app_session');
      if (storedAuth) {
        try {
          const session = JSON.parse(storedAuth);
          const token = session?.access_token || session?.token || session?.accessToken;
          if (token) {
            return token;
          }
        } catch (e) {
          console.warn('Failed parsing stored session');
        }
      }

      console.log('❌ No access token available');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();

    const doFetch = async (authToken?: string) => {
      const headers = {
        'Content-Type': 'application/json',
        // Remove Supabase apikey for local backend
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...options.headers,
      } as Record<string, string>;

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {}
      return { response, result };
    };

    try {
      console.log(`🌐 [BACKEND] Making request to: ${endpoint}`);
      console.log(`🔐 [BACKEND] Using token: ${token ? `${token.substring(0, 20)}...` : 'None'}`);

      let { response, result } = await doFetch(token || undefined);

      if (
        response.status === 401 ||
        (result && (result.message === 'Invalid JWT' || result.code === 'INVALID_TOKEN' || result.code === 'UNAUTHORIZED'))
      ) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          ({ response, result } = await doFetch(refreshed));
        }
      }

      console.log(`📡 [BACKEND] Response from ${endpoint}:`, result);
      return result ?? { success: false, error: 'Empty response', code: 'EMPTY_RESPONSE' };
    } catch (error) {
      console.error('[BACKEND] API request failed:', error);
      return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
    }
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const storedAuth = localStorage.getItem('auth_session') || localStorage.getItem('app_session');
      if (!storedAuth) return null;
      const session = JSON.parse(storedAuth);
      const refreshToken = session?.refresh_token;
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseUrl}/auth-service/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();
      if (response.ok && data?.success && data?.data?.session) {
        localStorage.setItem('auth_session', JSON.stringify(data.data.session));
        localStorage.setItem('app_session', JSON.stringify(data.data.session));
        return data.data.session.access_token || null;
      }

      // Cleanup on refresh failure
      localStorage.removeItem('auth_session');
      localStorage.removeItem('app_session');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('app_user');
      return null;
    } catch (e) {
      return null;
    }
  }

  // Auth Service Methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; session: any }>> {
    return this.makeRequest('/auth-service/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, fullName?: string): Promise<ApiResponse<{ user: any; session: any; message: string }>> {
    return this.makeRequest('/auth-service/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/auth-service/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: any }>> {
    return this.makeRequest('/auth-service/user', {
      method: 'GET',
    });
  }

  async refreshSession(refreshToken: string): Promise<ApiResponse<{ user: any; session: any }>> {
    return this.makeRequest('/auth-service/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getCurrentSession(): Promise<ApiResponse<{ user: any; role?: string }>> {
    return this.makeRequest('/auth-service/session', {
      method: 'GET',
    });
  }

  // Projects Service Methods
  async getProjects(): Promise<ApiResponse<any[]>> {
    return this.makeRequest('/projects-service/projects', {
      method: 'GET',
    });
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority?: string;
    status?: string;
    departmentId?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest('/projects-service/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProject(id: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/projects-service/projects/${id}`, {
      method: 'GET',
    });
  }

  async updateProject(id: string, projectData: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    priority?: string;
    status?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest(`/projects-service/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/projects-service/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Roadmap Service Methods
  async getRoadmap(projectId: string): Promise<ApiResponse<{ projectId: string; milestones: any[] }>> {
    return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap`, { method: 'GET' });
  }

  async createMilestone(projectId: string, data: { name: string; description?: string; dueDate: string; status?: 'planning' | 'in_progress' | 'completed' | 'blocked'; }): Promise<ApiResponse<{ message: string; milestone: any }>> {
    return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMilestone(projectId: string, milestoneId: string, data: { name?: string; description?: string; dueDate?: string; status?: 'planning' | 'in_progress' | 'completed' | 'blocked'; }): Promise<ApiResponse<{ message: string; milestone: any }>> {
    return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMilestone(projectId: string, milestoneId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap/${milestoneId}`, {
      method: 'DELETE',
    });
  }

  // Add other service methods as needed...
  // For now, just implementing the core ones for testing
}

export const apiClientBackend = new ApiClientBackend();
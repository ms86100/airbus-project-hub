// Central API client for all microservices
import { supabase } from '@/integrations/supabase/client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://knivoexfpvqohsvpsziq.supabase.co/functions/v1';
  }

  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaXZvZXhmcHZxb2hzdnBzemlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjgyOTgsImV4cCI6MjA3MTgwNDI5OH0.TfV3FF9FNYXVv_f5TTgne4-CrDWmN1xOed2ZIjzn96Q',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error',
        code: 'NETWORK_ERROR',
      };
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

  // Access Control Service Methods
  async getProjectAccess(projectId: string): Promise<ApiResponse<{ projectId: string; permissions: any[] }>> {
    return this.makeRequest(`/access-service/projects/${projectId}/access`, {
      method: 'GET',
    });
  }

  async grantModulePermission(projectId: string, data: {
    userId: string;
    module: string;
    accessLevel: 'read' | 'write';
  }): Promise<ApiResponse<{ message: string; permission: any }>> {
    return this.makeRequest(`/access-service/projects/${projectId}/access`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateModulePermission(projectId: string, userId: string, data: {
    module: string;
    accessLevel: 'read' | 'write';
  }): Promise<ApiResponse<{ message: string; permission: any }>> {
    return this.makeRequest(`/access-service/projects/${projectId}/access/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Team Capacity Service Methods
  async getProjectCapacity(projectId: string): Promise<ApiResponse<{
    projectId: string;
    iterations: any[];
    summary: { totalIterations: number; totalCapacity: number };
  }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, {
      method: 'GET',
    });
  }

  async createCapacityIteration(projectId: string, data: {
    type: 'iteration';
    iterationName: string;
    startDate: string;
    endDate: string;
    workingDays: number;
    committedStoryPoints?: number;
  }): Promise<ApiResponse<{ message: string; iteration: any }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addCapacityMember(projectId: string, data: {
    type: 'member';
    iterationId: string;
    memberName: string;
    role: string;
    workMode: string;
    availabilityPercent: number;
    leaves: number;
    stakeholderId?: string;
    teamId?: string;
  }): Promise<ApiResponse<{ message: string; member: any }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCapacityItem(projectId: string, itemId: string, data: any): Promise<ApiResponse<{ message: string; iteration?: any; member?: any }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCapacityItem(projectId: string, itemId: string, type: 'iteration' | 'member'): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity/${itemId}?type=${type}`, {
      method: 'DELETE',
    });
  }

  async revokeModulePermission(projectId: string, userId: string, module: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/access-service/projects/${projectId}/access/${userId}?module=${module}`, {
      method: 'DELETE',
    });
  }
  // Retrospectives Service Methods
  async getRetrospectives(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'GET' });
  }

  async createRetrospective(projectId: string, data: { framework?: string; iterationId?: string; columns?: { title: string; subtitle?: string }[] }): Promise<ApiResponse<{ message: string; retrospective: any }>> {
    return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addRetrospectiveAction(retrospectiveId: string, data: {
    what_task: string;
    when_sprint?: string;
    who_responsible?: string;
    how_approach?: string;
    backlog_ref_id?: string;
  }): Promise<ApiResponse<{ message: string; action: any }>> {
    return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/actions`, {
      method: 'POST',
      body: JSON.stringify(data),
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
}

export const apiClient = new ApiClient();
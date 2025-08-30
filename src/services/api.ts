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

  async updateModulePermission(projectId: string, userId: string, data: {
    module: string;
    accessLevel: 'read' | 'write';
  }): Promise<ApiResponse<{ message: string; permission: any }>> {
    return this.makeRequest(`/access-service/projects/${projectId}/access/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAllPermissions(): Promise<ApiResponse<{ permissions: any[] }>> {
    return this.makeRequest('/access-service/permissions', { method: 'GET' });
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

  async getCapacityStats(): Promise<ApiResponse<{
    totalIterations: number;
    totalMembers: number;
    avgCapacity: number;
    totalProjects: number;
  }>> {
    return this.makeRequest('/capacity-service/stats', { method: 'GET' });
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

  async getRetrospectiveStats(): Promise<ApiResponse<{
    totalRetrospectives: number;
    totalActionItems: number;
    convertedTasks: number;
    conversionRate: number;
  }>> {
    return this.makeRequest('/retro-service/stats', { method: 'GET' });
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

  // Backlog Service Methods
  async getBacklog(projectId: string): Promise<ApiResponse<{ projectId: string; items: any[] }>> {
    return this.makeRequest(`/backlog-service/projects/${projectId}/backlog`, { method: 'GET' });
  }

  async createBacklogItem(projectId: string, data: {
    title: string;
    description?: string;
    priority?: string;
    status?: 'backlog' | 'in_progress' | 'blocked' | 'done';
    ownerId?: string;
    targetDate?: string;
    sourceType?: string;
  }): Promise<ApiResponse<{ message: string; item: any }>> {
    return this.makeRequest(`/backlog-service/projects/${projectId}/backlog`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBacklogItem(projectId: string, itemId: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: 'backlog' | 'in_progress' | 'blocked' | 'done';
    ownerId?: string;
    targetDate?: string;
  }): Promise<ApiResponse<{ message: string; item: any }>> {
    return this.makeRequest(`/backlog-service/projects/${projectId}/backlog/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBacklogItem(projectId: string, itemId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/backlog-service/projects/${projectId}/backlog/${itemId}`, {
      method: 'DELETE',
    });
  }

  async moveBacklogToMilestone(projectId: string, backlogItemId: string, milestoneId: string): Promise<ApiResponse<{ message: string; task: any }>> {
    return this.makeRequest(`/backlog-service/projects/${projectId}/backlog/${backlogItemId}/move`, {
      method: 'POST',
      body: JSON.stringify({ milestoneId }),
    });
  }
  // Stakeholders Service Methods
  async getStakeholders(projectId: string): Promise<ApiResponse<{ projectId: string; stakeholders: any[] }>> {
    return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders`, { method: 'GET' });
  }

  async createStakeholder(projectId: string, data: { name: string; email?: string; department?: string; raci?: string; influence_level?: string; notes?: string; }): Promise<ApiResponse<{ message: string; stakeholder: any }>> {
    return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Audit Service Methods
  async getProjectHistory(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/audit-service/projects/${projectId}/history`, { method: 'GET' });
  }

  async writeAuditLog(data: { projectId: string; module: string; action: string; entity_type?: string; entity_id?: string; old_values?: any; new_values?: any; description?: string; }): Promise<ApiResponse<{ message: string; entry: any }>> {
    return this.makeRequest(`/audit-service/audit/log`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Workspace Service Methods
  async getWorkspace(projectId: string): Promise<ApiResponse<{ projectId: string; summary: any; recentTasks: any[]; upcomingMilestones: any[] }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/workspace`, { method: 'GET' });
  }

  // Wizard Service Methods
  async startWizard(seed: any): Promise<ApiResponse<{ message: string; sessionId: string; seed: any }>> {
    return this.makeRequest(`/wizard-service/projects/wizard/start`, {
      method: 'POST',
      body: JSON.stringify(seed || {}),
    });
  }

  async completeWizard(payload: { name: string; description?: string; startDate?: string; endDate?: string; priority?: string; status?: string; departmentId?: string; }): Promise<ApiResponse<{ message: string; project: any }>> {
    return this.makeRequest(`/wizard-service/projects/wizard/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Department Service Methods
  async getDepartments(): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/department-service/departments`, { method: 'GET' });
  }

  async createDepartment(name: string): Promise<ApiResponse<{ message: string; department: any }>> {
    return this.makeRequest(`/department-service/departments`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Access Control Service Methods (consolidated)
  async getModulePermissions(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/access-service/projects/${projectId}/permissions`, { method: 'GET' });
  }

  async grantModulePermission(data: { projectId: string; userEmail: string; module: string; accessLevel: string }): Promise<ApiResponse<{ message: string; permission: any }>> {
    return this.makeRequest(`/access-service/permissions/grant`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeModulePermission(permissionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/access-service/permissions/${permissionId}/revoke`, {
      method: 'DELETE',
    });
  }

  // Audit Service Methods (additional)
  async getAuditLog(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/audit-service/projects/${projectId}/logs`, { method: 'GET' });
  }

  // Risk Register Methods (workspace service)
  async getRisks(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/risks`, { method: 'GET' });
  }

  async createRisk(projectId: string, riskData: any): Promise<ApiResponse<{ message: string; risk: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/risks`, {
      method: 'POST',
      body: JSON.stringify(riskData),
    });
  }

  async updateRisk(projectId: string, riskId: string, riskData: any): Promise<ApiResponse<{ message: string; risk: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/risks/${riskId}`, {
      method: 'PUT',
      body: JSON.stringify(riskData),
    });
  }

  async deleteRisk(projectId: string, riskId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/risks/${riskId}`, {
      method: 'DELETE',
    });
  }

  // Task creation for milestones (workspace service)
  async createTaskForMilestone(projectId: string, taskData: any): Promise<ApiResponse<{ message: string; task: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }
}

export const apiClient = new ApiClient();
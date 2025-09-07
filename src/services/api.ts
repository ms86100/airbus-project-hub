// Central API client for all microservices

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Environment-agnostic API configuration
    // Set VITE_API_URL=http://localhost:3001 for local backend
    // Leave empty or set to Supabase URL for cloud backend
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (apiUrl && apiUrl.trim() !== '') {
      // Local backend - use direct routes without service prefixes
      this.baseUrl = apiUrl;
      this.isLocalBackend = true;
      console.log('✅ Using LOCAL backend:', this.baseUrl);
    } else {
      // Force local backend for now - do not use Supabase
      this.baseUrl = 'http://localhost:3001';
      this.isLocalBackend = true;
      console.log('🔧 FORCING LOCAL backend:', this.baseUrl);
    }
  }

  private isLocalBackend: boolean;

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

  private getLocalEndpoint(endpoint: string): string {
    // No path mapping needed; we choose the correct endpoint earlier
    return endpoint;
  }

  // Helper: choose correct endpoint based on environment
  private resolveEndpoint(serviceEndpoint: string, localEndpoint: string): string {
    return this.isLocalBackend ? localEndpoint : serviceEndpoint;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();

    const doFetch = async (authToken?: string) => {
      const actualEndpoint = this.getLocalEndpoint(endpoint);
      
      // FORCE localhost for ALL requests - NO SUPABASE
      const baseUrl = 'http://localhost:3001';
      
      console.log(`🌐 FORCED API BASE URL: ${baseUrl}`);
      console.log(`🌐 IS LOCAL: ${this.isLocalBackend}`);
      console.log(`🌐 ENDPOINT: ${endpoint} -> ${actualEndpoint}`);
      
      const headers = {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaXZvZXhmcHZxb2hzdnBzemlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjgyOTgsImV4cCI6MjA3MTgwNDI5OH0.TfV3FF9FNYXVv_f5TTgne4-CrDWmN1xOed2ZIjzn96Q',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...options.headers,
      } as Record<string, string>;

      const response = await fetch(`${baseUrl}${actualEndpoint}`, {
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
      const actualEndpoint = this.getLocalEndpoint(endpoint);
      console.log(`🌐 Making request to: ${actualEndpoint} (from ${endpoint})`);
      console.log(`🔐 Using token: ${token ? `${token.substring(0, 20)}...` : 'None'}`);

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

      console.log(`📡 Response from ${endpoint}:`, result);
      
      // Return the RAW response - don't sanitize errors
      if (!result || !result.success) {
        console.error(`❌ RAW SERVER ERROR:`, result);
      }
      
      return result ?? { success: false, error: 'Empty response', code: 'EMPTY_RESPONSE' };
    } catch (error) {
      console.error('API request failed:', error);
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
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaXZvZXhmcHZxb2hzdnBzemlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjgyOTgsImV4cCI6MjA3MTgwNDI5OH0.TfV3FF9FNYXVv_f5TTgne4-CrDWmN1xOed2ZIjzn96Q',
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
    teamId?: string;
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

  // Retrospectives Service Methods (retro-service)
  async getRetrospectivesLegacy(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'GET' });
  }

  async createRetrospectiveLegacy(projectId: string, data: { framework?: string; iterationId?: string; columns?: { title: string; subtitle?: string }[] }): Promise<ApiResponse<{ message: string; retrospective: any }>> {
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

  async updateStakeholder(projectId: string, stakeholderId: string, data: { name?: string; email?: string; department?: string; raci?: string; influence_level?: string; notes?: string; }): Promise<ApiResponse<{ message: string; stakeholder: any }>> {
    return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders/${stakeholderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStakeholder(projectId: string, stakeholderId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders/${stakeholderId}`, {
      method: 'DELETE',
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
  async getDepartmentsLegacy(): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/department-service/departments`, { method: 'GET' });
  }

  async createDepartment(name: string): Promise<ApiResponse<{ message: string; department: any }>> {
    return this.makeRequest(`/department-service/departments`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteDepartment(departmentId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/department-service/departments/${departmentId}`, {
      method: 'DELETE'
    });
  }

  // User Service Methods
  async getUserRole(userId: string): Promise<ApiResponse<{ role: string | null }>> {
    return this.makeRequest(`/users/${userId}/role`, { method: 'GET' });
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

  // Dashboard & User Methods
  async getUserProfile(userId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/auth-service/users/${userId}/profile`, { method: 'GET' });
  }


  async getProjectStats(): Promise<ApiResponse<{ totalProjects: number; activeProjects: number; completedProjects: number; totalUsers: number }>> {
    return this.makeRequest(`/projects-service/stats`, { method: 'GET' });
  }

  // Discussion Methods (workspace service)
  async getDiscussions(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/discussions`, { method: 'GET' });
  }

  async createDiscussion(projectId: string, discussionData: any): Promise<ApiResponse<{ message: string; discussion: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/discussions`, {
      method: 'POST',
      body: JSON.stringify(discussionData),
    });
  }

  async updateDiscussion(projectId: string, discussionId: string, discussionData: any): Promise<ApiResponse<{ message: string; discussion: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/discussions/${discussionId}`, {
      method: 'PUT',
      body: JSON.stringify(discussionData),
    });
  }

  async deleteDiscussion(projectId: string, discussionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/discussions/${discussionId}`, {
      method: 'DELETE',
    });
  }

  // Action Items Methods (workspace service)
  async getActionItems(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/action-items`, { method: 'GET' });
  }

  async createActionItem(projectId: string, actionItemData: any): Promise<ApiResponse<{ message: string; actionItem: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/action-items`, {
      method: 'POST',
      body: JSON.stringify(actionItemData),
    });
  }

  // Task Methods (workspace service)
  async getTasks(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/tasks`, { method: 'GET' });
  }

  async updateTask(taskId: string, data: any): Promise<ApiResponse<any>> {
    return this.makeRequest(`/workspace-service/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getTaskStatusHistoryLegacy(taskId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/tasks/${taskId}/history`);
  }

  // Milestones
  async getMilestones(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/milestones`);
  }

  // Profile management
  async getProfile(userId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/auth-service/profiles/${userId}`);
  }

  // Capacity Service Methods (extended)  
  async getCapacitySettings(projectId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/settings`, { method: 'GET' });
  }

  async getCapacityIterations(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/iterations`, { method: 'GET' });
  }

  async deleteCapacityIteration(projectId: string, iterationId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity/${iterationId}?type=iteration`, { method: 'DELETE' });
  }

  async updateCapacityIteration(projectId: string, iterationId: string, data: {
    type: 'iteration';
    iterationName: string;
    startDate: string;
    endDate: string;
    workingDays: number;
    committedStoryPoints?: number;
  }): Promise<ApiResponse<{ message: string; iteration: any }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity/${iterationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getCapacityMembers(projectId: string, iterationId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/iterations/${iterationId}/members`, { method: 'GET' });
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

  // Action Items Methods (workspace service) - extended
  async updateActionItem(projectId: string, actionItemId: string, actionItemData: any): Promise<ApiResponse<{ message: string; actionItem: any }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/action-items/${actionItemId}`, {
      method: 'PUT',
      body: JSON.stringify(actionItemData),
    });
  }

  async deleteActionItem(projectId: string, actionItemId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/action-items/${actionItemId}`, {
      method: 'DELETE',
    });
  }

  // Task creation for milestones (workspace service)
  async createTaskForMilestone(projectId: string, taskData: any): Promise<ApiResponse<{ message: string; task: any }>> {
    const payload = this.isLocalBackend
      ? {
          // Local Express backend expects camelCase keys
          title: taskData.title,
          description: taskData.description ?? null,
          status: taskData.status,
          priority: taskData.priority,
          dueDate: taskData.due_date ?? taskData.dueDate ?? null,
          ownerId: taskData.owner_id ?? taskData.ownerId ?? null,
          milestoneId: taskData.milestone_id ?? taskData.milestoneId ?? null,
        }
      : taskData;

    return this.makeRequest(`/workspace-service/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Capacity Data method  
  async getCapacityData(projectId: string): Promise<ApiResponse<{ projectId: string; iterations: any[]; members: any[]; }>> {
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, { method: 'GET' });
  }

  // Analytics Service
  async getProjectOverviewAnalytics(projectId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/analytics-service/projects/${projectId}/project-overview`, { method: 'GET' });
  }

  // Module access logging
  async logModuleAccess(data: {
    userId: string;
    projectId: string;
    module: string;
    accessType: string;
    accessLevel?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/access-service/log-access', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Retrospective Service Methods (retro-service)
  async getRetrospectives(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'GET' });
  }

  async createRetrospective(projectId: string, retroData: { framework: string; iterationName?: string }): Promise<ApiResponse<{ message: string; retrospective: any }>> {
    return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, {
      method: 'POST',
      body: JSON.stringify(retroData),
    });
  }

  async getRetrospectiveColumns(retrospectiveId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/columns`, { method: 'GET' });
  }

  async getRetrospectiveCards(retrospectiveId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/cards`, { method: 'GET' });
  }

  async createRetrospectiveCard(columnId: string, cardData: { text: string; card_order: number }): Promise<ApiResponse<{ message: string; card: any }>> {
    return this.makeRequest(`/retro-service/columns/${columnId}/cards`, {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  }

  async updateRetrospectiveCard(cardId: string, cardData: any): Promise<ApiResponse<{ message: string; card: any }>> {
    return this.makeRequest(`/retro-service/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(cardData),
    });
  }

  async deleteRetrospectiveCard(cardId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/retro-service/cards/${cardId}`, {
      method: 'DELETE',
    });
  }

  async voteCard(cardId: string): Promise<ApiResponse<{ message: string; vote: any }>> {
    return this.makeRequest(`/retro-service/cards/${cardId}/vote`, {
      method: 'POST',
    });
  }

  async unvoteCard(cardId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/retro-service/cards/${cardId}/unvote`, {
      method: 'DELETE',
    });
  }

  // Project Members Methods
  async getProjectMembers(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/members`, { method: 'GET' });
  }

  // Change Log Methods
  async getChangeLog(projectId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/workspace-service/projects/${projectId}/change-log`, { method: 'GET' });
  }

  // Alias methods for component compatibility
  async voteOnRetrospectiveCard(cardId: string): Promise<ApiResponse<{ message: string }>> {
    return this.voteCard(cardId);
  }

  async moveRetrospectiveCard(cardId: string, newColumnId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/retro-service/cards/${cardId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ column_id: newColumnId }),
    });
  }

  async getRetrospectiveActionItems(retrospectiveId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/action-items`, { method: 'GET' });
  }

  async createRetrospectiveActionItem(retrospectiveId: string, actionItemData: any): Promise<ApiResponse<{ message: string; actionItem: any }>> {
    return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/action-items`, {
      method: 'POST',
      body: JSON.stringify(actionItemData),
    });
  }

  async deleteRetrospective(retrospectiveId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/retro-service/${retrospectiveId}`, {
      method: 'DELETE',
    });
  }

  async updateRetrospectiveActionItem(actionItemId: string, actionItemData: any): Promise<ApiResponse<{ message: string; actionItem: any }>> {
    return this.makeRequest(`/retro-service/action-items/${actionItemId}`, {
      method: 'PUT',
      body: JSON.stringify(actionItemData),
    });
  }

  async deleteRetrospectiveActionItem(actionItemId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/retro-service/action-items/${actionItemId}`, {
      method: 'DELETE',
    });
  }

  // Wizard service methods
  async createProjectWizard(projectData: {
    projectName: string;
    objective: string;
    startDate: string;
    endDate: string;
    tasks: any[];
    milestones: any[];
    inviteEmails: string[];
  }): Promise<ApiResponse<{ project: any; message: string }>> {
    // Send both `name` and `projectName` for compatibility with local backend and edge functions
    const payload = {
      name: projectData.projectName,
      projectName: projectData.projectName,
      objective: projectData.objective,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      tasks: projectData.tasks,
      milestones: (projectData.milestones || []).map((m: any) => ({
        ...m,
        // Provide both dueDate (edge functions) and due_date (local backend)
        due_date: m.dueDate ?? m.due_date,
      })),
      inviteEmails: projectData.inviteEmails,
    };

    return this.makeRequest('/wizard-service/projects/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ========================
  // Team Management
  // ========================

  async getTeams(projectId: string): Promise<ApiResponse> {
    const ep = this.resolveEndpoint(
      `/capacity-service/projects/${projectId}/teams`,
      `/projects/${projectId}/teams`
    );
    return this.makeRequest(ep, { method: 'GET' });
  }

  async createTeam(projectId: string, teamData: any): Promise<ApiResponse> {
    const ep = this.resolveEndpoint(
      `/capacity-service/projects/${projectId}/teams`,
      `/projects/${projectId}/teams`
    );
    return this.makeRequest(ep, {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(teamId: string, teamData: any): Promise<ApiResponse> {
    return this.makeRequest(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(teamId: string): Promise<ApiResponse> {
    return this.makeRequest(`/teams/${teamId}`, { method: 'DELETE' });
  }

  async getTeamMembers(teamId: string): Promise<ApiResponse> {
    const ep = this.resolveEndpoint(
      `/capacity-service/teams/${teamId}/members`,
      `/teams/${teamId}/members`
    );
    return this.makeRequest(ep, { method: 'GET' });
  }

  async createTeamMember(teamId: string, memberData: any): Promise<ApiResponse> {
    const ep = this.resolveEndpoint(
      `/capacity-service/teams/${teamId}/members`,
      `/teams/${teamId}/members`
    );
    return this.makeRequest(ep, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateTeamMember(memberId: string, memberData: any): Promise<ApiResponse> {
    return this.makeRequest(`/team-members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteTeamMember(memberId: string): Promise<ApiResponse> {
    return this.makeRequest(`/team-members/${memberId}`, { method: 'DELETE' });
  }

  // Department service methods
  async getDepartments(): Promise<ApiResponse<{ departments: any[] }>> {
    return this.makeRequest('/department-service/departments', { method: 'GET' });
  }

  async assignUserDepartment(userId: string, departmentId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/auth-service/profiles/${userId}/department`, {
      method: 'PUT',
      body: JSON.stringify({ department_id: departmentId }),
    });
  }

  // Task status history and user profiles
  async getTaskStatusHistory(taskId: string): Promise<ApiResponse<{ history: any[] }>> {
    return this.makeRequest(`/workspace-service/tasks/${taskId}/status-history`, { method: 'GET' });
  }

  async deleteTask(taskId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/workspace-service/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async getUserProfiles(userIds: string[]): Promise<ApiResponse<{ profiles: any[] }>> {
    return this.makeRequest('/auth-service/profiles/batch', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    });
  }

  async moveTask(taskId: string, milestoneId: string | null): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/workspace-service/tasks/${taskId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ milestone_id: milestoneId }),
    });
  }

  // Team Capacity API methods
  async getIterations(projectId: string): Promise<ApiResponse<any[]>> {
    const ep = this.resolveEndpoint(
      `/capacity-service/projects/${projectId}/iterations`,
      `/capacity-service/projects/${projectId}/capacity`
    );
    console.log('🔍 Getting iterations from endpoint:', ep);
    const res = await this.makeRequest<any>(ep, { method: 'GET' });
    console.log('🔍 Raw iterations response:', res);
    if (!res.success) return res as any;
    
    // Local backend returns an object; prefer 'iterations' array if present
    const data = Array.isArray((res as any).data?.iterations)
      ? (res as any).data.iterations
      : ((res as any).data || []);
    console.log('🔍 Processed iterations data:', data);
    return { success: true, data } as ApiResponse<any[]>;
  }

  async createIteration(projectId: string, iterationData: any): Promise<ApiResponse<any>> {
    console.log('🔄 Creating iteration with data:', iterationData);
    
    // The backend expects these EXACT field names (see capacity.js line 77)
    const payload = {
      type: 'iteration',
      iterationName: iterationData.name,        // backend expects 'iterationName' not 'name'
      startDate: iterationData.start_date,      // backend expects 'startDate' not 'start_date' 
      endDate: iterationData.end_date,          // backend expects 'endDate' not 'end_date'
      workingDays: iterationData.weeks_count * 5,   // Convert weeks to working days (5 days per week)
      committedStoryPoints: 0,
      teamId: iterationData.team_id  // backend expects 'teamId' not 'team_id'
    };

    console.log('🔄 Sending payload to backend:', payload);
    
    return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteIteration(iterationId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/capacity-service/capacity/${iterationId}?type=iteration`, {
      method: 'DELETE'
    });
  }

  async getIterationDetails(iterationId: string): Promise<ApiResponse<any>> {
    if (this.isLocalBackend) {
      // Not supported on local backend; return basic structure
      return { success: true, data: null } as ApiResponse<any>;
    }
    return this.makeRequest(`/capacity-service/iterations/${iterationId}`, { method: 'GET' });
  }

  async getWeeklyAvailability(iterationId: string): Promise<ApiResponse<any[]>> {
    // If iterationId is not a UUID (e.g., temp/team identifiers), avoid calling backend
    if (!/^[0-9a-fA-F-]{36}$/.test(iterationId)) {
      return { success: true, data: [] } as ApiResponse<any[]>;
    }
    const ep = this.resolveEndpoint(
      `/capacity-service/iterations/${iterationId}/availability`,
      `/capacity-service/iterations/${iterationId}/availability`
    );
    return this.makeRequest(ep, { method: 'GET' });
  }

  async saveWeeklyAvailability(iterationId: string, availabilityData: any[]): Promise<ApiResponse<any>> {
    const ep = this.resolveEndpoint(
      `/capacity-service/iterations/${iterationId}/availability`,
      `/capacity-service/iterations/${iterationId}/availability`
    );
    return this.makeRequest(ep, {
      method: 'POST',
      body: JSON.stringify({ availability: availabilityData }),
    });
  }

  async getDailyAttendance(availabilityId: string): Promise<ApiResponse<any[]>> {
    const ep = this.resolveEndpoint(
      `/capacity-service/availability/${availabilityId}/daily`,
      `/capacity-service/availability/${availabilityId}/daily`
    );
    return this.makeRequest(ep, { method: 'GET' });
  }

  async saveDailyAttendance(memberId: string, weekId: string, attendanceData: any[]): Promise<ApiResponse<any>> {
    const ep = this.resolveEndpoint(
      `/capacity-service/members/${memberId}/weeks/${weekId}/attendance`,
      `/capacity-service/members/${memberId}/weeks/${weekId}/attendance`
    );
    return this.makeRequest(ep, {
      method: 'POST',
      body: JSON.stringify({ attendance: attendanceData }),
    });
  }

  async getIterationAnalytics(iterationId: string): Promise<ApiResponse<any>> {
    const ep = this.resolveEndpoint(
      `/capacity-service/iterations/${iterationId}/analytics`,
      `/capacity-service/iterations/${iterationId}/analytics`
    );
    return this.makeRequest(ep, { method: 'GET' });
  }
}

export const apiClient = new ApiClient();
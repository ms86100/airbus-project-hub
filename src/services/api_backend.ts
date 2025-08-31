// Local API client pointing to http://localhost:8080
// Swap your imports to use this client when running a local Node backend
// import { apiClient } from '@/services/api_backend'

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:8080';
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const storedAuth = localStorage.getItem('auth_session') || localStorage.getItem('app_session');
      if (storedAuth) {
        try {
          const session = JSON.parse(storedAuth);
          const token = session?.access_token || session?.token || session?.accessToken;
          if (token) return token;
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    } as Record<string, string>;

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
      const data = await res.json().catch(() => null);
      return (data as any) ?? { success: false, error: 'Empty response', code: 'EMPTY_RESPONSE' };
    } catch (e) {
      return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
    }
  }

  // Auth
  login(email: string, password: string) { return this.makeRequest('/auth-service/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  register(email: string, password: string, fullName?: string) { return this.makeRequest('/auth-service/register', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }); }
  logout() { return this.makeRequest('/auth-service/logout', { method: 'POST' }); }
  getCurrentUser() { return this.makeRequest('/auth-service/user', { method: 'GET' }); }
  refreshSession(refreshToken: string) { return this.makeRequest('/auth-service/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }); }
  getCurrentSession() { return this.makeRequest('/auth-service/session', { method: 'GET' }); }

  // Projects
  getProjects() { return this.makeRequest('/projects-service/projects', { method: 'GET' }); }
  createProject(projectData: any) { return this.makeRequest('/projects-service/projects', { method: 'POST', body: JSON.stringify(projectData) }); }
  getProject(id: string) { return this.makeRequest(`/projects-service/projects/${id}`, { method: 'GET' }); }
  updateProject(id: string, projectData: any) { return this.makeRequest(`/projects-service/projects/${id}`, { method: 'PUT', body: JSON.stringify(projectData) }); }
  deleteProject(id: string) { return this.makeRequest(`/projects-service/projects/${id}`, { method: 'DELETE' }); }

  // Access Control
  getProjectAccess(projectId: string) { return this.makeRequest(`/access-service/projects/${projectId}/access`, { method: 'GET' }); }
  updateModulePermission(projectId: string, userId: string, data: any) { return this.makeRequest(`/access-service/projects/${projectId}/access/${userId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  getAllPermissions() { return this.makeRequest('/access-service/permissions', { method: 'GET' }); }

  // Capacity
  getProjectCapacity(projectId: string) { return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, { method: 'GET' }); }
  createCapacityIteration(projectId: string, data: any) { return this.makeRequest(`/capacity-service/projects/${projectId}/capacity`, { method: 'POST', body: JSON.stringify(data) }); }
  updateCapacityItem(projectId: string, itemId: string, data: any) { return this.makeRequest(`/capacity-service/projects/${projectId}/capacity/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteCapacityItem(projectId: string, itemId: string, type: 'iteration' | 'member') { return this.makeRequest(`/capacity-service/projects/${projectId}/capacity/${itemId}?type=${type}`, { method: 'DELETE' }); }
  getCapacityStats() { return this.makeRequest('/capacity-service/stats', { method: 'GET' }); }

  // Retro
  getRetrospectivesLegacy(projectId: string) { return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'GET' }); }
  createRetrospectiveLegacy(projectId: string, data: any) { return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'POST', body: JSON.stringify(data) }); }
  addRetrospectiveAction(retrospectiveId: string, data: any) { return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/actions`, { method: 'POST', body: JSON.stringify(data) }); }
  getRetrospectiveStats() { return this.makeRequest('/retro-service/stats', { method: 'GET' }); }

  // Roadmap
  getRoadmap(projectId: string) { return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap`, { method: 'GET' }); }
  createMilestone(projectId: string, data: any) { return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap`, { method: 'POST', body: JSON.stringify(data) }); }
  updateMilestone(projectId: string, milestoneId: string, data: any) { return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap/${milestoneId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteMilestone(projectId: string, milestoneId: string) { return this.makeRequest(`/roadmap-service/projects/${projectId}/roadmap/${milestoneId}`, { method: 'DELETE' }); }

  // Backlog
  getBacklog(projectId: string) { return this.makeRequest(`/backlog-service/projects/${projectId}/backlog`, { method: 'GET' }); }
  createBacklogItem(projectId: string, data: any) { return this.makeRequest(`/backlog-service/projects/${projectId}/backlog`, { method: 'POST', body: JSON.stringify(data) }); }
  updateBacklogItem(projectId: string, itemId: string, data: any) { return this.makeRequest(`/backlog-service/projects/${projectId}/backlog/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteBacklogItem(projectId: string, itemId: string) { return this.makeRequest(`/backlog-service/projects/${projectId}/backlog/${itemId}`, { method: 'DELETE' }); }
  moveBacklogToMilestone(projectId: string, backlogItemId: string, milestoneId: string) { return this.makeRequest(`/backlog-service/projects/${projectId}/backlog/${backlogItemId}/move`, { method: 'POST', body: JSON.stringify({ milestoneId }) }); }

  // Stakeholders
  getStakeholders(projectId: string) { return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders`, { method: 'GET' }); }
  createStakeholder(projectId: string, data: any) { return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders`, { method: 'POST', body: JSON.stringify(data) }); }
  updateStakeholder(projectId: string, stakeholderId: string, data: any) { return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders/${stakeholderId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteStakeholder(projectId: string, stakeholderId: string) { return this.makeRequest(`/stakeholder-service/projects/${projectId}/stakeholders/${stakeholderId}`, { method: 'DELETE' }); }

  // Audit
  getProjectHistory(projectId: string) { return this.makeRequest(`/audit-service/projects/${projectId}/history`, { method: 'GET' }); }
  writeAuditLog(data: any) { return this.makeRequest(`/audit-service/audit/log`, { method: 'POST', body: JSON.stringify(data) }); }

  // Workspace
  getWorkspace(projectId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/workspace`, { method: 'GET' }); }

  // Wizard
  startWizard(seed: any) { return this.makeRequest(`/wizard-service/projects/wizard/start`, { method: 'POST', body: JSON.stringify(seed || {}) }); }
  completeWizard(payload: any) { return this.makeRequest(`/wizard-service/projects/wizard/complete`, { method: 'POST', body: JSON.stringify(payload) }); }

  // Departments
  getDepartmentsLegacy() { return this.makeRequest(`/department-service/departments`, { method: 'GET' }); }
  createDepartment(name: string) { return this.makeRequest(`/department-service/departments`, { method: 'POST', body: JSON.stringify({ name }) }); }
  deleteDepartment(departmentId: string) { return this.makeRequest(`/department-service/departments/${departmentId}`, { method: 'DELETE' }); }
  assignUserDepartment(userId: string, departmentId: string) { return this.makeRequest(`/auth-service/assign-department`, { method: 'POST', body: JSON.stringify({ userId, departmentId }) }); }

  // User/Profile helpers
  getUserProfile(userId: string) { return this.makeRequest(`/auth-service/users/${userId}/profile`, { method: 'GET' }); }
  getUserRole(userId: string) { return this.makeRequest(`/auth-service/users/${userId}/role`, { method: 'GET' }); }

  // Wizard methods
  createProjectWizard(projectData: any) { return this.makeRequest(`/wizard-service/projects/wizard/complete`, { method: 'POST', body: JSON.stringify(projectData) }); }

  // Module permissions (consolidated)
  getModulePermissions(projectId: string) { return this.makeRequest(`/access-service/projects/${projectId}/access`, { method: 'GET' }); }
}

export const apiClient = new ApiClient();

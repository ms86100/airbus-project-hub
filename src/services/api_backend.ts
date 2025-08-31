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

  // Module permissions (consolidated)
  getModulePermissions(projectId: string) { return this.makeRequest(`/access-service/projects/${projectId}/access`, { method: 'GET' }); }
  grantModulePermission(data: any) { return this.makeRequest('/access-service/permissions', { method: 'POST', body: JSON.stringify(data) }); }
  revokeModulePermission(permissionId: string) { return this.makeRequest(`/access-service/permissions/${permissionId}`, { method: 'DELETE' }); }
  
  // User and Profile Management
  getUserProfile(userId: string) { return this.makeRequest(`/auth-service/user/${userId}/profile`, { method: 'GET' }); }
  getUserRole(userId: string) { return this.makeRequest(`/auth-service/user/${userId}/role`, { method: 'GET' }); }
  getProjectStats() { return this.makeRequest('/projects-service/stats', { method: 'GET' }); }
  
  // Task Management
  getTasks(projectId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/tasks`, { method: 'GET' }); }
  createTask(projectId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }); }
  updateTask(taskId: string, data: any) { return this.makeRequest(`/workspace-service/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteTask(taskId: string) { return this.makeRequest(`/workspace-service/tasks/${taskId}`, { method: 'DELETE' }); }
  createTaskForMilestone(projectId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }); }
  getTaskStatusHistory(taskId: string) { return this.makeRequest(`/workspace-service/tasks/${taskId}/history`, { method: 'GET' }); }
  
  // Milestone Management
  getMilestones(projectId: string) { return this.makeRequest(`/roadmap-service/projects/${projectId}/milestones`, { method: 'GET' }); }
  
  // Retrospective Management (Enhanced)
  getRetrospectives(projectId: string) { return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'GET' }); }
  createRetrospective(projectId: string, data: any) { return this.makeRequest(`/retro-service/projects/${projectId}/retrospectives`, { method: 'POST', body: JSON.stringify(data) }); }
  updateRetrospectiveCard(cardId: string, data: any) { return this.makeRequest(`/retro-service/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  createRetrospectiveCard(columnId: string, data: any) { return this.makeRequest(`/retro-service/columns/${columnId}/cards`, { method: 'POST', body: JSON.stringify(data) }); }
  voteOnRetrospectiveCard(cardId: string) { return this.makeRequest(`/retro-service/cards/${cardId}/vote`, { method: 'POST' }); }
  deleteRetrospectiveCard(cardId: string) { return this.makeRequest(`/retro-service/cards/${cardId}`, { method: 'DELETE' }); }
  moveRetrospectiveCard(cardId: string, newColumnId: string) { return this.makeRequest(`/retro-service/cards/${cardId}/move`, { method: 'POST', body: JSON.stringify({ columnId: newColumnId }) }); }
  createRetrospectiveActionItem(retrospectiveId: string, data: any) { return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}/actions`, { method: 'POST', body: JSON.stringify(data) }); }
  updateRetrospectiveActionItem(actionId: string, data: any) { return this.makeRequest(`/retro-service/actions/${actionId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  
  // Discussion and Action Item Management
  getDiscussions(projectId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/discussions`, { method: 'GET' }); }
  createDiscussion(projectId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/discussions`, { method: 'POST', body: JSON.stringify(data) }); }
  updateDiscussion(projectId: string, discussionId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/discussions/${discussionId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteDiscussion(projectId: string, discussionId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/discussions/${discussionId}`, { method: 'DELETE' }); }
  getActionItems(projectId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/action-items`, { method: 'GET' }); }
  createActionItem(projectId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/action-items`, { method: 'POST', body: JSON.stringify(data) }); }
  updateActionItem(projectId: string, actionItemId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/action-items/${actionItemId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteActionItem(projectId: string, actionItemId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/action-items/${actionItemId}`, { method: 'DELETE' }); }
  
  // Audit Management
  getAuditLog(projectId: string) { return this.makeRequest(`/audit-service/projects/${projectId}/audit`, { method: 'GET' }); }
  logModuleAccess(data: any) { return this.makeRequest('/audit-service/access/log', { method: 'POST', body: JSON.stringify(data) }); }
  
  // Department Management (Enhanced)
  getDepartments() { return this.makeRequest('/department-service/departments', { method: 'GET' }); }
  assignUserDepartment(userId: string, departmentId: string) { return this.makeRequest(`/department-service/users/${userId}/department`, { method: 'PUT', body: JSON.stringify({ departmentId }) }); }
  
  // Project Wizard
  createProjectWizard(data: any) { return this.makeRequest('/wizard-service/projects/wizard', { method: 'POST', body: JSON.stringify(data) }); }
  
  // Risk Management
  getRisks(projectId: string) { return this.makeRequest(`/workspace-service/projects/${projectId}/risks`, { method: 'GET' }); }
  createRisk(projectId: string, data: any) { return this.makeRequest(`/workspace-service/projects/${projectId}/risks`, { method: 'POST', body: JSON.stringify(data) }); }
  updateRisk(riskId: string, data: any) { return this.makeRequest(`/workspace-service/risks/${riskId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteRisk(riskId: string) { return this.makeRequest(`/workspace-service/risks/${riskId}`, { method: 'DELETE' }); }
  
  // Capacity Management (Enhanced)
  getCapacitySettings(projectId: string) { return this.makeRequest(`/capacity-service/projects/${projectId}/settings`, { method: 'GET' }); }
  getCapacityIterations(projectId: string) { return this.makeRequest(`/capacity-service/projects/${projectId}/iterations`, { method: 'GET' }); }
  updateCapacityIteration(projectId: string, iterationId: string, data: any) { return this.makeRequest(`/capacity-service/projects/${projectId}/iterations/${iterationId}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteCapacityIteration(projectId: string, iterationId: string) { return this.makeRequest(`/capacity-service/projects/${projectId}/iterations/${iterationId}`, { method: 'DELETE' }); }
  
  // Additional User Management
  getUserProfiles(userIds: string[]) { return this.makeRequest('/auth-service/users/profiles', { method: 'POST', body: JSON.stringify({ userIds }) }); }
  getProfile(userId: string) { return this.makeRequest(`/auth-service/users/${userId}/profile`, { method: 'GET' }); }
  
  // Task Movement and Operations
  moveTask(taskId: string, newStatus: string) { return this.makeRequest(`/workspace-service/tasks/${taskId}/move`, { method: 'POST', body: JSON.stringify({ status: newStatus }) }); }
  
  // Retrospective Management (More methods)
  deleteRetrospective(retrospectiveId: string) { return this.makeRequest(`/retro-service/retrospectives/${retrospectiveId}`, { method: 'DELETE' }); }
}

export const apiClient = new ApiClient();

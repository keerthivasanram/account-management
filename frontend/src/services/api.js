import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests and attach session token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept response errors to handle 401s
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: clear token if invalid
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth & Employee Identity
  auth: {
    getMe: () => apiClient.get('/auth/me'),
    devLogin: (credentials) => apiClient.post('/auth/dev-login', credentials),
  },

  // Multi-Factor Authentication & Trusted Device Verification
  mfa: {
    requestChallenge: (email) => apiClient.post('/auth/mfa/challenge', { email }),
    verifyChallenge: (data) => apiClient.post('/auth/mfa/verify', data),
  },

  employees: {
    getMyProfile: () => apiClient.get('/employees/me'),
    getMyAccounts: (params) => apiClient.get('/employees/me/accounts', { params }),
    getMyDashboardStats: () => apiClient.get('/employees/me/stats'),
  },

  // Instagram Accounts
  accounts: {
    register: (data) => apiClient.post('/accounts', data),
    checkDuplicate: (username) => apiClient.post('/accounts/check-duplicate', { username }),
    list: (params) => apiClient.get('/accounts', { params }),
    getById: (id) => apiClient.get(`/accounts/${id}`),
    update: (id, data) => apiClient.patch(`/accounts/${id}`, data),
    getStatus: (id) => apiClient.get(`/accounts/${id}/status`),
  },

  // Meta OAuth Integrations
  integrations: {
    getAuthorizeUrl: (accountId) => apiClient.get('/integrations/instagram/authorize', { params: { account_id: accountId } }),
    callback: (code, state) => apiClient.get('/integrations/instagram/callback', { params: { code, state } }),
    disconnect: (accountId) => apiClient.post('/integrations/instagram/disconnect', { account_id: accountId }),
    validate: (accountId) => apiClient.post('/integrations/instagram/validate', { account_id: accountId }),
  },

  // Task Delegation & Workflows
  tasks: {
    list: (params) => apiClient.get('/tasks', { params }),
    getById: (id) => apiClient.get(`/tasks/${id}`),
    create: (data) => apiClient.post('/tasks', data),
    start: (id) => apiClient.post(`/tasks/${id}/start`),
    submit: (id, data) => apiClient.post(`/tasks/${id}/submit`, data),
    approve: (id, data) => apiClient.post(`/tasks/${id}/approve`, data),
    requestChanges: (id, data) => apiClient.post(`/tasks/${id}/request-changes`, data),
  },

  // Project Management
  projects: {
    list: (params) => apiClient.get('/projects', { params }),
    getById: (id) => apiClient.get(`/projects/${id}`),
    create: (data) => apiClient.post('/projects', data),
    update: (id, data) => apiClient.patch(`/projects/${id}`, data),
  },

  // Departments & Workforce Structure
  departments: {
    list: () => apiClient.get('/departments'),
    getById: (id) => apiClient.get(`/departments/${id}`),
    create: (data) => apiClient.post('/departments', data),
    update: (id, data) => apiClient.patch(`/departments/${id}`, data),
  },

  // Company-Managed Internal Messaging
  chat: {
    listConversations: () => apiClient.get('/chat/conversations'),
    createConversation: (data) => apiClient.post('/chat/conversations', data),
    getMessages: (conversationId) => apiClient.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId, content) => apiClient.post(`/chat/conversations/${conversationId}/messages`, { content }),
  },

  // Attendance & Leave Management
  attendance: {
    getSummary: () => apiClient.get('/attendance/summary'),
    checkIn: () => apiClient.post('/attendance/check-in'),
    checkOut: () => apiClient.post('/attendance/check-out'),
    getHistory: () => apiClient.get('/attendance/history'),
    requestLeave: (data) => apiClient.post('/attendance/leaves', data),
    listLeaves: () => apiClient.get('/attendance/leaves'),
    reviewLeave: (id, data) => apiClient.patch(`/attendance/leaves/${id}/review`, data),
  },

  // MFA & Unique Login Verification
  mfa: {
    requestChallenge: (email) => apiClient.post('/auth/mfa/challenge', { email }),
    verifyChallenge: (data) => apiClient.post('/auth/mfa/verify', data),
  },

  // Secure Document Management
  documents: {
    list: () => apiClient.get('/documents'),
    create: (data) => apiClient.post('/documents', data),
    getById: (id) => apiClient.get(`/documents/${id}`),
    download: (id) => apiClient.post(`/documents/${id}/download`),
    delete: (id) => apiClient.delete(`/documents/${id}`),
  },

  // Social Media Management & Scheduled Publishing
  socialPosts: {
    list: (params) => apiClient.get('/social/posts', { params }),
    create: (data) => apiClient.post('/social/posts', data),
    review: (id, data) => apiClient.patch(`/social/posts/${id}/review`, data),
    publishNow: (id) => apiClient.post(`/social/posts/${id}/publish-now`),
  },

  // In-App Notifications
  notifications: {
    list: (params) => apiClient.get('/notifications', { params }),
    markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
    markAllRead: () => apiClient.post('/notifications/read-all'),
  },

  // Enterprise Security & Anti-Leak Shield
  security: {
    reportIncident: (data) => apiClient.post('/security/incidents', data),
    listIncidents: () => apiClient.get('/security/incidents'),
    updateIncidentStatus: (id, status) => apiClient.patch(`/security/incidents/${id}/status`, { status }),
    getSummary: () => apiClient.get('/security/summary'),
    registerDevice: (data) => apiClient.post('/security/devices/register', data),
    listDevices: () => apiClient.get('/security/devices'),
    revokeDevice: (id) => apiClient.post(`/security/devices/${id}/revoke`),
  },

  // Admin Operations
  admin: {
    getStats: () => apiClient.get('/admin/stats'),
    listEmployees: () => apiClient.get('/admin/employees'),
    getEmployee: (id) => apiClient.get(`/admin/employees/${id}`),
    getEmployeeAccounts: (id, params) => apiClient.get(`/admin/employees/${id}/accounts`, { params }),
    updateEmployee: (id, data) => apiClient.patch(`/admin/employees/${id}`, data),
    listAccounts: (params) => apiClient.get('/admin/accounts', { params }),
    reviewAccount: (id, data) => apiClient.patch(`/admin/accounts/${id}/approval`, data),
    assignAccount: (id, employeeId) => apiClient.post(`/admin/accounts/${id}/assign`, { employee_id: employeeId }),
    
    // Clients & Campaigns
    listClients: () => apiClient.get('/admin/clients'),
    createClient: (data) => apiClient.post('/admin/clients', data),
    listCampaigns: (clientId) => apiClient.get('/admin/campaigns', { params: { client_id: clientId } }),
    createCampaign: (data) => apiClient.post('/admin/campaigns', data),

    // Audit Logs
    listAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params }),
  },
};

export default apiClient;

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

  // Admin Operations
  admin: {
    getStats: () => apiClient.get('/admin/stats'),
    listEmployees: () => apiClient.get('/admin/employees'),
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

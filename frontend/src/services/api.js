// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function for API calls
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  try {
    const response = await fetch(url, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      } else if (response.status === 403) {
        // Forbidden
        throw new Error('Access denied. You do not have permission.');
      } else if (response.status === 429) {
        // Rate limit
        throw new Error('Too many requests. Please try again later.');
      } else {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Chat API
export const sendMessage = async (message, conversationId = null) => {
  try {
    const response = await apiRequest('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      })
    });
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Conversations API
export const getConversations = async () => {
  try {
    const response = await apiRequest('/conversations');
    return response.conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

export const getConversation = async (conversationId) => {
  try {
    const response = await apiRequest(`/conversations/${conversationId}`);
    return response.messages || [];
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    await apiRequest(`/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

// Support Tickets API
export const getSupportTickets = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await apiRequest(`/support/tickets?${params}`);
    return response.tickets || [];
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    throw error;
  }
};

export const createSupportTicket = async (ticketData) => {
  try {
    const response = await apiRequest('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
    return response;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
};

export const updateSupportTicket = async (ticketId, updates) => {
  try {
    const response = await apiRequest(`/support/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return response;
  } catch (error) {
    console.error('Error updating support ticket:', error);
    throw error;
  }
};

export const deleteSupportTicket = async (ticketId) => {
  try {
    await apiRequest(`/support/tickets/${ticketId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    throw error;
  }
};

// Documents API
export const uploadDocument = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const getDocuments = async () => {
  try {
    const response = await apiRequest('/documents');
    return response.documents || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

// Analytics API
export const getAnalytics = async (period = '7d') => {
  try {
    const response = await apiRequest(`/analytics?period=${period}`);
    return response;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

// System API
export const getSystemStats = async () => {
  try {
    const response = await apiRequest('/system/stats');
    return response;
  } catch (error) {
    console.error('Error fetching system stats:', error);
    throw error;
  }
};

export const updateSystemSettings = async (settings) => {
  try {
    const response = await apiRequest('/system/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
    return response;
  } catch (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
};

// Auth API
export const login = async (email, password) => {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      localStorage.setItem('token', response.token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Export all functions
export default {
  // Chat
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  
  // Support Tickets
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  
  // Documents
  uploadDocument,
  getDocuments,
  
  // Analytics
  getAnalytics,
  
  // System
  getSystemStats,
  updateSystemSettings,
  
  // Auth
  login,
  register,
  logout,
  
  // Health
  checkHealth
};
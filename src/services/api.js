// API Configuration
// Using proxy configuration in package.json, so we can use relative URLs
const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'http://localhost:8000' : '';

// API Service Class
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to make HTTP requests with automatic token refresh
  async makeRequest(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401 && retryCount === 0) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          return this.makeRequest(endpoint, options, retryCount + 1);
        } else {
          // Refresh failed, redirect to login
          this.removeToken();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text, detail: text };
      }

      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      
      // If it's a network error or server unavailable
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      
      throw error;
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setToken(data.access_token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Authentication endpoints
  async login(credentials) {
    return this.makeRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
  }

  async register(userData) {
    return this.makeRequest('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
      }),
    });
  }

  async verifyOTP(email, otp) {
    return this.makeRequest('/auth/verify/', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        otp: otp,
      }),
    });
  }

  async logout() {
    return this.makeRequest('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }

  // User profile endpoints
  async getUserProfile() {
    return this.makeRequest('/auth/me/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }

  async updateUserProfile(userData) {
    return this.makeRequest('/auth/me/', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(userData),
    });
  }

  // File upload method
  async uploadFile(endpoint, formData, retryCount = 0) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'POST',
      body: formData,
      headers: {},
    };

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData - let browser set it with boundary
    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401 && retryCount === 0) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          return this.uploadFile(endpoint, formData, retryCount + 1);
        } else {
          // Refresh failed, redirect to login
          this.removeToken();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      if (!response.ok) {
        throw new Error(data.message || data.detail || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Upload request failed:', error);
      throw error;
    }
  }

  // Token management
  setToken(token) {
    localStorage.setItem('access_token', token);
  }

  setRefreshToken(token) {
    localStorage.setItem('refresh_token', token);
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  removeRefreshToken() {
    localStorage.removeItem('refresh_token');
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic token validation (you might want to add expiry check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  }

  // Practice session endpoints (for future use)
  async getPracticeSessions() {
    return this.makeRequest('/practice/sessions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }

  async createPracticeSession(sessionData) {
    return this.makeRequest('/practice/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(sessionData),
    });
  }

  // Analytics endpoints (for future use)
  async getAnalytics() {
    return this.makeRequest('/analytics/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

export default apiService;

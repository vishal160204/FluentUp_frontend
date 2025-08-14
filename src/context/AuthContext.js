import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on app load and setup automatic token refresh
  useEffect(() => {
    checkAuthStatus();
    
    // Set up automatic token refresh every 10 minutes
    const refreshInterval = setInterval(async () => {
      if (apiService.isAuthenticated()) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          console.log('Token refresh failed, logging out user');
          logout();
        }
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (apiService.isAuthenticated()) {
        const userProfile = await apiService.getUserProfile();
        const token = apiService.getToken();
        setUser({ ...userProfile, token });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      apiService.removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.login(credentials);
      
      // Store both access and refresh tokens
      apiService.setToken(response.access_token);
      apiService.setRefreshToken(response.refresh_token);
      
      // Get user profile
      const userProfile = await apiService.getUserProfile();
      setUser({ ...userProfile, token: response.access_token });
      
      return { success: true, user: userProfile };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.register(userData);
      
      // Registration successful - OTP sent to email
      // Don't auto-login, redirect to OTP verification
      return { 
        success: true, 
        requiresOTP: true, 
        message: response.message || 'Registration successful! Please check your email for OTP.',
        email: userData.email 
      };
    } catch (error) {
      const errorMessage = typeof error.message === 'string' ? error.message : 'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiService.removeToken();
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshed = await apiService.refreshAccessToken();
      if (refreshed) {
        // Update user with new token
        const newToken = apiService.getToken();
        setUser(prevUser => prevUser ? { ...prevUser, token: newToken } : null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedUser = await apiService.updateUserProfile(userData);
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.verifyOTP(email, otp);
      
      // OTP verification successful - email is now verified
      // Backend doesn't return token, just verification success
      return { 
        success: true, 
        message: response.message || 'Email verified successfully! You can now login.',
        verified: true 
      };
    } catch (error) {
      const errorMessage = typeof error.message === 'string' ? error.message : 'OTP verification failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    verifyOTP,
    logout,
    updateProfile,
    clearError,
    refreshToken,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

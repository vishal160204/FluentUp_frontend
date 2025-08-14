import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, loading, error, clearError } = useAuth();
  
  const [otp, setOTP] = useState('');
  const [otpError, setOTPError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Get email from navigation state
  const email = location.state?.email || '';

  useEffect(() => {
    // If no email provided, redirect to register
    if (!email) {
      navigate('/register');
      return;
    }

    // Start cooldown timer for resend
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [email, navigate, resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOTPError('');
    clearError();

    if (!otp || otp.length !== 6) {
      setOTPError('Please enter a valid 6-digit OTP');
      return;
    }

    const result = await verifyOTP(email, otp);

    if (result.success) {
      // Email verified successfully, redirect to login
      navigate('/login', { 
        state: { 
          message: result.message || 'Email verified successfully! Please login to continue.',
          email: email 
        } 
      });
    } else {
      setOTPError(result.error);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    try {
      // Call resend OTP API (you'll need to implement this)
      setResendCooldown(60); // 60 second cooldown
      // TODO: Implement resend OTP API call
      console.log('Resend OTP for:', email);
    } catch (error) {
      console.error('Resend OTP failed:', error);
    }
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOTP(value);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">
            We've sent a 6-digit verification code to <strong>{email}</strong>
          </p>
        </div>

        {(error || otpError) && (
          <div className="error-message">
            {error || otpError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="otp" className="form-label">Verification Code</label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={handleOTPChange}
              className={`form-input otp-input ${otpError ? 'error' : ''}`}
              placeholder="Enter 6-digit code"
              maxLength="6"
              required
              autoComplete="one-time-code"
            />
            <p className="form-hint">Enter the 6-digit code sent to your email</p>
          </div>

          <button type="submit" className="auth-button" disabled={loading || !otp}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Didn't receive the code?{' '}
            <button 
              type="button"
              onClick={handleResendOTP}
              className={`resend-link ${resendCooldown > 0 ? 'disabled' : ''}`}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </p>
          <p className="auth-footer-text">
            Wrong email?{' '}
            <button 
              type="button"
              onClick={() => navigate('/register')}
              className="auth-link"
            >
              Go back to registration
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OTPVerification;

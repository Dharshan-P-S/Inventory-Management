import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import '../App.css'; // Assuming general styles are here

import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

const API_BASE_URL = 'http://localhost:3001/api'; // Define API base URL

// Define stages for the form
const STAGE_IDENTIFIER = 'STAGE_IDENTIFIER';
const STAGE_OTP_PASSWORD = 'STAGE_OTP_PASSWORD';

function ForgotPasswordPage() {
  const [stage, setStage] = useState(STAGE_IDENTIFIER); // Control the form stage
  const [identifier, setIdentifier] = useState(''); // Can be username or email
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // For success/info messages
  const navigate = useNavigate(); // Hook for navigation

  // Handler for the first stage (sending OTP)
  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      // Call the endpoint to send the OTP
      const response = await fetch(`${API_BASE_URL}/send-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await response.json();

      if (response.ok) {
        // OTP sent successfully (or user doesn't exist, but we show the same message)
        console.log('OTP send request processed for:', identifier);
        // Add the instruction to check spam folder
        setMessage((data.message || 'If an account exists, an OTP has been sent to the associated email.') + ' Please also check your spam/junk folder.');
        setStage(STAGE_OTP_PASSWORD); // Move to the next stage
      } else {
        // Handle specific errors from the backend if necessary, otherwise show generic
        console.error('Error sending OTP:', response.status, data.message);
        setError(data.message || `Failed to send OTP (${response.status}). Please try again.`);
      }
    } catch (err) {
      console.error('Network or fetch error sending OTP:', err);
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for the second stage (verifying OTP and resetting password)
  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    // Frontend validation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
     if (!/^\d{6}$/.test(otp)) {
      setError('OTP must be 6 digits.');
      return;
    }


    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Password reset successful for:', identifier);
        // Show alert message instead of setting state message
        alert(data.message || 'Password has been reset successfully.');
        // Navigate immediately after alert is dismissed
        navigate('/login');
      } else {
        console.error('Error resetting password:', response.status, data.message);
        setError(data.message || `Failed to reset password (${response.status}). Please check the OTP or request a new one.`);
      }
    } catch (err) {
      console.error('Network or fetch error resetting password:', err);
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Forgot Password</h2>

        {/* Stage 1: Enter Identifier */}
        {stage === STAGE_IDENTIFIER && (
          <>
            <p>Enter your username or email address below and we'll send you an OTP to reset your password.</p>
            <form onSubmit={handleSendOtp} className="auth-form">
              <div className="form-group">
                <label htmlFor="forgot-identifier">Username or Email:</label>
                <input
                  type="text"
                  id="forgot-identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  disabled={isLoading}
                />
              </div>
              {error && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* Stage 2: Enter OTP and New Password */}
        {stage === STAGE_OTP_PASSWORD && (
          <>
            {/* Display the message which now includes the spam folder check */}
            <p style={{ fontWeight: '500', color: 'var(--info-color)' }}>{message}</p>
            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <label htmlFor="forgot-otp">Enter OTP:</label>
                <input
                  type="text" // Use text for easier input, backend validates format
                  id="forgot-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  maxLength="6"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="forgot-new-password">New Password:</label>
                <input
                  type="password"
                  id="forgot-new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="forgot-confirm-password">Confirm New Password:</label>
                <input
                  type="password"
                  id="forgot-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  disabled={isLoading}
                />
              </div>
              {error && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* Link to Login - Shown in both stages */}
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Remembered your password? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

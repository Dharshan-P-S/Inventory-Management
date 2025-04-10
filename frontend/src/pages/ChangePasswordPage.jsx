import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Assuming general styles are here

const API_BASE_URL = 'http://localhost:3001/api';

function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    // Frontend validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (oldPassword === newPassword) {
      setError('New password cannot be the same as the old password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Credentials ('include') are needed to send the httpOnly session cookie
        credentials: 'include',
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password changed successfully!');
        alert(data.message || 'Password changed successfully!'); // Show alert
        setOldPassword(''); // Clear fields
        setNewPassword('');
        setConfirmPassword('');
        // Optionally navigate away after success, e.g., back to home or profile
        // navigate('/');
      } else {
        setError(data.message || `Failed to change password (${response.status}).`);
      }
    } catch (err) {
      console.error('Network or fetch error changing password:', err);
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page"> {/* Use auth-page for consistent width */}
      <div className="auth-container">
        <h2>Change Password</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="change-old-password">Old Password:</label>
            <input
              type="password"
              id="change-old-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="change-new-password">New Password:</label>
            <input
              type="password"
              id="change-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="change-confirm-password">Confirm New Password:</label>
            <input
              type="password"
              id="change-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
          {message && <p className="success-message" style={{ textAlign: 'center', marginBottom: '1rem', color: 'green' }}>{message}</p>}
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordPage;

import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:3001/api'; // Define API base URL

// Define stages for the form
const STAGE_DETAILS = 'STAGE_DETAILS';
const STAGE_OTP = 'STAGE_OTP';

function RegisterForm({ onSubmit }) {
  const [stage, setStage] = useState(STAGE_DETAILS); // Control the form stage
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('customer');
  const [otp, setOtp] = useState(''); // State for OTP input
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [error, setError] = useState(''); // Error message state
  const [message, setMessage] = useState(''); // Success/info message state

  // --- Handle Sending OTP ---
  const handleSendOtp = async () => {
    setError('');
    setMessage('');

    // Basic email validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    // Basic password validation (can add more complex rules)
    if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/send-register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'OTP sent successfully. Check your email (and spam folder).');
        setStage(STAGE_OTP); // Move to OTP stage
      } else {
        setError(data.message || `Failed to send OTP (${response.status}). Please try again.`);
      }
    } catch (err) {
      console.error('Network or fetch error sending registration OTP:', err);
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handle Final Registration Submission ---
  const handleRegister = (event) => {
    event.preventDefault();
    setError(''); // Clear previous errors
    setMessage('');

    // Final validation check (redundant but safe)
    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }
     if (!/^\d{6}$/.test(otp)) {
      setError('OTP must be 6 digits.');
      return;
    }

    // Call the original onSubmit prop passed from RegisterPage
    // This prop should handle the actual API call to /api/register
    onSubmit({
      username: username.trim(),
      email: email.trim(),
      password, // Send the actual password
      userType,
      otp // Include the OTP
    });
  };

  return (
    // Use handleRegister for the final form submission
    <form onSubmit={handleRegister} className="auth-form">
      {/* --- Stage 1: Details Input --- */}
      <div className="form-group">
        <label htmlFor="register-username">Username:</label>
        <input
          type="text"
          id="register-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading || stage === STAGE_OTP} // Disable if loading or in OTP stage
        />
      </div>
      <div className="form-group">
        <label htmlFor="register-email">Email:</label>
        <input
          type="email"
          id="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading || stage === STAGE_OTP} // Disable if loading or in OTP stage
        />
      </div>
      <div className="form-group">
        <label htmlFor="register-password">Password:</label>
        <input
          type="password"
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading || stage === STAGE_OTP} // Disable if loading or in OTP stage
        />
      </div>
      <div className="form-group">
        <label htmlFor="register-confirm-password">Confirm Password:</label>
        <input
          type="password"
          id="register-confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading || stage === STAGE_OTP} // Disable if loading or in OTP stage
        />
      </div>
      <div className="form-group">
        <label htmlFor="register-user-type">Register as:</label>
        <select
          id="register-user-type"
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          className="form-control"
          disabled={isLoading || stage === STAGE_OTP} // Disable if loading or in OTP stage
        >
          <option value="customer">Customer</option>
          <option value="owner">Owner (Requires Approval)</option>
        </select>
      </div>

      {/* --- Stage 2: OTP Input (Conditionally Rendered) --- */}
      {stage === STAGE_OTP && (
        <div className="form-group">
          <label htmlFor="register-otp">Enter OTP:</label>
          <input
            type="text" // Use text for easier input
            id="register-otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            maxLength="6"
            required
            disabled={isLoading} // Only disable based on loading state here
          />
        </div>
      )}

      {/* Display Messages/Errors */}
      {error && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
      {message && <p style={{ color: 'var(--success-color)', textAlign: 'center', marginBottom: '1rem', fontWeight: '500' }}>{message}</p>}

      {/* Conditional Buttons */}
      {stage === STAGE_DETAILS && (
        <button
          type="button" // Important: Change type to button to prevent form submission
          onClick={handleSendOtp}
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Sending OTP...' : 'Send Verification OTP'}
        </button>
      )}

      {stage === STAGE_OTP && (
        <button
          type="submit" // This button submits the form
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      )}
    </form>
  );
}

export default RegisterForm;

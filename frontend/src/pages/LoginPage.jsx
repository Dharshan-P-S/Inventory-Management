import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import LoginForm from '../components/LoginForm';

const API_BASE_URL = 'http://localhost:3001/api'; // Define API base URL

// Accept onLogin, apiError, setApiError from App.jsx
function LoginPage({ onLogin, apiError, setApiError }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (credentials) => {
    console.log('Login attempt with:', credentials);
    setIsLoading(true);
    setApiError(null); // Clear previous errors

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // <<< Send cookies with the request
      });

      const data = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        // Use the message from the server response if available
        throw new Error(data.message || `Login failed: ${response.status}`);
      }

      console.log('Login successful:', data.user);
      onLogin(data.user); // Call the onLogin function passed from App.jsx

      // Navigation is handled in App.jsx after state update

    } catch (error) {
      console.error('Login error:', error);
      setApiError(error.message); // Set the error state in App.jsx
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container auth-page">
      <h2>Login</h2>
      {/* Pass the actual handleLogin function */}
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
      {/* Display API errors */}
      {apiError && <p className="error-message">{apiError}</p>}
      <p className="auth-switch-link">
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default LoginPage;

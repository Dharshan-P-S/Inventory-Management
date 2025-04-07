import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import RegisterForm from '../components/RegisterForm';

const API_BASE_URL = 'http://localhost:3001/api'; // Define API base URL

// Accept apiError, setApiError from App.jsx
function RegisterPage({ apiError, setApiError }) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate(); // Hook for navigation

  const handleRegister = async (userData) => {
    console.log('Register attempt with:', userData);
    setIsLoading(true);
    setApiError(null); // Clear previous errors
    setSuccessMessage(''); // Clear previous success message

    // Create data object for backend, including userType
    const registerData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        userType: userData.userType // Include userType
    };

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
        // No credentials needed for registration usually
      });

      const data = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        // Use the message from the server response if available
        throw new Error(data.message || `Registration failed: ${response.status}`);
      }

      console.log('Registration response:', data);

      if (data.pending) {
        // Owner registration pending approval
        setSuccessMessage(data.message || 'Owner registration successful. Account pending approval.');
        // Optionally clear form or disable it, but don't redirect yet
      } else {
        // Customer registration successful
        setSuccessMessage(data.message || 'Registration successful! Redirecting to login...');
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000); // 2-second delay
      }

    } catch (error) {
      console.error('Registration error:', error);
      setApiError(error.message); // Set the error state in App.jsx
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container auth-page">
      <h2>Register</h2>
      {/* Pass the actual handleRegister function */}
      <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
      {/* Display API errors or success message */}
      {apiError && <p className="error-message">{apiError}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      <p className="auth-switch-link">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default RegisterPage;

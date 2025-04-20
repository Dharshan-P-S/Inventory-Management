import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './LoginPage.css'; // Import the new CSS

// Placeholder Icon URLs (replace with actual paths or imports if using an icon library)
const userIconUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png'; // Simple user icon
const lockIconUrl = 'https://cdn-icons-png.flaticon.com/512/2889/2889676.png'; // Using a different lock icon URL
const eyeOpenIconUrl = '/openeye.webp'; // Assuming you have these in public folder
const eyeClosedIconUrl = '/closeeye.webp'; // Assuming you have these in public folder

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 }, // Removed scale
  visible: {
    opacity: 1,
    // Removed scale
    transition: {
      duration: 0.5, // Kept duration, removed spring type as it's less relevant without scale/transform
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0 }, // Only use opacity for hidden state
  visible: { opacity: 1, transition: { duration: 0.3 } }, // Only use opacity for visible state
};

const buttonVariants = {
  hover: { scale: 1.03, transition: { yoyo: Infinity, duration: 0.4 } },
  tap: { scale: 0.97 },
};

// Accept onLogin, apiError, setApiError from App.jsx
function LoginPage({ onLogin, apiError, setApiError }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('Login attempt with:', { username, password });
    setIsLoading(true);
    setApiError(null); // Clear previous errors

    try {
      const response = await fetch(`${API_BASE_URL}/login`, { // Assuming API_BASE_URL is globally accessible or defined elsewhere
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Send cookies with the request
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Define API_BASE_URL if not globally available (e.g., from context)
  const API_BASE_URL = 'http://localhost:3001/api';

  return (
    <div className="login-page-container">
      <motion.div
        className="login-form-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back Button */}
        <Link to="/" className="back-button" aria-label="Go back to landing page">
          ←
        </Link>
        <motion.h2 variants={itemVariants}>Login</motion.h2>
        <motion.form onSubmit={handleSubmit} className="login-form" variants={itemVariants}>
          <motion.div className="form-group" variants={itemVariants}>
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <img src={userIconUrl} alt="Username icon" className="input-icon" />
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={isLoading}
              />
            </div>
          </motion.div>

          <motion.div className="form-group" variants={itemVariants}>
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <img src={lockIconUrl} alt="Password icon" className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
              <img
                src={showPassword ? eyeClosedIconUrl : eyeOpenIconUrl}
                alt={showPassword ? 'Hide password' : 'Show password'}
                className="password-toggle-icon"
                onClick={togglePasswordVisibility}
              />
            </div>
          </motion.div>

          {/* Display API errors */}
          {apiError && <motion.p className="error-message" variants={itemVariants}>{apiError}</motion.p>}

          <motion.button
            type="submit"
            className="login-button"
            disabled={isLoading}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </motion.button>
        </motion.form>

        <motion.div className="login-links" variants={itemVariants}>
          <Link to="/forgot-password">Forgot Password?</Link>
          <span> | </span>
          <Link to="/register">Register here</Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LoginPage;

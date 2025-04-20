import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './RegisterPage.css'; // Import the new CSS

// Placeholder Icon URLs
const userIconUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png';
const emailIconUrl = 'https://cdn-icons-png.flaticon.com/512/732/732200.png'; // Simple email icon
const lockIconUrl = 'https://cdn-icons-png.flaticon.com/512/2889/2889676.png';
const otpIconUrl = 'https://cdn-icons-png.flaticon.com/512/4210/4210031.png'; // Simple OTP/key icon
const eyeOpenIconUrl = '/openeye.webp';
const eyeClosedIconUrl = '/closeeye.webp';

// Framer Motion Variants (same as LoginPage for consistency)
const containerVariants = {
  hidden: { opacity: 0 }, // Removed scale
  visible: {
    opacity: 1,
    // Removed scale
    transition: {
      duration: 0.5, // Kept duration, removed spring type
      staggerChildren: 0.1, // Keep stagger for items
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

// Accept apiError, setApiError from App.jsx
function RegisterPage({ apiError, setApiError }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userType, setUserType] = useState('customer'); // Default to customer
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const navigate = useNavigate();

  // Define API_BASE_URL
  const API_BASE_URL = 'http://localhost:3001/api';

  const handleSendOtp = async () => {
    if (!email) {
      setApiError('Please enter your email address.');
      return;
    }
    setIsOtpLoading(true);
    setApiError(null);
    setSuccessMessage('');
    setInfoMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/send-register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }
      setIsOtpSent(true);
      setInfoMessage(data.message || 'OTP sent successfully to your email.');
    } catch (error) {
      console.error('Send OTP error:', error);
      setApiError(error.message);
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setApiError('Passwords do not match.');
      return;
    }
    if (!isOtpSent) {
        setApiError('Please request and enter the OTP sent to your email.');
        return;
    }

    setIsRegisterLoading(true);
    setApiError(null);
    setSuccessMessage('');
    setInfoMessage('');

    const registerData = { username, email, password, userType, otp };

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Registration failed: ${response.status}`);
      }

      console.log('Registration response:', data);
      if (data.pending) {
        setSuccessMessage(data.message || 'Owner registration successful. Account pending approval.');
        // Clear form partially or fully? Maybe just OTP and passwords.
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setIsOtpSent(false); // Require new OTP for another attempt
      } else {
        setSuccessMessage(data.message || 'Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2500); // Slightly longer delay
      }
    } catch (error) {
      console.error('Registration error:', error);
      setApiError(error.message);
      // If registration fails due to OTP, maybe allow re-entry without new OTP request?
      // For now, keep isOtpSent true to allow retry with same OTP if it was just wrong.
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <div className="register-page-container">
      <motion.div
        className="register-form-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back Button */}
        <Link to="/" className="back-button" aria-label="Go back to landing page">
          ←
        </Link>
        <motion.h2 variants={itemVariants}>Register</motion.h2>

        {/* Display Messages */}
        {apiError && <motion.p variants={itemVariants} className="error-message">{apiError}</motion.p>}
        {successMessage && <motion.p variants={itemVariants} className="success-message">{successMessage}</motion.p>}
        {infoMessage && <motion.p variants={itemVariants} className="info-message">{infoMessage}</motion.p>}

        <motion.form onSubmit={handleRegister} className="register-form" variants={itemVariants}>
          {/* Username */}
          <motion.div className="form-group" variants={itemVariants}>
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <img src={userIconUrl} alt="Username" className="input-icon" />
              <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required disabled={isRegisterLoading || !!successMessage} />
            </div>
          </motion.div>

          {/* Email */}
          <motion.div className="form-group" variants={itemVariants}>
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <img src={emailIconUrl} alt="Email" className="input-icon" />
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required disabled={isOtpLoading || isRegisterLoading || isOtpSent || !!successMessage} />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div className="form-group" variants={itemVariants}>
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <img src={lockIconUrl} alt="Password" className="input-icon" />
              <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (min 6 chars)" required disabled={isRegisterLoading || !!successMessage} />
              <img src={showPassword ? eyeClosedIconUrl : eyeOpenIconUrl} alt="Toggle password visibility" className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)} />
            </div>
          </motion.div>

          {/* Confirm Password */}
          <motion.div className="form-group" variants={itemVariants}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <img src={lockIconUrl} alt="Confirm Password" className="input-icon" />
              <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required disabled={isRegisterLoading || !!successMessage} />
              <img src={showConfirmPassword ? eyeClosedIconUrl : eyeOpenIconUrl} alt="Toggle confirm password visibility" className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
            </div>
          </motion.div>

          {/* User Type */}
          <motion.div className="form-group user-type-selection" variants={itemVariants}>
            <label>
              <input type="radio" name="userType" value="customer" checked={userType === 'customer'} onChange={(e) => setUserType(e.target.value)} disabled={isRegisterLoading || !!successMessage} />
              Register as Customer
            </label>
            <label>
              <input type="radio" name="userType" value="owner" checked={userType === 'owner'} onChange={(e) => setUserType(e.target.value)} disabled={isRegisterLoading || !!successMessage} />
              Register as Owner
            </label>
          </motion.div>

          {/* OTP Section - Conditionally Rendered */}
          {!isOtpSent ? (
            <motion.button
              type="button"
              className="otp-button"
              onClick={handleSendOtp}
              disabled={isOtpLoading || !email}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {isOtpLoading ? 'Sending OTP...' : 'Send Verification OTP'}
            </motion.button>
          ) : (
            <>
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="otp">OTP</label>
                <div className="input-wrapper">
                  <img src={otpIconUrl} alt="OTP" className="input-icon" />
                  <input type="text" id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" required maxLength="6" disabled={isRegisterLoading || !!successMessage} />
                </div>
              </motion.div>

              <motion.button
                type="submit"
                className="register-button"
                disabled={isRegisterLoading || !otp || otp.length !== 6 || !!successMessage}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                {isRegisterLoading ? 'Registering...' : 'Register'}
              </motion.button>
            </>
          )}
        </motion.form>

        <motion.div className="register-links" variants={itemVariants}>
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;

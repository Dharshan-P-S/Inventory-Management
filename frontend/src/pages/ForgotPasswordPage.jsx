import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion
import './ForgotPasswordPage.css'; // Import the new CSS

// Placeholder Icon URLs
const userEmailIconUrl = 'https://cdn-icons-png.flaticon.com/512/732/732200.png'; // Email/User icon
const otpIconUrl = 'https://cdn-icons-png.flaticon.com/512/4210/4210031.png'; // OTP/key icon
const lockIconUrl = 'https://cdn-icons-png.flaticon.com/512/2889/2889676.png'; // Lock icon
const eyeOpenIconUrl = '/openeye.webp';
const eyeClosedIconUrl = '/closeeye.webp';

// Define stages for the form
const STAGE_IDENTIFIER = 'STAGE_IDENTIFIER';
const STAGE_OTP_PASSWORD = 'STAGE_OTP_PASSWORD';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const stepVariants = {
  hidden: { opacity: 0, x: -50 }, // Slide in from left slightly
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.3, ease: "easeInOut" } } // Slide out to right slightly
};


function ForgotPasswordPage() {
  const [stage, setStage] = useState(STAGE_IDENTIFIER);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Define API_BASE_URL
  const API_BASE_URL = 'http://localhost:3001/api';

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError(''); setMessage(''); setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/send-reset-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage((data.message || 'If an account exists, an OTP has been sent.') + ' Please check spam/junk.');
        setStage(STAGE_OTP_PASSWORD);
      } else {
        setError(data.message || `Failed to send OTP (${response.status}).`);
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters long.'); return; }
    if (!/^\d{6}$/.test(otp)) { setError('OTP must be 6 digits.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, otp, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Password has been reset successfully.');
        navigate('/login');
      } else {
        setError(data.message || `Failed to reset password (${response.status}).`);
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally { setIsLoading(false); }
  };

  return (
    // Apply container animation to the outermost div
    <motion.div
      className="forgotPasswordPageContainer"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="forgotPasswordFormContainer">
        <h2>Forgot Password</h2>

        {/* Display Messages */}
        {error && <p className="forgotPasswordErrorMessage">{error}</p>}
        {message && <p className="forgotPasswordInfoMessage">{message}</p>}

        {/* AnimatePresence to handle transitions between stages */}
        <AnimatePresence mode="wait">
          {stage === STAGE_IDENTIFIER && (
            <motion.form
              key={STAGE_IDENTIFIER} // Unique key for AnimatePresence
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onSubmit={handleSendOtp}
              className="forgotPasswordForm"
            >
              <p className="forgotPasswordStepIndicator">
                Step 1: Enter your username or email to receive an OTP.
              </p>
              <div className="formGroup">
                <label htmlFor="forgot-identifier">Username or Email</label>
                <div className="inputWrapper">
                  <img src={userEmailIconUrl} alt="Identifier" className="inputIcon" />
                  <input type="text" id="forgot-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter username or email" required disabled={isLoading} />
                </div>
              </div>
              <button type="submit" className="forgotPasswordButton step-1" disabled={isLoading || !identifier} >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </motion.form>
          )}

          {stage === STAGE_OTP_PASSWORD && (
            <motion.form
              key={STAGE_OTP_PASSWORD} // Unique key for AnimatePresence
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onSubmit={handleResetPassword}
              className="forgotPasswordForm"
            >
               <p className="forgotPasswordStepIndicator">
                Step 2: Enter the OTP and your new password.
              </p>
              <div className="formGroup">
                <label htmlFor="forgot-otp">OTP</label>
                <div className="inputWrapper">
                  <img src={otpIconUrl} alt="OTP" className="inputIcon" />
                  <input type="text" id="forgot-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength="6" required disabled={isLoading} />
                </div>
              </div>
              <div className="formGroup">
                <label htmlFor="forgot-new-password">New Password</label>
                <div className="inputWrapper">
                  <img src={lockIconUrl} alt="New Password" className="inputIcon" />
                  <input type={showNewPassword ? 'text' : 'password'} id="forgot-new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 chars)" required disabled={isLoading} />
                  <img src={showNewPassword ? eyeClosedIconUrl : eyeOpenIconUrl} alt="Toggle new password visibility" className="passwordToggleIcon" onClick={() => setShowNewPassword(!showNewPassword)} />
                </div>
              </div>
              <div className="formGroup">
                <label htmlFor="forgot-confirm-password">Confirm New Password</label>
                <div className="inputWrapper">
                  <img src={lockIconUrl} alt="Confirm Password" className="inputIcon" />
                  <input type={showConfirmPassword ? 'text' : 'password'} id="forgot-confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required disabled={isLoading} />
                  <img src={showConfirmPassword ? eyeClosedIconUrl : eyeOpenIconUrl} alt="Toggle confirm password visibility" className="passwordToggleIcon" onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
                </div>
              </div>
              <button type="submit" className="forgotPasswordButton step-2" disabled={isLoading || !otp || !newPassword || !confirmPassword} >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="forgotPasswordLinks">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </motion.div>
  );
}

export default ForgotPasswordPage;

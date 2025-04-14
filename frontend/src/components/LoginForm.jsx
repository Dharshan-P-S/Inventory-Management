import React, { useState } from 'react';


function LoginForm({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  // TODO: Add error handling state

  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO: Add basic validation
    onSubmit({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="login-username">Username:</label>
        <input
          type="text"
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="form-group password-input-container" style={{ marginBottom: "25px" }}>
        <label htmlFor="login-password">Password:</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ paddingRight: '40px' }} // Add padding to prevent text overlap with icon
          />
          <img
            src={showPassword ? '/openeye.webp' : '/closeeye.webp'}
            alt={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              width: '20px', // Adjust size as needed
              height: 'auto'
            }}
          />
        </div>
      </div>
      {/* TODO: Display errors */}
      <button type="submit" className="auth-button">Login</button>
      <div className="form-group" style={{ textAlign: 'center', marginTop: '15px' }}> {/* Centered and added top margin */}
        <a href="/forgot-password">Forgot Password?</a>
      </div>
    </form>
  );
}

export default LoginForm;

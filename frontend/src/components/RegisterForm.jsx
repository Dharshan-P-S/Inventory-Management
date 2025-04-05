import React, { useState } from 'react';

function RegisterForm({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // TODO: Add error handling state

  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO: Add validation (e.g., password match)
    if (password !== confirmPassword) {
      alert("Passwords don't match!"); // Simple alert for now
      return;
    }
    onSubmit({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="register-username">Username:</label>
        <input
          type="text"
          id="register-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
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
        />
      </div>
      {/* TODO: Display errors */}
      <button type="submit" className="auth-button">Register</button>
    </form>
  );
}

export default RegisterForm;

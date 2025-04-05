import React, { useState } from 'react';

function LoginForm({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="form-group">
        <label htmlFor="login-password">Password:</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {/* TODO: Display errors */}
      <button type="submit" className="auth-button">Login</button>
    </form>
  );
}

export default LoginForm;

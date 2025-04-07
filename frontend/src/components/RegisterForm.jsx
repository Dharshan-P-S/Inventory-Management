import React, { useState } from 'react';

function RegisterForm({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // added email state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('customer'); // Add state for user type, default to customer
  // TODO: Add error handling state

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Debug: email:", `"${email}"`, "password:", `"${password}"`, "confirmPassword:", `"${confirmPassword}"`);
    // Validate passwords after trimming whitespace
    if (password.trim() !== confirmPassword.trim()) {
      alert("Passwords don't match!");
      return;
    }
    onSubmit({
      username: username.trim(),
      email: email.trim(),
      password,
      userType // Include userType in submitted data
    });
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
      {/* New email field */}
      <div className="form-group">
        <label htmlFor="register-email">Email:</label>
        <input
          type="email"
          id="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="register-password">Password:</label>
        <input
          type="password" // changed from text to password
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="register-confirm-password">Confirm Password:</label>
        <input
          type="password" // changed from text to password
          id="register-confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {/* User Type Selection */}
      <div className="form-group">
        <label htmlFor="register-user-type">Register as:</label>
        <select
          id="register-user-type"
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          className="form-control" // Use consistent styling
        >
          <option value="customer">Customer</option>
          <option value="owner">Owner (Requires Approval)</option>
        </select>
      </div>
      {/* TODO: Display errors */}
      <button type="submit" className="auth-button">Register</button>
    </form>
  );
}

export default RegisterForm;

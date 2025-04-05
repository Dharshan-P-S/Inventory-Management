import React from 'react';
import LoginForm from '../components/LoginForm';
// import { useNavigate } from 'react-router-dom'; // Will be needed later for redirect

function LoginPage() {
  // const navigate = useNavigate(); // Will be needed later

  const handleLogin = (credentials) => {
    console.log('Login attempt with:', credentials);
    // TODO: Implement actual login API call and state update
    // if (success) navigate('/');
  };

  return (
    <div className="page-container auth-page">
      <h2>Login</h2>
      <LoginForm onSubmit={handleLogin} />
      {/* TODO: Add link to Register page */}
    </div>
  );
}

export default LoginPage;

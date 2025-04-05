import React from 'react';
import RegisterForm from '../components/RegisterForm';
// import { useNavigate } from 'react-router-dom'; // Will be needed later

function RegisterPage() {
  // const navigate = useNavigate(); // Will be needed later

  const handleRegister = (userData) => {
    console.log('Register attempt with:', userData);
    // TODO: Implement actual registration API call
    // if (success) navigate('/login');
  };

  return (
    <div className="page-container auth-page">
      <h2>Register</h2>
      <RegisterForm onSubmit={handleRegister} />
      {/* TODO: Add link to Login page */}
    </div>
  );
}

export default RegisterPage;

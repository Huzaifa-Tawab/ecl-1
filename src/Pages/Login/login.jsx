// src/components/Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import './login.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setLoginError('');

    let isValid = true;

    // Validate Email
    if (!email) {
      setEmailError('Email is required.');
      isValid = false;
    }

    // Validate Password
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    if (!isValid) return;

    try {
      // Sign in using Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/eclcalculator');
      
    } catch (error) {
      setLoginError('Invalid email or password. Please try again.');
    }
  };

  // Toggle Password Visibility
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="left-side">
        <img src="https://via.placeholder.com/500" alt="Placeholder" />
      </div>

      <div className="right-side">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div className="input-container">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            {emailError && <span className="error-message">{emailError}</span>}
          </div>

          <div className="input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            {passwordError && <span className="error-message">{passwordError}</span>}
            <span className="eye-icon" onClick={togglePassword}>
              👁️
            </span>
          </div>

          <button type="submit">Login</button>
          {loginError && <span className="error-message">{loginError}</span>}
        </form>
      </div>
    </div>
  );
};

export default Login;

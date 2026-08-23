import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Users,
  Hash,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff
} from 'lucide-react';

import '../styles/Login.css';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    usn: '',
    phone: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegistering
      ? `${import.meta.env.VITE_API_URL}/api/auth/register`
      : `${import.meta.env.VITE_API_URL}/api/auth/login`;

    try {
      const response = await axios.post(endpoint, {
        ...formData,
        role: role
      });

      if (isRegistering) {
        alert('Registration successful! Please login.');

        setIsRegistering(false);
        setShowPassword(false);

        setFormData({
          name: '',
          usn: '',
          phone: '',
          email: '',
          password: ''
        });

        return;
      }

      localStorage.setItem('token', response.data.token);

      navigate(
        role === 'student'
          ? '/student'
          : '/faculty'
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Authentication failed. Please try again.'
      );
    }
  };

  const switchAuthMode = () => {
    setIsRegistering(!isRegistering);
    setShowPassword(false);
    setError('');
  };

  return (
    <div className="login-page">

      <div className="login-card">

        {/* Logo / Brand */}
        <div className="brand-section">
          <div className="brand-icon">
            <Users size={26} />
          </div>

          <h1>Smart Queue</h1>

          <p>
            {isRegistering
              ? 'Create your account and join the virtual queue.'
              : 'Manage your appointments smarter.'}
          </p>
        </div>

        {/* Header */}
        <div className="card-header">
          <h2>
            {isRegistering
              ? 'Create an Account'
              : 'Welcome Back'}
          </h2>

          <p>
            {isRegistering
              ? 'Fill in your details to get started.'
              : 'Sign in to continue to your dashboard.'}
          </p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">

          <button
            type="button"
            className={role === 'student' ? 'active' : ''}
            onClick={() => setRole('student')}
          >
            <Users size={18} />
            Student
          </button>

          <button
            type="button"
            className={role === 'faculty' ? 'active' : ''}
            onClick={() => setRole('faculty')}
          >
            <Users size={18} />
            Faculty
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {/* Registration fields */}
          {isRegistering && (
            <>

              <div className="input-field">
                <label>Full Name</label>

                <div className="input-wrapper">
                  <UserIcon
                    className="input-icon"
                    size={19}
                  />

                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {role === 'student' && (
                <div className="input-field">
                  <label>
                    USN
                  </label>

                  <div className="input-wrapper">
                    <Hash
                      className="input-icon"
                      size={19}
                    />

                    <input
                      type="text"
                      name="usn"
                      required
                      placeholder="1XX20CS001"
                      value={formData.usn}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              <div className="input-field">
                <label>
                  Phone Number
                </label>

                <div className="input-wrapper">
                  <Phone
                    className="input-icon"
                    size={19}
                  />

                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

            </>
          )}

          {/* Email */}
          <div className="input-field">

            <label>Email Address</label>

            <div className="input-wrapper">

              <Mail
                className="input-icon"
                size={19}
              />

              <input
                type="email"
                name="email"
                required
                placeholder={`your.${role}@university.edu`}
                value={formData.email}
                onChange={handleInputChange}
              />

            </div>

          </div>

          {/* Password */}
          <div className="input-field">

            <label>Password</label>

            <div className="input-wrapper">

              <Lock
                className="input-icon"
                size={19}
              />

              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>

            </div>

          </div>

          {/* Submit */}
          <button
            type="submit"
            className="login-submit-btn"
          >
            {isRegistering
              ? 'Create Account'
              : `Sign In as ${
                  role === 'student'
                    ? 'Student'
                    : 'Faculty'
                }`}
          </button>

        </form>

        {/* Switch Login/Register */}
        <div className="auth-switch">

          <span>
            {isRegistering
              ? 'Already have an account?'
              : "Don't have an account?"}
          </span>

          <button
            type="button"
            onClick={switchAuthMode}
          >
            {isRegistering
              ? 'Sign In'
              : 'Register Here'}
          </button>

        </div>

      </div>

    </div>
  );
};

export default Login;
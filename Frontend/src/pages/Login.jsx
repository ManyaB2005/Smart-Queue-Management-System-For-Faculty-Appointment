import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Users, School, Hash, Phone, User as UserIcon } from 'lucide-react';
import '../styles/Login.css';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    usn: '',
    phone: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // CORRECTED: Point to the /auth/ routes
    const endpoint = isRegistering 
      ? 'http://localhost:5000/api/auth/register' 
      : 'http://localhost:5000/api/auth/login';
    
    try {
      // CORRECTED: Send formData and role to the correct endpoint
      const response = await axios.post(endpoint, {
        ...formData,
        role: role
      });

      // Save token and route user
      localStorage.setItem('token', response.data.token);
      navigate(role === 'student' ? '/student' : '/faculty'); 
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-graphic-side">
        <School size={64} color="white" strokeWidth={1.5} />
        <h1>Smart Queue<br/>Management</h1>
        <p>Minimize waiting, maximize productivity. Receive automated SMS alerts when it is your turn.</p>
      </div>

      <div className="login-form-side">
        <div className="login-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="card-header">
            <h2>{isRegistering ? 'Create an Account' : 'Welcome Back'}</h2>
            <p className="subtitle">
              {isRegistering ? 'Register to join the virtual queue.' : 'Sign in to manage your appointments.'}
            </p>
          </div>

          {/* Role Selector */}
          <div className="role-selector">
            <button 
              type="button"
              className={role === 'student' ? 'active' : ''} 
              onClick={() => setRole('student')}
            >
              <Users size={18} /> Student
            </button>
            <button 
              type="button"
              className={role === 'faculty' ? 'active' : ''} 
              onClick={() => setRole('faculty')}
            >
              <Users size={18} /> Faculty
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-banner">{error}</div>}
            
            {/* Extra Fields specifically for Registration */}
            {isRegistering && (
              <>
                <div className="input-field">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <UserIcon className="input-icon" size={20} />
                    <input type="text" name="name" required placeholder="John Doe" value={formData.name} onChange={handleInputChange} />
                  </div>
                </div>

                {role === 'student' && (
                  <div className="input-field">
                    <label>USN (University Serial Number)</label>
                    <div className="input-wrapper">
                      <Hash className="input-icon" size={20} />
                      <input type="text" name="usn" required placeholder="1XX20CS001" value={formData.usn} onChange={handleInputChange} />
                    </div>
                  </div>
                )}

                <div className="input-field">
                  <label>Phone Number (For SMS Alerts)</label>
                  <div className="input-wrapper">
                    <Phone className="input-icon" size={20} />
                    <input type="tel" name="phone" required placeholder="+91 9876543210" value={formData.phone} onChange={handleInputChange} />
                  </div>
                </div>
              </>
            )}

            {/* Always visible fields */}
            <div className="input-field">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input type="email" name="email" required placeholder={`your.${role}@university.edu`} value={formData.email} onChange={handleInputChange} />
              </div>
            </div>

            <div className="input-field">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input type="password" name="password" required placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
              </div>
            </div>

            <button type="submit" className="login-submit-btn">
              {isRegistering ? 'Register Account' : `Sign In as ${role === 'student' ? 'Student' : 'Faculty'}`}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', marginLeft: '5px', cursor: 'pointer' }}
            >
              {isRegistering ? 'Sign In' : 'Register Here'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
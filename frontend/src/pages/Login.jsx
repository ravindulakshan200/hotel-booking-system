import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginService } from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await loginService(email, password);
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="fullscreen-bg fade-in">
      <div className="container auth-container">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="glass-card p-5 slide-up">
              <div className="text-center mb-4">
                <h2 className="font-serif fw-bold text-primary">Welcome Back</h2>
                <p className="text-muted">Sign in to manage your bookings</p>
              </div>
              
              {error && <div className="alert alert-danger" style={{ borderRadius: '10px' }}><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label">Email Address</label>
                  <input type="email" required className="form-control" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input type="password" required className="form-control" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary w-100 btn-lg mb-3">Sign In</button>
              </form>
              
              <div className="text-center mt-4">
                <p className="text-muted mb-0">Don't have an account? <Link to="/register" className="fw-bold" style={{ color: 'var(--color-primary)' }}>Register here</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

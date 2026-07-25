import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginService } from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';
  const [resendStatus, setResendStatus] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendStatus('');
    setIsUnverified(false);
    try {
      const response = await loginService(email, password);
      login(response.data?.user || response.data?.data?.user, response.data?.token || response.data?.data?.token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed';
      setError(errorMsg);
      if (err.response?.status === 403 && errorMsg.toLowerCase().includes('verify')) {
        setIsUnverified(true);
      }
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('Sending...');
    try {
      const { resendVerification } = await import('../services/authService');
      const response = await resendVerification(email);
      setResendStatus(response.data?.message || 'Verification email sent.');
    } catch (err) {
      setResendStatus(err.response?.data?.message || 'Failed to resend verification.');
    }
  };

  return (
    <div className="fullscreen-bg fade-in">
      <div className="container auth-container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="auth-card p-4 p-md-5 slide-up">
              <div className="text-center mb-4">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', color: '#fff' }}>
                  <i className="bi bi-door-open-fill fs-4"></i>
                </div>
                <h2 className="font-serif fw-bold text-primary">Welcome Back</h2>
                <p className="text-muted mb-0">Sign in to manage your bookings a little more beautifully.</p>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ borderRadius: '10px' }}>
                  <i className="bi bi-exclamation-circle-fill me-2"></i>{error}
                  {isUnverified && (
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="btn btn-sm btn-outline-danger"
                      >
                        Resend Verification Email
                      </button>
                      {resendStatus && <div className="mt-1 small fw-bold">{resendStatus}</div>}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label">Email Address</label>
                  <input type="email" required className="form-control" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input type="password" required className="form-control" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="mb-2 d-flex justify-content-end">
                  <Link to="/forgot-password" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>Forgot Password?</Link>
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

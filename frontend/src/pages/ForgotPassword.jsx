import React, { useState } from 'react';
import { Link } from 'react-router';
import { forgotPassword } from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await forgotPassword(email);
      setMessage(response.data?.message || 'If your email is registered, you will receive a password reset link.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request.');
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
                  <i className="bi bi-key-fill fs-4"></i>
                </div>
                <h2 className="font-serif fw-bold text-primary">Forgot Password</h2>
                <p className="text-muted mb-0">Enter your email to reset your password.</p>
              </div>

              {message && <div className="alert alert-success" style={{ borderRadius: '10px' }}><i className="bi bi-check-circle-fill me-2"></i>{message}</div>}
              {error && <div className="alert alert-danger" style={{ borderRadius: '10px' }}><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</div>}

              {!message && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label">Email Address</label>
                    <input type="email" required className="form-control" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary w-100 btn-lg mb-3">Send Reset Link</button>
                </form>
              )}

              <div className="text-center mt-4">
                <p className="text-muted mb-0"><Link to="/login" className="fw-bold" style={{ color: 'var(--color-primary)' }}>Back to Login</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

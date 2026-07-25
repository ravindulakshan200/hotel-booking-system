import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { resetPassword } from '../services/authService';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.data?.message || 'Password reset successfully.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        setError(err.response.data.errors.join(' '));
      } else {
        setError(err.response?.data?.message || 'Failed to reset password.');
      }
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
                  <i className="bi bi-shield-lock-fill fs-4"></i>
                </div>
                <h2 className="font-serif fw-bold text-primary">Set New Password</h2>
                <p className="text-muted mb-0">Please enter your new password below.</p>
              </div>

              {message && <div className="alert alert-success" style={{ borderRadius: '10px' }}><i className="bi bi-check-circle-fill me-2"></i>{message}</div>}
              {error && <div className="alert alert-danger" style={{ borderRadius: '10px' }}><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</div>}

              {!message && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label">New Password</label>
                    <input type="password" required minLength="8" maxLength="72" pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" title="Use 8–72 characters with at least one letter and one number." className="form-control" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <div className="form-text">Use 8–72 characters with at least one letter and one number.</div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 btn-lg mb-3">Reset Password</button>
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

export default ResetPassword;

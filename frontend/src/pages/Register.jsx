import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerService } from '../services/authService';

const Register = () => {
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await registerService(formData);
      setSuccess('Account created successfully. Please sign in.');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="fullscreen-bg fade-in">
      <div className="container auth-container">
        <div className="row justify-content-center">
          <div className="col-md-7 col-lg-6">
            <div className="auth-card p-4 p-md-5 slide-up">
              <div className="text-center mb-4">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', color: '#fff' }}>
                  <i className="bi bi-person-plus-fill fs-4"></i>
                </div>
                <h2 className="font-serif fw-bold text-primary">Create Account</h2>
                <p className="text-muted mb-0">Join us to book your perfect stay in Sri Lanka.</p>
              </div>

              {error && <div className="alert alert-danger" style={{ borderRadius: '10px' }}><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</div>}
              {success && <div className="alert alert-success" style={{ borderRadius: '10px' }}><i className="bi bi-check-circle-fill me-2"></i>{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">First Name</label>
                    <input type="text" name="first_name" required className="form-control" placeholder="John" value={formData.first_name} onChange={handleChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Last Name</label>
                    <input type="text" name="last_name" required className="form-control" placeholder="Doe" value={formData.last_name} onChange={handleChange} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input type="email" name="email" required className="form-control" placeholder="john@example.com" value={formData.email} onChange={handleChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" name="phone" className="form-control" placeholder="Optional" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input type="password" name="password" required minLength="8" maxLength="72" pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" title="Use 8–72 characters with at least one letter and one number." className="form-control" placeholder="Create a password" value={formData.password} onChange={handleChange} />
                  <div className="form-text">Use 8–72 characters with at least one letter and one number.</div>
                </div>
                <button type="submit" className="btn btn-primary w-100 btn-lg mb-3">Register</button>
              </form>

              <div className="text-center mt-4">
                <p className="text-muted mb-0">Already have an account? <Link to="/login" className="fw-bold" style={{ color: 'var(--color-primary)' }}>Login here</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

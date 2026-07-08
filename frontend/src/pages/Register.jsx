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
          <div className="col-md-5">
            <div className="glass-card p-5 slide-up">
              <div className="text-center mb-4">
                <h2 className="font-serif fw-bold text-primary">Create Account</h2>
                <p className="text-muted">Join us to book your perfect stay</p>
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
                  <input type="password" name="password" required className="form-control" placeholder="Create a password" value={formData.password} onChange={handleChange} />
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

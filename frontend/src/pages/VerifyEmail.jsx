import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail } from '../services/authService';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const performVerification = async () => {
      try {
        const response = await verifyEmail(token);
        setStatus('success');
        setMessage(response.data?.message || 'Your email has been verified!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    performVerification();
  }, [token]);

  return (
    <div className="fullscreen-bg fade-in">
      <div className="container auth-container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="auth-card p-4 p-md-5 slide-up text-center">
              <div className="mb-4">
                {status === 'verifying' && (
                  <>
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h2 className="font-serif fw-bold text-primary">Verifying Email...</h2>
                    <p className="text-muted mb-0">Please wait while we verify your email address.</p>
                  </>
                )}
                
                {status === 'success' && (
                  <>
                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #198754, #146c43)', color: '#fff' }}>
                      <i className="bi bi-check-lg fs-1"></i>
                    </div>
                    <h2 className="font-serif fw-bold text-success">Email Verified!</h2>
                    <p className="text-muted mb-4">{message}</p>
                    <Link to="/login" className="btn btn-primary w-100 btn-lg">Continue to Login</Link>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #dc3545, #b02a37)', color: '#fff' }}>
                      <i className="bi bi-x-lg fs-1"></i>
                    </div>
                    <h2 className="font-serif fw-bold text-danger">Verification Failed</h2>
                    <p className="text-muted mb-4">{message}</p>
                    <Link to="/login" className="btn btn-outline-primary w-100 btn-lg mb-3">Go to Login</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

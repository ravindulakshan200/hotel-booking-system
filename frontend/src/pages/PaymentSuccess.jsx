import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmSession } from '../services/paymentService';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Confirming your payment with Stripe...');

  useEffect(() => {
    if (!sessionId) {
      navigate('/hotels');
      return;
    }

    const confirmPayment = async () => {
      try {
        await confirmSession(sessionId);
        setStatus('success');
        setMessage('Payment confirmed successfully! Your booking is now complete.');

        // Redirect after a few seconds
        setTimeout(() => {
          navigate('/my-bookings', { state: { message: 'Booking confirmed successfully.' } });
        }, 3000);
      } catch (err) {
        console.error('Finalization error:', err);
        setStatus('error');
        // Fallback for missing/deleted bookings where it was already processed
        if (err.response?.status === 409 || err.message?.includes('already paid')) {
          setMessage('Payment was already confirmed.');
        } else {
          setMessage(err.response?.data?.message || 'Failed to confirm payment. Please contact support.');
        }
      }
    };

    confirmPayment();
  }, [sessionId, navigate]);

  return (
    <div className="page-wrapper" style={{ backgroundColor: 'var(--color-bg)', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container text-center">
        <div className="card shadow p-5 mx-auto" style={{ maxWidth: '500px', borderRadius: '15px' }}>
          {status === 'processing' && (
            <div>
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h2 className="fw-bold mb-3">Processing Payment...</h2>
              <p className="text-muted">Please wait while we verify your transaction with Stripe.</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <i className="bi bi-check-circle-fill text-success mb-3" style={{ fontSize: '4rem' }}></i>
              <h3 className="font-serif text-success">Payment Successful!</h3>
              <p className="text-muted">{message}</p>
              <p className="small text-muted">Redirecting to your bookings...</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <i className="bi bi-x-circle-fill text-danger mb-3" style={{ fontSize: '4rem' }}></i>
              <h3 className="font-serif text-danger">Payment Error</h3>
              <p className="text-muted">{message}</p>
              <button className="btn btn-primary mt-3 rounded-pill px-4" onClick={() => navigate('/my-bookings')}>
                Go to My Bookings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

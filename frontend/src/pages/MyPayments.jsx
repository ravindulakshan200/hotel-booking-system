import React, { useState, useEffect } from 'react';
import { getMyPayments } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';

const MyPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await getMyPayments();
        setPayments(res.data.data.payments || []);
      } catch (err) {
        setError('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-5 fade-in mb-5">
      <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-serif fw-bold text-primary mb-2">My Payments</h2>
          <p className="text-muted mb-0">View your transaction history and receipts.</p>
        </div>
      </div>
      
      <div className="alert alert-info d-flex align-items-center mb-4">
        <i className="bi bi-info-circle-fill fs-4 me-3"></i>
        <div>
          <strong>Demo Records Only:</strong> The payments listed below are for demonstration purposes in this portfolio project. No real money was processed.
        </div>
      </div>

      <div className="modern-card p-0 overflow-hidden shadow-sm">
        {payments.length === 0 ? (
          <div className="p-5 text-center">
            <p className="text-muted mb-0">No payment history found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Booking Details</th>
                  <th className="py-3">Method</th>
                  <th className="py-3">Amount (LKR)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id}>
                    <td className="px-4 fw-bold font-monospace text-muted">
                      {payment.transaction_id || `TRX-${payment.id.toString().padStart(5, '0')}`}
                    </td>
                    <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="fw-bold">{payment.hotel_name || 'Hotel Booking'}</div>
                      <small className="text-muted">Room {payment.room_number || 'N/A'}</small>
                    </td>
                    <td className="text-capitalize">{payment.payment_method}</td>
                    <td className="fw-bold text-primary">{formatCurrency(payment.amount)}</td>
                    <td className="px-4">
                      <span className={`status-badge ${payment.payment_status === 'completed' ? 'success' : payment.payment_status === 'refunded' ? 'secondary' : 'warning'}`}>
                        {payment.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPayments;

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllPayments, refundPayment } from '../../services/paymentService';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    try {
      const response = await getAllPayments();
      setPayments(response.data?.data?.payments || []);
    } catch (err) {
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const handleRefund = async (id) => {
    if (!window.confirm('Issue refund for this payment?')) return;
    setError('');
    try {
      await refundPayment(id);
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.message || 'Refund failed.');
    }
  };

  return (
    <AdminLayout title="Manage Payments">
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>ID</th><th>Guest</th><th>Hotel</th><th>Amount</th><th>Method</th><th>Status</th><th>Reference</th><th>Action</th></tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No payments found</td></tr>
                ) : payments.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{p.first_name} {p.last_name}</td>
                    <td>{p.hotel_name}</td>
                    <td className="fw-bold">LKR {Number(p.amount).toLocaleString()}</td>
                    <td className="text-capitalize">{p.payment_method}</td>
                    <td><span className={`badge bg-${p.payment_status === 'completed' ? 'success' : p.payment_status === 'refunded' ? 'warning' : 'secondary'}`}>{p.payment_status}</span></td>
                    <td><small>{p.transaction_reference}</small></td>
                    <td>
                      {p.payment_status === 'completed' && (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => handleRefund(p.id)}>Refund</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPayments;

import React, { useEffect, useCallback, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllBookings, updateBookingStatus, cleanupExpiredBookings, updateBookingRefund } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Refund tracking modal state
  const [selectedRefundBooking, setSelectedRefundBooking] = useState(null);
  const [refundStatus, setRefundStatus] = useState('');
  const [refundRef, setRefundRef] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `booking_status=${statusFilter}` : '';
      const response = await getAllBookings(params);
      setBookings(response.data?.data?.bookings || []);
    } catch (err) {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    setActionMessage('');
    try {
      await updateBookingStatus(id, status);
      setActionMessage('Booking status updated successfully.');
      await fetchBookings();
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to update booking status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCleanupExpired = async () => {
    setActionMessage('');
    try {
      const res = await cleanupExpiredBookings();
      setActionMessage(res.data?.message || 'Expired bookings cleaned up.');
      await fetchBookings();
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to clean up expired bookings.');
    }
  };

  const handleRefundSubmit = async () => {
    if (!selectedRefundBooking) return;
    setActionMessage('');
    try {
      await updateBookingRefund(selectedRefundBooking.id, {
        refund_status: refundStatus,
        refund_provider_reference: refundRef,
        refund_notes: refundNotes
      });
      setActionMessage('Refund status updated successfully.');
      setSelectedRefundBooking(null);
      await fetchBookings();
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to update refund status.');
    }
  };

  return (
    <AdminLayout title="Manage Bookings">
      {error && <div className="alert alert-danger">{error}</div>}
      {actionMessage && <div className="alert alert-info">{actionMessage}</div>}

      <div className="d-flex justify-content-between mb-3">
        <select className="form-select w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
          <option value="expired">Expired</option>
          <option value="refunded">Refunded</option>
          <option value="completed">Completed</option>
        </select>
        <button className="btn btn-warning" onClick={handleCleanupExpired}>
          Cleanup Expired Bookings
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>ID</th><th>Guest</th><th>Hotel</th><th>Room</th><th>Check-In</th><th>Check-Out</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted py-4">No bookings found</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td>{b.first_name} {b.last_name}</td>
                    <td>{b.hotel_name}</td>
                    <td>{b.room_number}</td>
                    <td>{new Date(b.check_in).toLocaleDateString()}</td>
                    <td>{new Date(b.check_out).toLocaleDateString()}</td>
                    <td className="fw-bold">{formatCurrency(b.total_price)}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={b.booking_status}
                        disabled={updatingId === b.id}
                        onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                        <option value="expired">Expired</option>
                        <option value="refunded">Refunded</option>
                        <option value="completed">Completed</option>
                      </select>
                      {b.refund_status && b.refund_status !== 'not_required' && (
                        <button
                          type="button"
                          className={`badge border-0 w-100 mt-1 d-block py-2 text-capitalize text-wrap ${
                            b.refund_status === 'required' ? 'bg-warning text-dark' :
                            b.refund_status === 'processing' ? 'bg-info text-dark' :
                            b.refund_status === 'completed' ? 'bg-success text-white' :
                            b.refund_status === 'rejected' ? 'bg-secondary text-white' :
                            'bg-danger text-white'
                          }`}
                          onClick={() => {
                            setSelectedRefundBooking(b);
                            setRefundStatus(b.refund_status);
                            setRefundRef(b.refund_provider_reference || '');
                            setRefundNotes(b.refund_notes || '');
                          }}
                        >
                          <i className="bi bi-pencil-square me-1"></i>
                          Refund: {b.refund_status}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedRefundBooking && (
        <div className="modal-backdrop fade show" style={{ zIndex: 1040, backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1050, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflowY: 'auto' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content premium-card border-0 p-4 shadow-lg text-dark">
                <div className="modal-header border-0 pb-0">
                  <h4 className="modal-title font-serif fw-bold text-primary">Update Refund Details</h4>
                  <button type="button" className="btn-close" onClick={() => setSelectedRefundBooking(null)}></button>
                </div>
                <div className="modal-body py-4">
                  {selectedRefundBooking.cancellation_reason && (
                    <div className="mb-3 bg-light p-3 rounded">
                      <label className="form-label fw-semibold mb-1 text-muted small">Customer Cancellation Reason</label>
                      <p className="mb-0 text-dark small">{selectedRefundBooking.cancellation_reason}</p>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Refund Status</label>
                    <select
                      className="form-select"
                      value={refundStatus}
                      onChange={(e) => setRefundStatus(e.target.value)}
                    >
                      <option value="required">Required / Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Provider Reference</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Stripe refund ID, re_12345"
                      value={refundRef}
                      onChange={(e) => setRefundRef(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Admin Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Enter notes about this refund..."
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0 d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setSelectedRefundBooking(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary rounded-pill px-4" onClick={handleRefundSubmit}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBookings;

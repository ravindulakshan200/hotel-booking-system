import React, { useEffect, useCallback, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllBookings, updateBookingStatus, cleanupExpiredBookings } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

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
                      {b.refund_status === 'required' && (
                        <div className="badge bg-warning text-dark w-100 mt-1">
                          <i className="bi bi-clock-history me-1"></i> Refund Pending
                        </div>
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

export default AdminBookings;

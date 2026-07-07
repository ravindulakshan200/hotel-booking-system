import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllBookings } from '../../services/adminService';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `booking_status=${statusFilter}` : '';
      const response = await getAllBookings(params);
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  return (
    <AdminLayout title="Manage Bookings">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <select className="form-select w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>ID</th><th>User ID</th><th>Room ID</th><th>Check-In</th><th>Check-Out</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-muted py-4">No bookings found</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td>{b.user_id}</td>
                    <td>{b.room_id}</td>
                    <td>{new Date(b.check_in).toLocaleDateString()}</td>
                    <td>{new Date(b.check_out).toLocaleDateString()}</td>
                    <td>${b.total_price}</td>
                    <td><span className={`badge bg-${b.booking_status === 'confirmed' ? 'success' : b.booking_status === 'pending' ? 'warning' : b.booking_status === 'cancelled' ? 'danger' : 'secondary'}`}>{b.booking_status}</span></td>
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

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMyBookings, cancelBooking } from '../services/bookingService';

const MyBookings = () => {
  const location = useLocation();
  const successMessage = location.state?.message;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchBookings = async () => {
    try {
      const response = await getMyBookings();
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setActionError('');
    try {
      await cancelBooking(id);
      fetchBookings(); // refresh list
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  if (loading) return <div className="container mt-5"><LoadingSpinner message="Loading your bookings..." /></div>;
  if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-5">
      {successMessage && <div className="alert alert-success alert-dismissible fade show">{successMessage}</div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}
      
      <h2 className="mb-4">My Bookings</h2>
      {bookings.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <h4 className="fw-bold">No bookings yet</h4>
            <p className="text-muted mb-0">Start exploring hotels and make your first reservation.</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Booking ID</th>
                <th>Hotel</th>
                <th>Room</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Total Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td>#{booking.id}</td>
                  <td>{booking.hotel_name || 'N/A'}</td>
                  <td>{booking.room_number || booking.room_id}</td>
                  <td>{new Date(booking.check_in).toLocaleDateString()}</td>
                  <td>{new Date(booking.check_out).toLocaleDateString()}</td>
                  <td>${booking.total_price}</td>
                  <td>
                    <span className={`badge bg-${booking.booking_status === 'confirmed' ? 'success' : booking.booking_status === 'cancelled' ? 'danger' : 'secondary'}`}>
                      {booking.booking_status}
                    </span>
                  </td>
                  <td>
                    {booking.booking_status !== 'cancelled' && booking.booking_status !== 'completed' && (
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleCancel(booking.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyBookings;

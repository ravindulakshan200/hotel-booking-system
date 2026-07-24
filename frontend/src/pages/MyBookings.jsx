import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMyBookings, cancelBooking } from '../services/bookingService';
import { formatCurrency } from '../utils/formatters';

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
      setBookings(response.data?.data?.bookings || []);
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
    if (!window.confirm("Cancel this booking? Any completed demo payment will be marked as refunded.")) return;
    setActionError('');
    try {
      await cancelBooking(id);
      fetchBookings(); // refresh list
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  if (loading) return <div className="container py-5"><LoadingSpinner message="Loading your bookings..." /></div>;
  if (error) return <div className="container py-5 alert alert-danger glass-card p-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>;

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="container py-5">
        {successMessage && <div className="alert alert-success alert-dismissible fade show slide-up"><i className="bi bi-check-circle-fill me-2"></i>{successMessage}</div>}
        {actionError && <div className="alert alert-danger slide-up"><i className="bi bi-exclamation-triangle-fill me-2"></i>{actionError}</div>}

        <div className="d-flex justify-content-between align-items-end mb-4 slide-up">
          <div>
            <h1 className="font-serif fw-bold text-primary mb-1">My Bookings</h1>
            <p className="text-muted mb-0">Manage your upcoming and past stays.</p>
          </div>
          <Link to="/hotels" className="btn btn-outline-primary d-none d-md-inline-block rounded-pill">Book Another Stay</Link>
        </div>

        {bookings.length === 0 ? (
          <div className="glass-card slide-up delay-100 p-5 text-center my-4">
            <div className="mb-4 text-muted" style={{ fontSize: '4rem' }}><i className="bi bi-calendar-x"></i></div>
            <h3 className="font-serif fw-bold text-primary mb-3">No bookings yet</h3>
            <p className="text-muted mb-4 fs-5">Start exploring our premium destinations and make your first reservation.</p>
            <Link to="/hotels" className="btn btn-primary btn-lg px-5 rounded-pill">Explore Hotels</Link>
          </div>
        ) : (
          <div className="premium-card slide-up delay-100 border-0 p-0 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'collapse' }}>
                <thead className="bg-light text-muted">
                  <tr>
                    <th className="py-4 ps-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Booking ID</th>
                    <th className="py-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Hotel</th>
                    <th className="py-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Room</th>
                    <th className="py-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Dates</th>
                    <th className="py-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Total Price</th>
                    <th className="py-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Status</th>
                    <th className="py-4 pe-4 border-bottom-0 text-uppercase text-end" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="ps-4 py-3 text-muted">#{booking.id}</td>
                      <td className="py-3">
                        <span className="fw-bold text-primary d-block">{booking.hotel_name || 'N/A'}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-muted">Room {booking.room_number || booking.room_id}</span>
                      </td>
                      <td className="py-3">
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                          <div><i className="bi bi-box-arrow-in-right text-success me-1"></i> {new Date(booking.check_in).toLocaleDateString()}</div>
                          <div><i className="bi bi-box-arrow-right text-danger me-1"></i> {new Date(booking.check_out).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="py-3 fw-bold text-accent">{formatCurrency(booking.total_price)}</td>
                      <td className="py-3">
                        <span className={`status-badge ${booking.booking_status === 'confirmed' ? 'success' : booking.booking_status === 'cancelled' ? 'danger' : 'info'}`}>
                          {booking.booking_status}
                        </span>
                      </td>
                      <td className="pe-4 py-3 text-end">
                        {booking.booking_status !== 'cancelled' && booking.booking_status !== 'completed' ? (
                          <button className="btn btn-sm btn-outline-danger px-3 rounded-pill" onClick={() => handleCancel(booking.id)}>
                            Cancel
                          </button>
                        ) : booking.booking_status === 'completed' ? (
                          <Link to={`/hotels/${booking.hotel_id}`} className="btn btn-sm btn-outline-primary px-3 rounded-pill">
                            Leave Review
                          </Link>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;

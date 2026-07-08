import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createBooking } from '../services/bookingService';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;
  const hotel = location.state?.hotel;

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!room) {
      navigate('/hotels'); // redirect if accessed directly without state
    }
  }, [room, navigate]);

  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (end > start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setTotalNights(diffDays);
        setTotalPrice(diffDays * room.price_per_night);
      } else {
        setTotalNights(0);
        setTotalPrice(0);
      }
    } else {
      setTotalNights(0);
      setTotalPrice(0);
    }
  }, [checkIn, checkOut, room]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    setLoading(true);
    try {
      await createBooking({
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut
      });
      navigate('/my-bookings', { state: { message: 'Booking successful!' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };

  if (!room) return null;

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="container py-5 mt-4">
        <h1 className="font-serif fw-bold mb-5 text-center text-primary">Complete Your Booking</h1>
        
        <div className="row justify-content-center g-4">
          {/* Booking Form */}
          <div className="col-lg-7">
            <div className="modern-card p-5 slide-up">
              <h3 className="font-serif fw-bold text-primary mb-4 border-bottom pb-3">Guest Details & Dates</h3>
              
              {error && <div className="alert alert-danger mb-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Check-in Date</label>
                    <input 
                      type="date" 
                      className="form-control form-control-lg" 
                      required
                      value={checkIn}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mt-3 mt-md-0">
                    <label className="form-label">Check-out Date</label>
                    <input 
                      type="date" 
                      className="form-control form-control-lg" 
                      required
                      value={checkOut}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>

                <div className="alert alert-info bg-light border-0 mb-5 rounded" style={{ padding: '1.5rem' }}>
                  <h5 className="fw-bold mb-2 text-primary"><i className="bi bi-info-circle-fill me-2"></i> Important Information</h5>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>Check-in time is 3:00 PM and check-out is 11:00 AM. Please contact the hotel if you plan to arrive after 8:00 PM.</p>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-5 pt-3 border-top">
                  <Link to={hotel ? `/hotels/${hotel.id}` : '/hotels'} className="btn btn-outline-primary px-4">
                    <i className="bi bi-arrow-left me-2"></i>Go Back
                  </Link>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg px-5"
                    disabled={loading || totalNights === 0}
                  >
                    {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                    {loading ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="col-lg-4">
            <div className="modern-card bg-primary text-white p-4 sticky-top slide-up delay-100" style={{ top: '100px' }}>
              <h4 className="font-serif fw-bold mb-4 text-accent border-bottom border-light pb-3">Booking Summary</h4>
              
              <div className="mb-4">
                <h5 className="fw-bold mb-1">{hotel ? hotel.name : 'Selected Hotel'}</h5>
                {hotel && <p className="opacity-75 fs-6 mb-0"><i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}</p>}
              </div>

              <div className="bg-white text-dark rounded p-3 mb-4">
                <h6 className="fw-bold text-primary mb-2">Room Details</h6>
                <p className="mb-1 d-flex justify-content-between"><span>Room No:</span> <strong>{room.room_number}</strong></p>
                <p className="mb-1 d-flex justify-content-between"><span>Type:</span> <strong className="text-capitalize">{room.room_type}</strong></p>
                <p className="mb-0 d-flex justify-content-between"><span>Price/Night:</span> <strong>${room.price_per_night}</strong></p>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="opacity-75">Total Nights</span>
                <span className="fw-bold">{totalNights}</span>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                <span className="fs-5 opacity-75">Total Price</span>
                <span className="fs-2 fw-bold text-accent">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;

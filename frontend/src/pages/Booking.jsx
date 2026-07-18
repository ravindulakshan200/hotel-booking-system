import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { checkoutBooking } from '../services/bookingService';
import { formatCurrency } from '../utils/formatters';
import { getLocalDateInputValue } from '../utils/dates';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;
  const hotel = location.state?.hotel;

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const today = getLocalDateInputValue();

  useEffect(() => {
    if (!room) {
      navigate('/hotels');
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
      await checkoutBooking({
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut,
        payment_method: paymentMethod,
      });

      navigate('/my-bookings', {
        state: { message: 'Demo booking confirmed successfully. No real payment was processed.' },
      });

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to process booking and payment.');
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
          <div className="col-lg-7">
            <div className="booking-form-card premium-card p-5 slide-up shadow-sm">
              <h3 className="font-serif fw-bold text-primary mb-4 border-bottom pb-3">Guest Details & Dates</h3>

              {error && <div className="alert alert-danger mb-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Check-in Date</label>
                    <input type="date" className="form-control form-control-lg bg-light" required value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} />
                  </div>
                  <div className="col-md-6 mt-3 mt-md-0">
                    <label className="form-label fw-semibold">Check-out Date</label>
                    <input type="date" className="form-control form-control-lg bg-light" required value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} />
                  </div>
                </div>

                <h4 className="font-serif fw-bold text-primary mb-3 mt-5">Demo Payment Method</h4>
                <div className="row g-3 mb-5">
                  {['card', 'online', 'cash'].map((method) => (
                    <div className="col-md-4" key={method}>
                      <div className={`payment-option ${paymentMethod === method ? 'selected' : ''}`} onClick={() => setPaymentMethod(method)}>
                        <i className={`bi fs-3 mb-2 d-block ${method === 'card' ? 'bi-credit-card' : method === 'online' ? 'bi-globe2' : 'bi-cash-stack'} ${paymentMethod === method ? 'text-accent' : 'text-muted'}`}></i>
                        <span className="fw-semibold text-capitalize">{method}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="alert alert-info bg-light border-0 mb-5 rounded" style={{ padding: '1.5rem' }}>
                  <h5 className="fw-bold mb-2 text-primary"><i className="bi bi-info-circle me-2"></i> Portfolio Demo Checkout</h5>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                    This project does not collect card details or process real money. The selected method is stored only as demo booking data.
                  </p>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-5 pt-3 border-top">
                  <Link to={hotel ? `/hotels/${hotel.id}` : '/hotels'} className="btn btn-outline-primary px-4 rounded-pill">
                    <i className="bi bi-arrow-left me-2"></i>Go Back
                  </Link>
                  <button type="submit" className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm" disabled={loading || totalNights === 0}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                    {loading ? 'Confirming...' : 'Confirm Demo Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="booking-summary-card p-4 sticky-top slide-up delay-100" style={{ top: '100px' }}>
              <h4 className="font-serif fw-bold mb-4 text-accent border-bottom border-light pb-3">Booking Summary</h4>

              <div className="mb-4">
                <h5 className="fw-bold mb-1">{hotel ? hotel.name : 'Selected Hotel'}</h5>
                {hotel && <p className="opacity-75 fs-6 mb-0"><i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}, Sri Lanka</p>}
              </div>

              <div className="bg-white text-dark rounded p-3 mb-4 shadow-sm">
                <h6 className="fw-bold text-primary mb-3">Room Details</h6>
                <p className="mb-2 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Room No</span>
                  <strong className="fs-5">{room.room_number}</strong>
                </p>
                <p className="mb-2 d-flex justify-content-between">
                  <span className="text-muted">Type</span>
                  <strong className="text-capitalize">{room.room_type}</strong>
                </p>
                <p className="mb-0 d-flex justify-content-between">
                  <span className="text-muted">Price per Night</span>
                  <strong>{formatCurrency(room.price_per_night)}</strong>
                </p>
              </div>

              <div className="d-flex justify-content-between mb-2 fs-5">
                <span className="opacity-90">Total Nights</span>
                <span className="fw-bold">{totalNights}</span>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                <span className="fs-5 opacity-90">Total Price</span>
                <span className="fs-2 fw-bold text-accent font-serif">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;

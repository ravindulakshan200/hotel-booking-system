import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import { checkoutBooking, createBooking } from '../services/bookingService';
import { createCheckoutSession, getPaymentConfig } from '../services/paymentService';
import { getRoomAvailability } from '../services/roomService';
import { validatePromoCode } from '../services/promoService';
import { formatCurrency } from '../utils/formatters';
import { getLocalDateInputValue } from '../utils/dates';

// Room Availability Calendar component (Phase 7C)
const RoomAvailabilityCalendar = ({ roomId }) => {
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAvailability = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getRoomAvailability(roomId, year, month);
      const body = response.data;
      if (body?.success && Array.isArray(body?.data?.unavailable_dates)) {
        setUnavailableDates(body.data.unavailable_dates);
      } else {
        setError(body?.message || 'Failed to load availability.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) fetchAvailability();
  }, [roomId, year, month]);

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ day: '', dateStr: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const isBooked = unavailableDates.includes(dateStr);
    days.push({ day: d, dateStr, isBooked });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="card glass-card p-3 mb-4 mt-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-bold mb-0 text-primary" style={{ fontSize: '0.86rem' }}><i className="bi bi-calendar3 me-2 text-accent"></i>Availability Status</h6>
        <div className="d-flex gap-1 align-items-center">
          <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2 rounded-circle" style={{ width: '22px', height: '22px', fontSize: '0.74rem' }} onClick={prevMonth}>&lt;</button>
          <span className="small fw-bold px-1" style={{ fontSize: '0.74rem' }}>{monthNames[month - 1].substring(0,3)} {year}</span>
          <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2 rounded-circle" style={{ width: '22px', height: '22px', fontSize: '0.74rem' }} onClick={nextMonth}>&gt;</button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-2">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span className="ms-2 text-muted small">Checking dates...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-warning py-1 px-2 small d-flex justify-content-between align-items-center mb-0">
          <span style={{ fontSize: '0.75rem' }}>{error}</span>
          <button
            onClick={fetchAvailability}
            className="btn btn-link btn-sm px-2 py-1 ms-2 fw-semibold text-accent text-decoration-none"
            aria-label="Retry loading availability status"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="d-grid text-center small text-muted mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="fw-bold text-primary" style={{ fontSize: '0.7rem' }}>{day}</div>
          ))}

        {days.map((item, idx) => {
          if (item.day === '') {
            return <div key={idx} style={{ height: '24px' }}></div>;
          }
          return (
            <div
              key={idx}
              className="rounded d-flex align-items-center justify-content-center fw-bold"
              style={{
                height: '24px',
                fontSize: '0.74rem',
                backgroundColor: item.isBooked ? 'rgba(220, 53, 69, 0.15)' : 'rgba(25, 135, 84, 0.12)',
                color: item.isBooked ? 'var(--bs-danger)' : 'var(--bs-success)',
                border: item.isBooked ? '1px solid rgba(220, 53, 69, 0.25)' : '1px solid rgba(25, 135, 84, 0.2)'
              }}
              title={item.isBooked ? 'Booked' : 'Available'}
            >
              {item.day}
            </div>
          );
        })}
        </div>
      )}
      <div className="d-flex justify-content-center gap-3" style={{ fontSize: '0.68rem' }}>
        <div><span className="badge bg-success me-1" style={{ width: '6px', height: '6px', display: 'inline-block' }}></span>Available</div>
        <div><span className="badge bg-danger me-1" style={{ width: '6px', height: '6px', display: 'inline-block' }}></span>Booked</div>
      </div>
    </div>
  );
};

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;
  const hotel = location.state?.hotel;

  const [checkIn, setCheckIn] = useState(location.state?.checkIn || '');
  const [checkOut, setCheckOut] = useState(location.state?.checkOut || '');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [totalNights, setTotalNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const today = getLocalDateInputValue();

  useEffect(() => {
    if (!room) {
      navigate('/hotels');
    }
  }, [room, navigate]);

  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [demoPaymentsEnabled, setDemoPaymentsEnabled] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await getPaymentConfig();
        const configData = res.data?.data || {};
        const sEnabled = configData.stripeEnabled;
        const dEnabled = configData.demoPaymentsEnabled;
        setStripeEnabled(sEnabled);
        setDemoPaymentsEnabled(dEnabled);

        if (!sEnabled && paymentMethod === 'card') {
          setPaymentMethod(dEnabled ? 'online' : 'card');
        } else if (!dEnabled && paymentMethod !== 'card') {
          setPaymentMethod(sEnabled ? 'card' : 'online');
        }
      } catch (err) {
        console.error("Failed to fetch payment config", err);
        setPaymentMethod('online');
      }
    };
    fetchConfig();
  }, []);

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

  useEffect(() => {
    if (appliedPromo) {
      setAppliedPromo(null);
      setPromoSuccess('');
      setPromoError('Dates changed. Please re-apply promo code.');
    }
  }, [totalPrice]);

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoSuccess('');
    try {
      const res = await validatePromoCode(promoCode, totalPrice);
      const data = res.data.data;
      setAppliedPromo(data);
      setPromoSuccess(`Promo code applied! Saved LKR ${data.discount_amount}`);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Failed to validate promo code.');
      setAppliedPromo(null);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoSuccess('');
    setPromoError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'card') {
        // Create pending booking
        const bookingRes = await createBooking({
          room_id: room.id,
          check_in: checkIn,
          check_out: checkOut,
          promo_code: appliedPromo ? appliedPromo.code : undefined
        });
        const bookingId = bookingRes.data.data.booking.id;

        // Get Stripe session and redirect
        const sessionRes = await createCheckoutSession(bookingId);
        if (!sessionRes.data?.data?.url) {
          throw new Error('Failed to initiate secure checkout. Please try again.');
        }
        window.location.href = sessionRes.data.data.url;
        return; // Redirecting to Stripe, so stop execution
      } else {
        // Proceed with demo checkout for cash/online
        await checkoutBooking({
          room_id: room.id,
          check_in: checkIn,
          check_out: checkOut,
          payment_method: paymentMethod,
          promo_code: appliedPromo ? appliedPromo.code : undefined
        });

        navigate('/my-bookings', {
          state: { message: 'Demo booking confirmed successfully. No real payment was processed.' },
        });
      }
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
                    <input type="date" className="form-control form-control-lg bg-light" required value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} disabled={loading} />
                  </div>
                  <div className="col-md-6 mt-3 mt-md-0">
                    <label className="form-label fw-semibold">Check-out Date</label>
                    <input type="date" className="form-control form-control-lg bg-light" required value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} disabled={loading} />
                  </div>
                </div>

                {/* Promo Code Input */}
                <h4 className="font-serif fw-bold text-primary mb-3 mt-5">Promo Code</h4>
                <div className="row g-3 align-items-center mb-4">
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control form-control-lg bg-light"
                      placeholder="Enter promo code (e.g. SAVE10)"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError('');
                        setPromoSuccess('');
                      }}
                      disabled={loading || !!appliedPromo}
                    />
                  </div>
                  <div className="col-sm-4">
                    {appliedPromo ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-lg w-100 rounded-pill"
                        onClick={handleRemovePromo}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-lg w-100 rounded-pill"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || totalNights === 0}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
                {promoError && <div className="text-danger mb-4 small"><i className="bi bi-exclamation-circle me-1"></i>{promoError}</div>}
                {promoSuccess && <div className="text-success mb-4 small"><i className="bi bi-check-circle me-1"></i>{promoSuccess}</div>}

                <h4 className="font-serif fw-bold text-primary mb-3 mt-5">
                  {demoPaymentsEnabled ? 'Demo Payment Method' : 'Payment Method'}
                </h4>
                <div className="row g-3 mb-5">
                  {['card', 'online', 'cash'].map((method) => {
                    if (method === 'card' && !stripeEnabled) return null;
                    if (method !== 'card' && !demoPaymentsEnabled) return null;
                    return (
                    <div className="col-md-4" key={method}>
                      <div className={`payment-option ${paymentMethod === method ? 'selected' : ''}`} onClick={() => setPaymentMethod(method)}>
                        <i className={`bi fs-3 mb-2 d-block ${method === 'card' ? 'bi-credit-card' : method === 'online' ? 'bi-globe2' : 'bi-cash-stack'} ${paymentMethod === method ? 'text-accent' : 'text-muted'}`}></i>
                        <span className="fw-semibold text-capitalize">{method}</span>
                      </div>
                    </div>
                  )})}
                </div>

                {(!stripeEnabled && !demoPaymentsEnabled) ? (
                   <div className="alert alert-secondary mb-5 rounded text-muted">
                     <i className="bi bi-info-circle me-2"></i>
                     Online payments are currently unavailable. Please contact the hotel directly to arrange your booking.
                   </div>
                ) : (
                  <div className="alert alert-info bg-light border-0 mb-5 rounded" style={{ padding: '1.5rem' }}>
                    <h5 className="fw-bold mb-2 text-primary">
                      <i className="bi bi-info-circle me-2"></i>
                      {paymentMethod === 'card' ? 'Secure Payment with Stripe' : (demoPaymentsEnabled ? 'Demo Checkout' : 'Checkout')}
                    </h5>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                      {paymentMethod === 'card'
                        ? 'You will be redirected to Stripe to complete your secure payment. (Use Stripe test cards for demo).'
                        : 'This project does not collect actual payment details for cash/online. The selected method is stored only as demo booking data.'}
                    </p>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center mt-5 pt-3 border-top">
                  <Link to={hotel ? `/hotels/${hotel.id}` : '/hotels'} className="btn btn-outline-primary px-4 rounded-pill">
                    <i className="bi bi-arrow-left me-2"></i>Go Back
                  </Link>
                  <button type="submit" className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm" disabled={loading || totalNights === 0 || totalPrice <= 0 || (!stripeEnabled && !demoPaymentsEnabled)}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                    {loading ? 'Processing...' : paymentMethod === 'card' ? 'Pay with Card' : (demoPaymentsEnabled ? 'Confirm Demo Booking' : 'Confirm Booking')}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="booking-summary-card p-4 sticky-top slide-up delay-100" style={{ top: '100px' }}>
              <h4 className="font-serif fw-bold mb-4 text-accent border-bottom border-light pb-3">Booking Summary</h4>

              <div className="mb-4">
                <h5 className="fw-bold mb-1 text-white">{hotel ? hotel.name : 'Selected Hotel'}</h5>
                {hotel && <p className="opacity-75 fs-6 mb-0 text-white"><i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}, Sri Lanka</p>}
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

              {appliedPromo && (
                <>
                  <div className="d-flex justify-content-between mb-2 fs-6 opacity-75">
                    <span>Original Price</span>
                    <span className="text-decoration-line-through">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 fs-6 text-warning">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-{formatCurrency(Number(appliedPromo.discount_amount))}</span>
                  </div>
                </>
              )}

              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                <span className="fs-5 opacity-90">Total Price</span>
                <span className="fs-2 fw-bold text-accent font-serif">
                  {formatCurrency(appliedPromo ? Number(appliedPromo.final_amount) : totalPrice)}
                </span>
              </div>
            </div>
            <RoomAvailabilityCalendar roomId={room.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;

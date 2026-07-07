import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createBooking } from '../services/bookingService';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;

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
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Complete Your Booking</h2>
              
              <div className="mb-4 p-3 bg-light rounded">
                <h5>Room Information</h5>
                <p className="mb-1"><strong>Room Number:</strong> {room.room_number}</p>
                <p className="mb-1"><strong>Type:</strong> <span className="text-capitalize">{room.room_type}</span></p>
                <p className="mb-0"><strong>Price per night:</strong> ${room.price_per_night}</p>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Check-in Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      required
                      value={checkIn}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Check-out Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      required
                      value={checkOut}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <h5>Booking Summary</h5>
                  <ul className="list-group">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Total Nights
                      <span>{totalNights}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center fw-bold">
                      Total Price
                      <span>${totalPrice.toFixed(2)}</span>
                    </li>
                  </ul>
                </div>

                <div className="d-flex justify-content-between">
                  <Link to={`/hotels/${room.hotel_id}`} className="btn btn-secondary">Cancel</Link>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || totalNights === 0}
                  >
                    {loading ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHotelById } from '../services/hotelService';
import { getRoomsByHotel } from '../services/roomService';

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleBookNow = (room) => {
    navigate('/book', { state: { room, hotel } });
  };
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelResponse, roomsResponse] = await Promise.all([
          getHotelById(id),
          getRoomsByHotel(id)
        ]);
        setHotel(hotelResponse.data.hotel);
        setRooms(roomsResponse.data.rooms || []);
      } catch (err) {
        setError('Failed to fetch hotel details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
    </div>
  );
  if (error) return <div className="container mt-5 alert alert-danger glass-card p-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>;
  if (!hotel) return <div className="container mt-5 glass-card p-5 text-center"><h4>Hotel not found</h4></div>;

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Hotel Hero Section */}
      <div className="hotel-details-hero" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80)` }}>
        <div className="container hotel-details-content slide-up">
          <div className="d-flex align-items-center mb-2">
            <span className="badge bg-accent text-white me-3 px-3 py-2 shadow-sm" style={{ fontSize: '1rem' }}>★ 4.8 Rating</span>
            <span className="text-white opacity-75 fs-5"><i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}</span>
          </div>
          <h1 className="display-3 font-serif fw-bold mb-3">{hotel.name}</h1>
          <p className="lead fs-4 opacity-75 mb-0"><i className="bi bi-geo-fill me-2"></i>{hotel.address}</p>
        </div>
      </div>

      <div className="container mt-n5 position-relative z-index-2 slide-up delay-100 mb-5">
        <div className="row g-5">
          {/* Hotel Info Overview */}
          <div className="col-lg-8">
            <div className="modern-card p-5 mb-5">
              <h3 className="font-serif fw-bold text-primary mb-4 border-bottom pb-3">About This Property</h3>
              <p className="lead text-muted" style={{ lineHeight: '1.8' }}>{hotel.description}</p>
              
              <div className="row mt-5 g-4">
                <div className="col-sm-4">
                  <div className="d-flex align-items-center text-primary">
                    <i className="bi bi-wifi fs-2 me-3"></i>
                    <span className="fw-bold fs-5">Free WiFi</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="d-flex align-items-center text-primary">
                    <i className="bi bi-cup-hot-fill fs-2 me-3"></i>
                    <span className="fw-bold fs-5">Breakfast</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="d-flex align-items-center text-primary">
                    <i className="bi bi-water fs-2 me-3"></i>
                    <span className="fw-bold fs-5">Pool</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms List */}
            <h3 className="font-serif fw-bold text-primary mb-4 d-flex align-items-center">
              <i className="bi bi-door-open-fill me-2"></i> Available Rooms
            </h3>
            
            {rooms.length === 0 ? (
              <div className="glass-card p-5 text-center">
                <h5 className="text-muted font-serif">No rooms available for this hotel at the moment.</h5>
              </div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {rooms.map((room, index) => (
                  <div key={room.id} className="modern-card hover-lift p-0 d-flex flex-column flex-md-row slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="bg-light" style={{ width: '100%', minHeight: '200px', backgroundImage: 'url(https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {/* Optional: Add Room Image placeholder */}
                    </div>
                    <div className="p-4 d-flex flex-column w-100">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h4 className="fw-bold text-primary font-serif mb-0">Room {room.room_number}</h4>
                        <span className={`status-badge ${room.availability_status === 'available' ? 'success' : 'danger'}`}>
                          {room.availability_status}
                        </span>
                      </div>
                      <p className="text-muted text-capitalize mb-3 fs-5 border-bottom pb-2">{room.room_type} Room</p>
                      
                      <div className="d-flex justify-content-between align-items-end mt-auto pt-3">
                        <div>
                          <span className="fs-6 text-muted d-block">Price per night</span>
                          <span className="fs-3 fw-bold text-accent">${room.price_per_night}</span>
                        </div>
                        <button 
                          className="btn btn-primary px-4 btn-lg" 
                          disabled={room.availability_status !== 'available'}
                          onClick={() => handleBookNow(room)}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar / Quick Info */}
          <div className="col-lg-4">
            <div className="modern-card p-4 bg-primary text-white sticky-top" style={{ top: '100px' }}>
              <h4 className="font-serif fw-bold mb-4">Location</h4>
              <div className="rounded bg-white mb-4" style={{ height: '200px', opacity: '0.8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-muted fw-bold">Map Placeholder</span>
              </div>
              <ul className="list-unstyled mb-0">
                <li className="mb-3 d-flex"><i className="bi bi-geo-alt-fill me-3 text-accent fs-5"></i> <span>{hotel.address}, {hotel.city}</span></li>
                <li className="mb-3 d-flex"><i className="bi bi-telephone-fill me-3 text-accent fs-5"></i> <span>+1 (555) 123-4567</span></li>
                <li className="mb-0 d-flex"><i className="bi bi-envelope-fill me-3 text-accent fs-5"></i> <span>contact@hotelbooking.com</span></li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HotelDetails;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHotelById } from '../services/hotelService';
import { getRoomsByHotel } from '../services/roomService';

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleBookNow = (room) => {
    navigate('/book', { state: { room } });
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

  if (loading) return <div className="container mt-5 text-center">Loading...</div>;
  if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;
  if (!hotel) return <div className="container mt-5">Hotel not found</div>;

  return (
    <div className="container mt-5 mb-5">
      <div className="card shadow mb-5">
        <div className="card-body">
          <h2 className="card-title">{hotel.name}</h2>
          <h5 className="text-muted mb-4">{hotel.address}, {hotel.city}</h5>
          <p className="card-text">{hotel.description}</p>
        </div>
      </div>

      <h3 className="mb-4">Available Rooms</h3>
      {rooms.length === 0 ? (
        <p>No rooms available for this hotel.</p>
      ) : (
        <div className="row">
          {rooms.map(room => (
            <div key={room.id} className="col-md-4 mb-4">
              <div className="card shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">Room {room.room_number}</h5>
                  <p className="card-text mb-1"><strong>Type:</strong> <span className="text-capitalize">{room.room_type}</span></p>
                  <p className="card-text mb-1"><strong>Price:</strong> ${room.price_per_night} / night</p>
                  <p className="card-text mb-3">
                    <strong>Status:</strong>{' '}
                    <span className={`badge bg-${room.availability_status === 'available' ? 'success' : 'secondary'}`}>
                      {room.availability_status}
                    </span>
                  </p>
                  <button 
                    className="btn btn-primary mt-auto" 
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
  );
};

export default HotelDetails;

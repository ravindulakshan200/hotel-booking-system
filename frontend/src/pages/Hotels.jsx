import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHotels } from '../services/hotelService';

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await getHotels();
        setHotels(response.data.hotels || []);
      } catch (err) {
        setError('Failed to fetch hotels');
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  if (loading) return <div className="container mt-5 text-center">Loading...</div>;
  if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Available Hotels</h2>
      <div className="row">
        {hotels.map(hotel => (
          <div key={hotel.id} className="col-md-4 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{hotel.name}</h5>
                <p className="card-text text-muted">{hotel.city}</p>
                <p className="card-text flex-grow-1">{hotel.description?.substring(0, 100)}...</p>
                <Link to={`/hotels/${hotel.id}`} className="btn btn-outline-primary mt-auto">View Details</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hotels;

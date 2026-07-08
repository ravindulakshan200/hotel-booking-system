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

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Page Header */}
      <div className="bg-primary text-white py-5 mb-5 position-relative" style={{ backgroundImage: 'linear-gradient(to right, rgba(11,34,57,0.9), rgba(26,66,110,0.8)), url(https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=2000&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container py-4 text-center position-relative z-index-2">
          <h1 className="font-serif fw-bold display-4 mb-3 text-white">Explore All Destinations</h1>
          <p className="lead opacity-75 mx-auto" style={{ maxWidth: '600px' }}>Discover our complete collection of premium hotels and resorts worldwide.</p>
        </div>
      </div>

      <div className="container pb-5 mb-5">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger glass-card p-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-5 glass-card">
            <h3 className="text-muted font-serif">No hotels available right now.</h3>
          </div>
        ) : (
          <div className="row g-4">
            {hotels.map((hotel, index) => (
              <div key={hotel.id} className="col-md-4 mb-4 slide-up" style={{ animationDelay: `${(index % 6) * 100}ms` }}>
                <div className="modern-card hover-lift h-100 d-flex flex-column">
                  <div 
                    className="image-card-header" 
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1551882547-ff40c0d5b5df?auto=format&fit=crop&w=800&q=80)` }}
                  >
                    <span className="image-card-badge">★ 4.5</span>
                  </div>
                  <div className="card-body d-flex flex-column p-4">
                    <h4 className="card-title fw-bold mb-2 font-serif text-primary">{hotel.name}</h4>
                    <p className="text-accent fw-bold mb-3">
                      <i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}
                    </p>
                    <p className="card-text text-muted flex-grow-1" style={{ fontSize: '0.95rem' }}>
                      {hotel.description?.substring(0, 120)}...
                    </p>
                    <Link to={`/hotels/${hotel.id}`} className="btn btn-outline-primary mt-4 w-100">
                      View Hotel Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hotels;

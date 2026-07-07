import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHotels } from '../services/hotelService';

const Home = () => {
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        const response = await getHotels(searchCity);
        // Show up to 6 hotels for search results
        setFeaturedHotels((response.data.hotels || []).slice(0, 6));
      } catch (err) {
        setError('Failed to load hotels.');
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchHotels();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchCity]);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <h1 className="hero-title">Find Your Perfect Stay</h1>
          <p className="hero-subtitle">Book hotels, rooms and experiences easily</p>
          
          <div className="search-bar-wrapper mt-4 bg-white p-2 rounded-pill shadow-lg mx-auto" style={{ maxWidth: '600px', transition: 'all 0.3s ease' }}>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-white border-0 text-muted rounded-start-pill ps-4 fs-4">📍</span>
              <input 
                type="text" 
                className="form-control border-0 shadow-none fs-5" 
                placeholder="Where are you going? (e.g. New York)" 
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-5 mt-4 mb-5">
        <div className="row g-4 text-center">
          <div className="col-md-4">
            <div className="card feature-card h-100 p-4 shadow-sm">
              <div className="card-body">
                <div className="feature-icon">🏨</div>
                <h4 className="fw-bold">Easy Booking</h4>
                <p className="text-muted">Find and book your ideal room in just a few clicks with our streamlined process.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card feature-card h-100 p-4 shadow-sm">
              <div className="card-body">
                <div className="feature-icon">🏷️</div>
                <h4 className="fw-bold">Best Prices</h4>
                <p className="text-muted">We guarantee the most competitive rates and exclusive deals for our members.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card feature-card h-100 p-4 shadow-sm">
              <div className="card-body">
                <div className="feature-icon">🔒</div>
                <h4 className="fw-bold">Secure Payments</h4>
                <p className="text-muted">Your transactions are protected with industry-leading encryption and security.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Hotels Section */}
      <section className="bg-light py-5">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold">{searchCity ? `Search Results for "${searchCity}"` : "Featured Hotels"}</h2>
            <p className="text-muted">{searchCity ? "Find your perfect match" : "Explore some of our most popular destinations"}</p>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center">{error}</div>
          ) : (
            <div className="row g-4">
              {featuredHotels.map(hotel => (
                <div key={hotel.id} className="col-md-4">
                  <div className="card hotel-card h-100 shadow-sm">
                    {/* Abstract placeholder image to give a premium feel */}
                    <div className="bg-secondary position-relative" style={{ height: '200px', backgroundImage: `url(https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div className="position-absolute top-0 end-0 m-3">
                        <span className="badge bg-light text-dark shadow-sm">★ 4.8</span>
                      </div>
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      <h4 className="card-title fw-bold mb-1">{hotel.name}</h4>
                      <p className="text-primary fw-semibold mb-3"><small>📍 {hotel.city}</small></p>
                      <p className="card-text text-muted flex-grow-1">{hotel.description?.substring(0, 100)}...</p>
                      <Link to={`/hotels/${hotel.id}`} className="btn btn-outline-primary mt-3 w-100 rounded-pill fw-bold">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-5">
            <Link to="/hotels" className="btn btn-primary btn-lg rounded-pill px-5 fw-bold shadow-sm">
              View All Hotels
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

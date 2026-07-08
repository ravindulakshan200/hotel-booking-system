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
    <div className="home-page page-wrapper fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="container hero-content text-center">
          <h1 className="hero-title slide-up">Find Your Perfect Stay</h1>
          <p className="hero-subtitle slide-up delay-100">Experience world-class luxury and comfort in handpicked destinations.</p>
          
          <div className="search-bar-wrapper slide-up delay-200 mt-4">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-geo-alt-fill text-primary"></i>
              </span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Where are you going? (e.g. New York)" 
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-5 slide-up delay-300">
            <Link to="/hotels" className="btn btn-accent btn-lg px-5 mx-2">
              Explore Hotels
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-5 mt-5 mb-5">
        <div className="row g-4 text-center">
          <div className="col-md-4">
            <div className="glass-card h-100 p-5 hover-lift transition-base">
              <div className="mb-4 text-primary" style={{ fontSize: '3rem' }}>🏨</div>
              <h4 className="fw-bold mb-3 font-serif">Easy Booking</h4>
              <p className="text-muted">Find and book your ideal room in just a few clicks with our streamlined, intuitive process.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="glass-card h-100 p-5 hover-lift transition-base">
              <div className="mb-4 text-accent" style={{ fontSize: '3rem' }}>✨</div>
              <h4 className="fw-bold mb-3 font-serif">Premium Experience</h4>
              <p className="text-muted">We guarantee the most competitive rates and exclusive luxury deals for our members.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="glass-card h-100 p-5 hover-lift transition-base">
              <div className="mb-4 text-primary" style={{ fontSize: '3rem' }}>🔒</div>
              <h4 className="fw-bold mb-3 font-serif">Secure Payments</h4>
              <p className="text-muted">Your transactions are protected with industry-leading encryption and top-tier security protocols.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Hotels Section */}
      <section className="py-5" style={{ background: 'var(--color-bg)' }}>
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold font-serif mb-3" style={{ fontSize: '2.5rem' }}>
              {searchCity ? `Search Results for "${searchCity}"` : "Featured Destinations"}
            </h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>
              {searchCity ? "Find your perfect match" : "Explore some of our most popular, highly-rated hotels"}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center glass-card p-4 mx-auto" style={{ maxWidth: '600px' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
            </div>
          ) : (
            <div className="row g-4">
              {featuredHotels.map((hotel, index) => (
                <div key={hotel.id} className="col-md-4 slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="modern-card hover-lift h-100 d-flex flex-column">
                    <div 
                      className="image-card-header" 
                      style={{ backgroundImage: `url(https://images.unsplash.com/photo-1542314831-c53cd45301d5?auto=format&fit=crop&w=800&q=80)` }}
                    >
                      <span className="image-card-badge">★ 4.8</span>
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      <h4 className="card-title fw-bold mb-2 font-serif text-primary">{hotel.name}</h4>
                      <p className="text-accent fw-bold mb-3">
                        <i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}
                      </p>
                      <p className="card-text text-muted flex-grow-1" style={{ fontSize: '0.95rem' }}>
                        {hotel.description?.substring(0, 100)}...
                      </p>
                      <Link to={`/hotels/${hotel.id}`} className="btn btn-outline-primary mt-4 w-100">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-5 pt-3">
            <Link to="/hotels" className="btn btn-primary btn-lg px-5 shadow-sm">
              View All Hotels
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

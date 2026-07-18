import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getHotels } from '../services/hotelService';

const SL_CITIES = ['Colombo', 'Kandy', 'Galle', 'Ella', 'Nuwara Eliya', 'Bentota', 'Mirissa', 'Sigiriya', 'Negombo', 'Anuradhapura'];

// Vary hotel images by index for visual variety
const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c0d5b5df?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
];

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedCity) params.city = selectedCity;
      if (searchInput.trim()) params.search = searchInput.trim();
      const response = await getHotels(params);
      setHotels(response.data?.data?.hotels || []);
    } catch (err) {
      setError('Failed to fetch hotels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHotels();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchHotels]);

  // Sync URL params on filter change
  useEffect(() => {
    const params = {};
    if (selectedCity) params.city = selectedCity;
    if (searchInput.trim()) params.search = searchInput.trim();
    setSearchParams(params, { replace: true });
  }, [selectedCity, searchInput, setSearchParams]);

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedCity('');
  };

  const hasFilters = searchInput.trim() || selectedCity;

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="py-5 position-relative" style={{ backgroundImage: 'linear-gradient(to right, rgba(11,34,57,0.92), rgba(26,66,110,0.75)), url(https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=2000&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container py-4 text-center position-relative">
          <span className="text-accent fw-bold text-uppercase mb-3 d-block" style={{ letterSpacing: '2px', fontSize: '0.8rem' }}>
            🌴 Sri Lanka's Finest
          </span>
          <h1 className="font-serif fw-bold display-4 mb-3 text-white">Explore All Destinations</h1>
          <p className="lead opacity-75 text-white mx-auto" style={{ maxWidth: '600px' }}>
            Discover premium stays along the coast, in the highlands, and around the island's cultural heartlands.
          </p>

          <div className="mt-4 d-flex flex-column flex-md-row gap-3 justify-content-center align-items-center mx-auto" style={{ maxWidth: '700px' }}>
            <div className="input-group flex-grow-1" style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '50px', padding: '0.4rem 1rem', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
              <span className="input-group-text border-0 bg-transparent">
                <i className="bi bi-search text-primary"></i>
              </span>
              <input
                type="text"
                className="form-control border-0 bg-transparent"
                placeholder="Search hotels by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ boxShadow: 'none' }}
              />
            </div>
            <select
              className="form-select"
              style={{ maxWidth: '200px', borderRadius: '50px', padding: '0.75rem 1.25rem', border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.95)', color: 'var(--color-primary)' }}
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">All Cities</option>
              {SL_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="container pb-5 pt-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {hasFilters ? (
              <>
                <span className="text-muted small">Showing results for:</span>
                {selectedCity && (
                  <span className="badge bg-primary rounded-pill px-3 py-2">
                    <i className="bi bi-geo-alt me-1"></i>{selectedCity}
                    <button className="btn-close btn-close-white ms-2" style={{ fontSize: '0.55rem' }} onClick={() => setSelectedCity('')}></button>
                  </span>
                )}
                {searchInput && (
                  <span className="badge bg-secondary rounded-pill px-3 py-2">
                    <i className="bi bi-search me-1"></i>"{searchInput}"
                    <button className="btn-close btn-close-white ms-2" style={{ fontSize: '0.55rem' }} onClick={() => setSearchInput('')}></button>
                  </span>
                )}
                <button className="btn btn-sm btn-link text-danger p-0 ms-2" onClick={handleClearFilters}>
                  Clear all
                </button>
              </>
            ) : (
              <span className="text-muted small">Showing all hotels in Sri Lanka</span>
            )}
          </div>
          {!loading && (
            <span className="badge bg-light text-muted border px-3 py-2">
              {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-3">Finding the best hotels for you...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger glass-card p-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-5 glass-card p-5">
            <div className="mb-4" style={{ fontSize: '4rem' }}>🏨</div>
            <h3 className="font-serif text-primary mb-3">No hotels found</h3>
            <p className="text-muted mb-4">
              {hasFilters ? 'No hotels match your search. Try different filters.' : 'No hotels available right now.'}
            </p>
            {hasFilters && (
              <button className="btn btn-primary px-5" onClick={handleClearFilters}>Show All Hotels</button>
            )}
          </div>
        ) : (
          <div className="row g-4">
            {hotels.map((hotel, index) => (
              <div key={hotel.id} className="col-md-6 col-lg-4 slide-up" style={{ animationDelay: `${(index % 9) * 60}ms` }}>
                <div className="modern-card hover-lift h-100 d-flex flex-column">
                  <div className="image-card-header" style={{ backgroundImage: `url(${HOTEL_IMAGES[index % HOTEL_IMAGES.length]})` }}>
                    <span className="image-card-badge">★ 4.{5 + (index % 5)}</span>
                    <span className="position-absolute bottom-0 start-0 m-3 badge rounded-pill text-white px-3" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                      <i className="bi bi-geo-alt-fill me-1"></i>{hotel.city}
                    </span>
                  </div>
                  <div className="card-body d-flex flex-column p-4">
                    <h5 className="card-title fw-bold mb-2 font-serif text-primary">{hotel.name}</h5>
                    <p className="card-text text-muted flex-grow-1 small" style={{ lineHeight: '1.7' }}>
                      {hotel.description?.substring(0, 120)}{hotel.description?.length > 120 ? '...' : ''}
                    </p>
                    <Link to={`/hotels/${hotel.id}`} className="btn btn-outline-primary mt-3 w-100">
                      <i className="bi bi-arrow-right me-2"></i>View Hotel Details
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

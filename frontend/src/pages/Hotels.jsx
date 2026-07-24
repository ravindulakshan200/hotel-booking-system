import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getHotels, searchAvailability } from '../services/hotelService';
import { formatCurrency } from '../utils/formatters';

const SL_CITIES = ['Colombo', 'Kandy', 'Galle', 'Ella', 'Nuwara Eliya', 'Bentota', 'Mirissa', 'Sigiriya', 'Negombo', 'Anuradhapura'];

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

  // Search Core
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '');

  // Wait for the user to explicitly hit search for dates, so we manage a local form state
  const [formCity, setFormCity] = useState(city);
  const [formCheckIn, setFormCheckIn] = useState(checkIn);
  const [formCheckOut, setFormCheckOut] = useState(checkOut);
  const [formGuests, setFormGuests] = useState(guests || 2);

  // Filters
  const [roomType, setRoomType] = useState(searchParams.get('room_type') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(searchParams.entries());
      let response;
      if (params.check_in && params.check_out && params.guests) {
        response = await searchAvailability(params);
      } else {
        // Drop any filters that getHotels doesn't support if we fall back
        const basicParams = { city: params.city, search: params.search };
        response = await getHotels(basicParams);
      }
      setHotels(response.data?.data?.hotels || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch hotels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);

    // Only search availability if dates are fully provided, else throw error/alert
    if (!formCheckIn || !formCheckOut || !formGuests) {
        alert("Check-in, Check-out, and Guests are required for availability search.");
        return;
    }

    if (formCity) params.set('city', formCity); else params.delete('city');
    params.set('check_in', formCheckIn);
    params.set('check_out', formCheckOut);
    params.set('guests', formGuests);

    setCity(formCity);
    setCheckIn(formCheckIn);
    setCheckOut(formCheckOut);
    setGuests(formGuests);

    setSearchParams(params, { replace: true });
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);

    if (key === 'room_type') setRoomType(value);
    if (key === 'min_price') setMinPrice(value);
    if (key === 'max_price') setMaxPrice(value);
    if (key === 'sort') setSort(value);

    setSearchParams(params, { replace: true });
  };

  const handleClearFilters = () => {
    setFormCity('');
    setFormCheckIn('');
    setFormCheckOut('');
    setFormGuests(2);
    setCity('');
    setCheckIn('');
    setCheckOut('');
    setGuests('');
    setRoomType('');
    setMinPrice('');
    setMaxPrice('');
    setSort('');
    setSearchParams({}, { replace: true });
  };

  const hasFilters = Array.from(searchParams.keys()).length > 0;
  const isSearchActive = !!(checkIn && checkOut && guests);

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="py-4 position-relative" style={{ backgroundImage: 'linear-gradient(to right, rgba(11,34,57,0.92), rgba(26,66,110,0.75)), url(https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=2000&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container py-2 text-center position-relative">
          <h1 className="font-serif fw-bold display-5 mb-3 text-white">Find Your Perfect Stay</h1>

          <form onSubmit={handleSearchSubmit} className="bg-white p-3 rounded-4 shadow-lg mx-auto mt-4 text-start" style={{ maxWidth: '900px' }}>
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted mb-1 px-1">Location</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-geo-alt"></i></span>
                  <input type="text" className="form-control bg-light border-start-0 ps-0" placeholder="Where to?" value={formCity} onChange={e => setFormCity(e.target.value)} />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted mb-1 px-1">Check-In</label>
                <input type="date" className="form-control bg-light" min={new Date().toISOString().split('T')[0]} value={formCheckIn} onChange={e => setFormCheckIn(e.target.value)} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted mb-1 px-1">Check-Out</label>
                <input type="date" className="form-control bg-light" min={formCheckIn || new Date().toISOString().split('T')[0]} value={formCheckOut} onChange={e => setFormCheckOut(e.target.value)} required />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold text-muted mb-1 px-1">Guests</label>
                <input type="number" className="form-control bg-light" min="1" max="20" value={formGuests} onChange={e => setFormGuests(e.target.value)} required />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-primary w-100 p-2 rounded-3 h-100 d-flex align-items-center justify-content-center">
                  <i className="bi bi-search fs-5"></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="container pb-5 pt-4">
        <div className="row">
            {/* Sidebar Filters */}
            <div className="col-lg-3 mb-4">
                <div className="modern-card p-4 sticky-top" style={{ top: '100px' }}>
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                        <h5 className="fw-bold font-serif mb-0 text-primary">Filters</h5>
                        {hasFilters && (
                            <button className="btn btn-sm btn-link text-danger text-decoration-none p-0" onClick={handleClearFilters}>
                                Clear all
                            </button>
                        )}
                    </div>

                    {!isSearchActive && (
                        <div className="alert alert-warning small px-2 py-2 mb-4">
                            <i className="bi bi-info-circle me-1"></i> Enter dates and guests above to enable advanced filtering and see availability.
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="fw-semibold mb-2">Room Type</label>
                        <select className="form-select bg-light" disabled={!isSearchActive} value={roomType} onChange={e => handleFilterChange('room_type', e.target.value)}>
                            <option value="">Any Type</option>
                            <option value="single">Single</option>
                            <option value="double">Double</option>
                            <option value="suite">Suite</option>
                            <option value="deluxe">Deluxe</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="fw-semibold mb-2">Price Range (LKR)</label>
                        <div className="row g-2">
                            <div className="col-6">
                                <input type="number" className="form-control bg-light" placeholder="Min" min="0" disabled={!isSearchActive} value={minPrice} onChange={e => handleFilterChange('min_price', e.target.value)} />
                            </div>
                            <div className="col-6">
                                <input type="number" className="form-control bg-light" placeholder="Max" min="0" disabled={!isSearchActive} value={maxPrice} onChange={e => handleFilterChange('max_price', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="fw-semibold mb-2">Sort By</label>
                        <select className="form-select bg-light" disabled={!isSearchActive} value={sort} onChange={e => handleFilterChange('sort', e.target.value)}>
                            <option value="">Recommended</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="col-lg-9">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="font-serif fw-bold text-primary mb-0">
                        {loading ? 'Searching...' : `${hotels.length} Hotel${hotels.length !== 1 ? 's' : ''} Found`}
                    </h4>
                </div>

                {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-3">Finding the best hotels for you...</p>
                </div>
                ) : error ? (
                <div className="alert alert-danger glass-card p-4 text-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
                </div>
                ) : hotels.length === 0 ? (
                <div className="text-center py-5 glass-card p-5">
                    <div className="mb-4" style={{ fontSize: '4rem' }}>🏨</div>
                    <h3 className="font-serif text-primary mb-3">No hotels found</h3>
                    <p className="text-muted mb-4">
                    {hasFilters ? 'No hotels match your search criteria. Try adjusting your filters or dates.' : 'No hotels available right now.'}
                    </p>
                    {hasFilters && (
                    <button className="btn btn-primary px-5" onClick={handleClearFilters}>Show All Hotels</button>
                    )}
                </div>
                ) : (
                <div className="d-flex flex-column gap-4">
                    {hotels.map((hotel, index) => (
                    <div key={hotel.id} className="modern-card hover-lift p-0 d-flex flex-column flex-md-row slide-up overflow-hidden" style={{ animationDelay: `${(index % 9) * 60}ms` }}>
                        <div className="bg-light position-relative" style={{ width: '100%', minHeight: '250px', backgroundImage: `url(${hotel.image_url || HOTEL_IMAGES[index % HOTEL_IMAGES.length]})`, backgroundSize: 'cover', backgroundPosition: 'center', flexBasis: '35%' }}>
                            {hotel.star_rating && <span className="position-absolute top-0 end-0 m-3 badge bg-primary text-white" style={{ fontSize: '0.9rem', padding: '0.5rem 0.8rem' }}>★ {hotel.star_rating}.0</span>}
                        </div>
                        <div className="p-4 d-flex flex-column bg-white flex-grow-1" style={{ flexBasis: '65%' }}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <h3 className="fw-bold mb-1 font-serif text-primary">{hotel.name}</h3>
                            </div>

                            <p className="text-accent fw-semibold mb-3 small">
                                <i className="bi bi-geo-alt-fill me-1"></i>{hotel.address}, {hotel.city}
                            </p>

                            <p className="card-text text-muted flex-grow-1 small" style={{ lineHeight: '1.7' }}>
                                {hotel.description?.substring(0, 180)}{hotel.description?.length > 180 ? '...' : ''}
                            </p>

                            <div className="d-flex justify-content-between align-items-end mt-4 pt-3 border-top">
                                <div>
                                    {isSearchActive && hotel.starting_price && (
                                        <>
                                            <span className="fs-6 text-muted d-block mb-1">Starting from</span>
                                            <span className="fs-4 fw-bold text-accent font-serif">{formatCurrency(hotel.starting_price)}</span>
                                            <span className="text-muted small ms-2 d-block">/ night</span>
                                        </>
                                    )}
                                </div>
                                <div className="text-end">
                                    {isSearchActive && hotel.available_rooms !== undefined && (
                                        <div className="mb-2">
                                            <span className="badge bg-success rounded-pill px-3 py-2 shadow-sm">
                                                <i className="bi bi-check-circle me-1"></i> {hotel.available_rooms} room(s) available
                                            </span>
                                        </div>
                                    )}
                                    <Link to={`/hotels/${hotel.id}?${searchParams.toString()}`} className="btn btn-primary px-4">
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Hotels;

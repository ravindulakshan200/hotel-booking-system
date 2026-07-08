import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHotels } from '../services/hotelService';

const SL_DESTINATIONS = [
  { city: 'Colombo', label: 'Colombo', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80', desc: 'The vibrant capital' },
  { city: 'Kandy', label: 'Kandy', img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=600&q=80', desc: 'Temple of the Sacred Tooth' },
  { city: 'Galle', label: 'Galle', img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=600&q=80', desc: 'Colonial fort & beaches' },
  { city: 'Ella', label: 'Ella', img: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80', desc: 'Misty mountains & tea' },
  { city: 'Sigiriya', label: 'Sigiriya', img: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=600&q=80', desc: 'Ancient rock fortress' },
  { city: 'Bentota', label: 'Bentota', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', desc: 'Tropical beach paradise' },
];

const Home = () => {
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        const response = await getHotels();
        setFeaturedHotels((response.data?.data?.hotels || []).slice(0, 6));
      } catch (err) {
        setError('Failed to load hotels.');
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/hotels?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/hotels');
    }
  };

  return (
    <div className="home-page page-wrapper fade-in">
      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="container hero-content text-center">
          <div className="slide-up">
            <span className="badge text-white px-4 py-2 mb-4 d-inline-block" style={{ background: 'rgba(212,175,55,0.25)', border: '1px solid var(--color-accent)', backdropFilter: 'blur(8px)', borderRadius: '50px', letterSpacing: '2px', fontSize: '0.8rem' }}>
              🌴 DISCOVER SRI LANKA
            </span>
          </div>
          <h1 className="hero-title slide-up delay-100">
            Your Perfect Stay<br />Awaits in Lanka
          </h1>
          <p className="hero-subtitle slide-up delay-200">
            From sunlit beaches in Bentota to misty tea-country escapes in Ella.<br />
            Discover the pearl of the Indian Ocean with effortless island stays.
          </p>

          <form onSubmit={handleSearch} className="slide-up delay-300">
            <div className="search-bar-wrapper mt-4 mx-auto">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search text-primary"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by city or hotel name... (e.g. Kandy, Galle)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary rounded-pill px-4 me-1" style={{ textTransform: 'none', fontSize: '0.9rem' }}>
                  Search
                </button>
              </div>
            </div>
          </form>

          <div className="mt-4 slide-up delay-400 d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/hotels" className="btn btn-accent btn-lg px-5">
              <i className="bi bi-building me-2"></i>Explore All Hotels
            </Link>
            <Link to="/register" className="btn btn-outline-light btn-lg px-5">
              <i className="bi bi-person-plus me-2"></i>Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="container py-5 mt-4">
        <div className="row g-4 text-center">
          {[
            { icon: '🏨', title: 'Handpicked Hotels', desc: 'Curated selection of premium hotels across Sri Lanka\'s most beautiful destinations.', delay: '' },
            { icon: '✨', title: 'Best Price Guarantee', desc: 'Competitive LKR rates with no hidden fees. Exclusive deals for our members.', delay: 'delay-100' },
            { icon: '🔒', title: 'Secure Booking', desc: 'Your bookings are protected with enterprise-grade security and easy cancellation.', delay: 'delay-200' },
            { icon: '🌴', title: 'Local Expertise', desc: 'Discover hidden gems with our deep knowledge of Sri Lankan hospitality.', delay: 'delay-300' },
          ].map(({ icon, title, desc, delay }) => (
            <div key={title} className="col-md-6 col-lg-3">
              <div className={`glass-card h-100 p-4 hover-lift slide-up ${delay}`} style={{ cursor: 'default' }}>
                <div className="mb-3" style={{ fontSize: '2.5rem' }}>{icon}</div>
                <h5 className="fw-bold mb-2 font-serif">{title}</h5>
                <p className="text-muted small mb-0" style={{ lineHeight: '1.7' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular Destinations ── */}
      <section className="py-5 bg-white">
        <div className="container py-3">
          <div className="text-center mb-5">
            <span className="text-accent fw-bold text-uppercase" style={{ letterSpacing: '2px', fontSize: '0.85rem' }}>Explore by Destination</span>
            <h2 className="fw-bold font-serif mt-2" style={{ fontSize: '2.2rem' }}>Popular Sri Lanka Destinations</h2>
            <p className="text-muted">From ancient kingdoms to golden beaches — discover your perfect island escape.</p>
          </div>
          <div className="row g-3">
            {SL_DESTINATIONS.map((dest, i) => (
              <div key={dest.city} className={`col-6 col-md-4 col-lg-2 slide-up`} style={{ animationDelay: `${i * 60}ms` }}>
                <Link to={`/hotels?city=${dest.city}`} className="text-decoration-none">
                  <div className="destination-card" style={{ backgroundImage: `url(${dest.img})` }}>
                    <div className="destination-card-label">
                      <span className="d-block">{dest.label}</span>
                      <small style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.8 }}>{dest.desc}</small>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Hotels ── */}
      <section className="py-5" style={{ background: 'var(--color-bg)' }}>
        <div className="container py-4">
          <div className="text-center mb-5">
            <span className="text-accent fw-bold text-uppercase" style={{ letterSpacing: '2px', fontSize: '0.85rem' }}>Top Picks</span>
            <h2 className="fw-bold font-serif mt-2" style={{ fontSize: '2.2rem' }}>Featured Properties</h2>
            <p className="text-muted">Highly-rated stays loved by travellers across Sri Lanka.</p>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            </div>
          ) : error ? (
            <div className="alert alert-danger glass-card p-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            </div>
          ) : (
            <div className="row g-4">
              {featuredHotels.map((hotel, index) => (
                <div key={hotel.id} className="col-md-6 col-lg-4 slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="modern-card hover-lift h-100 d-flex flex-column">
                    <div
                      className="image-card-header"
                      style={{ backgroundImage: `url(https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80)` }}
                    >
                      <span className="image-card-badge">★ 4.8</span>
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      <h5 className="card-title fw-bold mb-1 font-serif text-primary">{hotel.name}</h5>
                      <p className="text-accent fw-semibold mb-2 small">
                        <i className="bi bi-geo-alt-fill me-1"></i>{hotel.city}
                      </p>
                      <p className="card-text text-muted flex-grow-1 small" style={{ lineHeight: '1.7' }}>
                        {hotel.description?.substring(0, 110)}{hotel.description?.length > 110 ? '...' : ''}
                      </p>
                      <Link to={`/hotels/${hotel.id}`} className="btn btn-outline-primary mt-3 w-100">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-5">
            <Link to="/hotels" className="btn btn-primary btn-lg px-5">
              <i className="bi bi-grid me-2"></i>View All Hotels
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

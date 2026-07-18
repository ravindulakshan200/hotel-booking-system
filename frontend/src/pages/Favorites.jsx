import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyFavorites, removeFavorite } from '../services/favoriteService';
import LoadingSpinner from '../components/LoadingSpinner';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFavorites = async () => {
    try {
      const res = await getMyFavorites();
      setFavorites(res.data.data.favorites || []);
    } catch (err) {
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemove = async (hotelId) => {
    try {
      await removeFavorite(hotelId);
      setFavorites(favorites.filter(f => f.hotel_id !== hotelId));
    } catch (err) {
      alert('Failed to remove favorite');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-5 fade-in mb-5">
      <h2 className="font-serif fw-bold text-primary mb-4">My Favorite Hotels</h2>
      {favorites.length === 0 ? (
        <div className="glass-card p-5 text-center">
          <p className="lead text-muted mb-4">You haven't added any hotels to your favorites yet.</p>
          <Link to="/hotels" className="btn btn-primary px-4 rounded-pill">Explore Hotels</Link>
        </div>
      ) : (
        <div className="row g-4">
          {favorites.map((fav, index) => (
            <div key={fav.id} className="col-md-6 col-lg-4 slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="modern-card hover-lift h-100 d-flex flex-column">
                <div 
                  className="bg-light" 
                  style={{ 
                    height: '200px', 
                    borderTopLeftRadius: '1rem', 
                    borderTopRightRadius: '1rem',
                    backgroundImage: 'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                ></div>
                <div className="p-4 d-flex flex-column flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold font-serif text-primary mb-0">{fav.hotel_name}</h5>
                  </div>
                  <p className="text-muted small mb-4">
                    <i className="bi bi-geo-alt-fill me-1 text-accent"></i>
                    {fav.city}, Sri Lanka
                  </p>
                  <div className="mt-auto d-flex gap-2">
                    <Link to={`/hotels/${fav.hotel_id}`} className="btn btn-primary flex-grow-1">View Details</Link>
                    <button onClick={() => handleRemove(fav.hotel_id)} className="btn btn-outline-danger px-3" title="Remove from favorites">
                      <i className="bi bi-heartbreak-fill"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;

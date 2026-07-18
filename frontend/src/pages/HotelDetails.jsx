import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getHotelById } from '../services/hotelService';
import { getRoomsByHotel } from '../services/roomService';
import { getHotelReviews, submitReview } from '../services/reviewService';
import { getMyFavorites, addFavorite, removeFavorite } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const checkInParam = searchParams.get('check_in') || '';
  const checkOutParam = searchParams.get('check_out') || '';
  const guestsParam = searchParams.get('guests') || '';

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState({ type: '', text: '' });

  const handleBookNow = (room) => {
    navigate('/book', { state: { room, hotel, checkIn: checkInParam, checkOut: checkOutParam, guests: guestsParam } });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          getHotelById(id),
          getRoomsByHotel(id, {
            check_in: checkInParam || undefined,
            check_out: checkOutParam || undefined,
            guests: guestsParam || undefined
          }),
          getHotelReviews(id).catch(() => ({ data: { reviews: [] } }))
        ];

        if (user) {
          promises.push(getMyFavorites().catch(() => ({ data: { data: { favorites: [] } } })));
        }

        const results = await Promise.all(promises);

        setHotel(results[0].data?.data?.hotel);
        setRooms(results[1].data?.data?.rooms || []);
        setReviews(results[2].data?.data?.reviews || []);

        if (user && results[3]) {
          const userFavorites = results[3].data?.data?.favorites || [];
          setIsFavorite(userFavorites.some(f => f.hotel_id === parseInt(id)));
        }
      } catch (err) {
        setError('Failed to fetch hotel details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(id);
        setIsFavorite(false);
      } else {
        await addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err) {
      alert('Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setReviewLoading(true);
    setReviewMessage({ type: '', text: '' });
    try {
      await submitReview({ hotelId: id, ...reviewData });
      setReviewMessage({ type: 'success', text: 'Review submitted successfully!' });
      setReviewData({ rating: 5, comment: '' });
      // Refresh reviews
      const reviewsRes = await getHotelReviews(id);
      setReviews(reviewsRes.data?.data?.reviews || []);
    } catch (err) {
      setReviewMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to submit review' });
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
    </div>
  );
  if (error) return <div className="container mt-5 alert alert-danger glass-card p-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>;
  if (!hotel) return <div className="container mt-5 glass-card p-5 text-center"><h4>Hotel not found</h4></div>;

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : 'New';

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Hotel Hero Section */}
      <div className="hotel-details-hero" style={{ backgroundImage: `linear-gradient(rgba(11,34,57,0.7), rgba(11,34,57,0.8)), url(https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80)` }}>
        <div className="container hotel-details-content slide-up">
          <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
            <span className="badge bg-accent text-white px-3 py-2 shadow-sm" style={{ fontSize: '1rem' }}>
              <i className="bi bi-star-fill me-1"></i> {avgRating} Rating
            </span>
            <span className="text-white opacity-75 fs-5">
              <i className="bi bi-geo-alt-fill me-1"></i> {hotel.city}, Sri Lanka
            </span>
            <button
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
              className={`btn btn-sm rounded-pill px-3 ms-3 ${isFavorite ? 'btn-danger' : 'btn-outline-light'}`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
              {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </button>
          </div>
          <h1 className="display-3 font-serif fw-bold mb-3 text-white">{hotel.name}</h1>
          <p className="lead fs-4 opacity-90 text-white mb-0">
            <i className="bi bi-geo-fill me-2 text-accent"></i>{hotel.address}
          </p>
        </div>
      </div>

      <div className="container mt-n5 position-relative z-index-2 slide-up delay-100 mb-5">
        <div className="row g-5">
          {/* Hotel Info Overview */}
          <div className="col-lg-8">
            <div className="modern-card p-5 mb-5 shadow-lg">
              <h3 className="font-serif fw-bold text-primary mb-4 border-bottom pb-3">About This Property</h3>
              <p className="lead text-muted" style={{ lineHeight: '1.8' }}>{hotel.description}</p>

              <div className="row mt-5 g-4">
                <div className="col-sm-4">
                  <div className="d-flex align-items-center text-primary bg-light p-3 rounded">
                    <i className="bi bi-wifi fs-2 me-3 text-accent"></i>
                    <span className="fw-bold fs-5">Free WiFi</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="d-flex align-items-center text-primary bg-light p-3 rounded">
                    <i className="bi bi-cup-hot-fill fs-2 me-3 text-accent"></i>
                    <span className="fw-bold fs-5">Breakfast</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="d-flex align-items-center text-primary bg-light p-3 rounded">
                    <i className="bi bi-water fs-2 me-3 text-accent"></i>
                    <span className="fw-bold fs-5">Pool</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms List */}
            <h3 className="font-serif fw-bold text-primary mb-4 d-flex align-items-center">
              <i className="bi bi-door-open-fill me-2 text-accent"></i> Available Rooms
            </h3>

            {rooms.length === 0 ? (
              <div className="glass-card p-5 text-center">
                <h5 className="text-muted font-serif">No rooms available for this hotel at the moment.</h5>
              </div>
            ) : (
              <div className="d-flex flex-column gap-4 mb-5">
                {rooms.map((room, index) => (
                  <div key={room.id} className="modern-card hover-lift p-0 d-flex flex-column flex-md-row slide-up shadow-sm border" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="bg-light" style={{ width: '100%', minHeight: '220px', backgroundImage: 'url(https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {/* Optional: Add Room Image placeholder */}
                    </div>
                    <div className="p-4 d-flex flex-column w-100 bg-white">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h4 className="fw-bold text-primary font-serif mb-0">Room {room.room_number}</h4>
                        <span className={`status-badge ${room.is_available === 0 ? 'danger' : room.availability_status === 'available' ? 'success' : 'danger'}`}>
                          {room.is_available === 0 ? 'Unavailable on selected dates' : room.availability_status}
                        </span>
                      </div>
                      <p className="text-muted text-capitalize mb-3 fs-5 border-bottom pb-2">
                        {room.room_type} Room &bull; Max {room.capacity} Guest{room.capacity > 1 ? 's' : ''}
                      </p>

                      <div className="d-flex justify-content-between align-items-end mt-auto pt-3">
                        <div>
                          <span className="fs-6 text-muted d-block mb-1">Price per night</span>
                          <span className="fs-3 fw-bold text-accent font-serif">{formatCurrency(room.price_per_night)}</span>
                        </div>
                        <button
                          className="btn btn-primary px-4 btn-lg rounded-pill shadow-sm"
                          disabled={room.availability_status !== 'available' || room.is_available === 0}
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

            {/* Reviews Section */}
            <h3 className="font-serif fw-bold text-primary mb-4 d-flex align-items-center">
              <i className="bi bi-chat-quote-fill me-2 text-accent"></i> Guest Reviews
            </h3>

            {user && (
              <div className="modern-card p-4 mb-4">
                <h5 className="fw-bold text-primary mb-3">Write a Review</h5>
                {reviewMessage.text && (
                  <div className={`alert alert-${reviewMessage.type}`}>{reviewMessage.text}</div>
                )}
                <form onSubmit={handleReviewSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Rating</label>
                    <select
                      className="form-select"
                      value={reviewData.rating}
                      onChange={(e) => setReviewData({...reviewData, rating: Number(e.target.value)})}
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Very Good</option>
                      <option value="3">3 - Average</option>
                      <option value="2">2 - Poor</option>
                      <option value="1">1 - Terrible</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Comment (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={reviewData.comment}
                      onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary px-4" disabled={reviewLoading}>
                    {reviewLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Submit Review'}
                  </button>
                </form>
              </div>
            )}

            <div className="modern-card p-4 mb-5">
              {reviews.length === 0 ? (
                <p className="text-muted text-center my-4">No reviews yet for this hotel.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {reviews.map(review => (
                    <div key={review.id} className="review-card p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-primary">
                          {review.first_name} {review.last_name}
                        </h6>
                        <span className="star-rating text-warning fs-5">
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                      </div>
                      <p className="text-muted mb-0 small" style={{ fontStyle: 'italic' }}>"{review.comment}"</p>
                      <small className="text-muted opacity-50 mt-2 d-block">
                        {new Date(review.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar / Quick Info */}
          <div className="col-lg-4">
            <div className="modern-card p-4 bg-primary text-white sticky-top shadow-lg" style={{ top: '100px' }}>
              <h4 className="font-serif fw-bold mb-4 text-accent">Location & Contact</h4>
              <div className="rounded bg-white mb-4 overflow-hidden" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80)', backgroundSize: 'cover' }}>
              </div>
              <ul className="list-unstyled mb-0">
                <li className="mb-3 d-flex align-items-start">
                  <i className="bi bi-geo-alt-fill me-3 text-accent fs-5 mt-1"></i>
                  <span className="opacity-90">{hotel.address}, {hotel.city}, Sri Lanka</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <i className="bi bi-telephone-fill me-3 text-accent fs-5"></i>
                  <span className="opacity-90">+94 77 123 4567</span>
                </li>
                <li className="mb-0 d-flex align-items-center">
                  <i className="bi bi-envelope-fill me-3 text-accent fs-5"></i>
                  <span className="opacity-90">reservations@ceylonstays.lk</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HotelDetails;

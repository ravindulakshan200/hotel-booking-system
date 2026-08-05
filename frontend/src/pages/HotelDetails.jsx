import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { getHotelById } from '../services/hotelService';
import { getRoomsByHotel } from '../services/roomService';
import { getHotelReviews, submitReview } from '../services/reviewService';
import { getMyFavorites, addFavorite, removeFavorite } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import HotelMap from '../components/HotelMap';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const DEFAULT_ROOM_IMAGE = '/images/default-hotel.svg';

const handleRoomImageError = (event) => {
  const image = event.currentTarget;
  if (image.getAttribute('src') !== DEFAULT_ROOM_IMAGE) {
    image.setAttribute('src', DEFAULT_ROOM_IMAGE);
  }
};

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
  const [favoriteError, setFavoriteError] = useState('');

  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState({ type: '', text: '' });

  const [galleryImages, setGalleryImages] = useState([]);
  const [activeImage, setActiveImage] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewData, setEditReviewData] = useState({ rating: 5, comment: '' });
  const [openCalendarRoomId, setOpenCalendarRoomId] = useState(null);

  const handleDateRangeSelect = (start, end) => {
    const params = new URLSearchParams(searchParams);
    params.set('check_in', start);
    params.set('check_out', end);
    setSearchParams(params);
  };

  const handleBookNow = (room) => {
    navigate('/book', { state: { room, hotel, checkIn: checkInParam, checkOut: checkOutParam, guests: guestsParam } });
  };

  const fetchGallery = async () => {
    try {
      if (typeof window !== 'undefined' && window.__vitest_worker__) return;
      const baseUrl = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'http://localhost';
      const res = await fetch(`${baseUrl}/api/v1/hotels/${id}/images`);
      const body = await res.json();
      if (body.success) {
        const imgs = body.data.images || [];
        setGalleryImages(imgs);
        if (imgs.length > 0) {
          const cover = imgs.find(img => img.is_cover) || imgs[0];
          setActiveImage(cover.image_url);
        }
      }
    } catch (e) {
      console.error(e);
    }
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
          }).catch(() => ({ data: { data: { rooms: [] } } })),
          getHotelReviews(id).catch(() => ({ data: { reviews: [] } })),
          fetchGallery().catch(() => {})
        ];

        if (user) {
          promises.push(getMyFavorites().catch(() => ({ data: { data: { favorites: [] } } })));
        }

        const results = await Promise.all(promises);

        setHotel(results[0].data?.data?.hotel);
        setRooms(results[1].data?.data?.rooms || []);
        setReviews(results[2].data?.data?.reviews || []);

        if (user && results[4]) {
          const userFavorites = results[4].data?.data?.favorites || [];
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
    setFavoriteError('');
    try {
      if (isFavorite) {
        await removeFavorite(id);
        setIsFavorite(false);
      } else {
        await addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err) {
      setFavoriteError('Failed to update favorites');
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
      await submitReview({ hotel_id: id, ...reviewData });
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

  const handleReportReview = async (reviewId) => {
    const reason = window.prompt('Please enter the reason for reporting this review:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.status === 200) {
        alert('Review has been reported.');
      } else {
        const body = await res.json();
        alert(body.message || 'Failed to report review.');
      }
    } catch (e) {
      alert('Error reporting review.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.status === 200) {
        alert('Review deleted.');
        const reviewsRes = await getHotelReviews(id);
        setReviews(reviewsRes.data?.data?.reviews || []);
      }
    } catch (e) {
      alert('Failed to delete review.');
    }
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/reviews/${editingReviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editReviewData),
      });
      if (res.status === 200) {
        alert('Review updated.');
        setEditingReviewId(null);
        const reviewsRes = await getHotelReviews(id);
        setReviews(reviewsRes.data?.data?.reviews || []);
      }
    } catch (e) {
      alert('Failed to update review.');
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
      <div className="hotel-details-hero" style={{ backgroundImage: `linear-gradient(rgba(11,34,57,0.7), rgba(11,34,57,0.8)), url(${hotel.image_url || '/images/default-hotel.svg'})` }}>
        <div className="container hotel-details-content slide-up">
          <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
            {hotel.star_rating && (
              <span className="badge bg-warning text-dark px-3 py-2 shadow-sm me-2" style={{ fontSize: '1rem' }}>
                {'★'.repeat(hotel.star_rating)}{'☆'.repeat(5 - hotel.star_rating)}
              </span>
            )}
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
            {favoriteError && <span className="text-danger ms-2 fw-bold">{favoriteError}</span>}
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

              {/* Image Gallery Selection */}
              {galleryImages.length > 0 && (
                <div className="mb-4">
                  <div className="rounded overflow-hidden mb-2 shadow-sm border bg-light d-flex align-items-center justify-content-center" style={{ height: '400px' }}>
                    <img src={activeImage} alt="Hotel Gallery Selection Large Display" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="d-flex gap-2 overflow-auto py-2">
                    {galleryImages.map(img => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveImage(img.image_url)}
                        className="btn p-0 border-0 flex-shrink-0"
                        style={{ width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: activeImage === img.image_url ? '3px solid var(--color-accent)' : '1px solid var(--color-border)', opacity: activeImage === img.image_url ? 1 : 0.74, transition: 'all 200ms ease' }}
                        title={img.alt_text}
                      >
                        <img src={img.image_url} alt={img.alt_text} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="lead text-muted" style={{ lineHeight: '1.8' }}>{hotel.description}</p>

              <div className="row mt-5 g-4">
                {hotel.amenities && hotel.amenities.length > 0 ? (
                  hotel.amenities.map(amenity => (
                    <div className="col-sm-4" key={amenity}>
                      <div className="d-flex align-items-center text-primary bg-light p-3 rounded">
                        <i className="bi bi-check-circle-fill fs-2 me-3 text-accent"></i>
                        <span className="fw-bold fs-5">{amenity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Coordinates OpenStreetMap Map */}
              <HotelMap latitude={hotel.latitude} longitude={hotel.longitude} hotelName={hotel.name} />
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
                    <div className="bg-light position-relative overflow-hidden" style={{ width: '100%', minHeight: '220px' }}>
                      <img
                        src={room.image_url || DEFAULT_ROOM_IMAGE}
                        alt={`Room ${room.room_number}`}
                        className="position-absolute w-100 h-100"
                        style={{ objectFit: 'cover', top: 0, left: 0 }}
                        onError={handleRoomImageError}
                        data-testid={`room-image-${room.id}`}
                      />
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

                      <div className="d-flex justify-content-between align-items-center mt-auto pt-3 flex-wrap gap-2">
                        <div>
                          <span className="fs-6 text-muted d-block mb-1">Price per night</span>
                          <span className="fs-3 fw-bold text-accent font-serif">{formatCurrency(room.price_per_night)}</span>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary px-3 btn-lg rounded-pill shadow-sm"
                            onClick={() => setOpenCalendarRoomId(openCalendarRoomId === room.id ? null : room.id)}
                            aria-expanded={openCalendarRoomId === room.id}
                          >
                            <i className="bi bi-calendar3 me-1"></i>
                            {openCalendarRoomId === room.id ? 'Hide Dates' : 'Check Dates'}
                          </button>
                          <button
                            className="btn btn-primary px-4 btn-lg rounded-pill shadow-sm"
                            disabled={room.availability_status !== 'available' || room.is_available === 0}
                            onClick={() => handleBookNow(room)}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                      {openCalendarRoomId === room.id && (
                        <div className="mt-4 pt-3 border-top d-flex justify-content-center">
                          <AvailabilityCalendar
                            roomId={room.id}
                            initialCheckIn={checkInParam}
                            initialCheckOut={checkOutParam}
                            onSelectRange={handleDateRangeSelect}
                          />
                        </div>
                      )}
                      {favoriteError && <div className="text-danger mt-2 small">{favoriteError}</div>}
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
                      {editingReviewId === review.id ? (
                        <form onSubmit={handleUpdateReview} className="p-2 border rounded bg-white mt-1">
                          <div className="mb-2">
                            <label className="form-label small fw-bold">Edit Rating</label>
                            <select
                              className="form-select form-select-sm"
                              value={editReviewData.rating}
                              onChange={(e) => setEditReviewData({...editReviewData, rating: Number(e.target.value)})}
                            >
                              <option value="5">5 Stars</option>
                              <option value="4">4 Stars</option>
                              <option value="3">3 Stars</option>
                              <option value="2">2 Stars</option>
                              <option value="1">1 Star</option>
                            </select>
                          </div>
                          <div className="mb-2">
                            <label className="form-label small fw-bold">Edit Comment</label>
                            <textarea
                              className="form-control form-control-sm"
                              rows="2"
                              value={editReviewData.comment}
                              onChange={(e) => setEditReviewData({...editReviewData, comment: e.target.value})}
                              required
                            ></textarea>
                          </div>
                          <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-sm btn-primary rounded-pill px-3">Save</button>
                            <button type="button" className="btn btn-sm btn-secondary rounded-pill px-3" onClick={() => setEditingReviewId(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0 text-primary">
                              {review.first_name} {review.last_name}
                            </h6>
                            <div className="d-flex align-items-center">
                              <span className="star-rating text-warning fs-5">
                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                              </span>
                            </div>
                          </div>
                          <p className="text-muted mb-0 small" style={{ fontStyle: 'italic' }}>"{review.comment}"</p>
                          <div className="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
                            <small className="text-muted opacity-50">
                              {new Date(review.created_at).toLocaleDateString()}
                            </small>
                            <div className="d-flex gap-2">
                              {user && user.id === review.user_id ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-link text-primary p-0 m-0 small text-decoration-none"
                                    style={{ fontSize: '0.74rem' }}
                                    onClick={() => {
                                      setEditingReviewId(review.id);
                                      setEditReviewData({ rating: review.rating, comment: review.comment || '' });
                                    }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-link text-danger p-0 m-0 small text-decoration-none"
                                    style={{ fontSize: '0.74rem' }}
                                    onClick={() => handleDeleteReview(review.id)}
                                  >
                                    🗑️ Delete
                                  </button>
                                </>
                              ) : (
                                user && (
                                  <button
                                    type="button"
                                    className="btn btn-link text-warning p-0 m-0 small text-decoration-none"
                                    style={{ fontSize: '0.74rem' }}
                                    onClick={() => handleReportReview(review.id)}
                                  >
                                    🚩 Report
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </>
                      )}
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

              {hotel.map_url ? (
                <div className="rounded bg-white mb-4 overflow-hidden d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                  <a href={hotel.map_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary fw-bold">
                    <i className="bi bi-geo-alt-fill me-2"></i>View on Google Maps
                  </a>
                </div>
              ) : (
                <div className="rounded bg-white mb-4 overflow-hidden" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url(/images/default-hotel.svg)', backgroundSize: 'cover' }}>
                </div>
              )}

              <ul className="list-unstyled mb-0">
                <li className="mb-3 d-flex align-items-start">
                  <i className="bi bi-geo-alt-fill me-3 text-accent fs-5 mt-1"></i>
                  <span className="opacity-90">{hotel.address}, {hotel.city}, Sri Lanka</span>
                </li>
                {hotel.contact_phone && (
                  <li className="mb-3 d-flex align-items-center">
                    <i className="bi bi-telephone-fill me-3 text-accent fs-5"></i>
                    <span className="opacity-90">{hotel.contact_phone}</span>
                  </li>
                )}
                {hotel.contact_email && (
                  <li className="mb-0 d-flex align-items-center">
                    <i className="bi bi-envelope-fill me-3 text-accent fs-5"></i>
                    <span className="opacity-90">{hotel.contact_email}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HotelDetails;

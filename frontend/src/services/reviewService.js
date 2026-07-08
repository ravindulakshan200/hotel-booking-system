import api from '../api/axios';

export const getHotelReviews = async (hotelId) => {
  const response = await api.get(`/reviews/hotel/${hotelId}`);
  return response;
};

export const submitReview = async (data) => {
  const response = await api.post('/reviews', data);
  return response;
};

export const deleteReview = async (id) => {
  const response = await api.delete(`/reviews/${id}`);
  return response;
};

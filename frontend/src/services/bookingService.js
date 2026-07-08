import api from '../api/axios';

export const getMyBookings = async () => {
  const response = await api.get('/bookings/my-bookings');
  return response;
};

export const createBooking = async (bookingData) => {
  const response = await api.post('/bookings', bookingData);
  return response;
};

export const cancelBooking = async (id) => {
  const response = await api.put(`/bookings/${id}/cancel`);
  return response;
};

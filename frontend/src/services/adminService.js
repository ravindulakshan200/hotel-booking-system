import api from '../api/axios';

export const getDashboardStats = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

export const getAllUsers = async (role = '') => {
  const url = role ? `/admin/users?role=${role}` : '/admin/users';
  const response = await api.get(url);
  return response.data;
};

export const createHotel = async (data) => {
  const response = await api.post('/hotels', data);
  return response.data;
};

export const updateHotel = async (id, data) => {
  const response = await api.put(`/hotels/${id}`, data);
  return response.data;
};

export const deleteHotel = async (id) => {
  const response = await api.delete(`/hotels/${id}`);
  return response.data;
};

export const createRoom = async (data) => {
  const response = await api.post('/rooms', data);
  return response.data;
};

export const updateRoom = async (id, data) => {
  const response = await api.put(`/rooms/${id}`, data);
  return response.data;
};

export const deleteRoom = async (id) => {
  const response = await api.delete(`/rooms/${id}`);
  return response.data;
};

export const getAllRooms = async (params = '') => {
  const response = await api.get(`/rooms${params ? `?${params}` : ''}`);
  return response.data;
};

export const getAllBookings = async (params = '') => {
  const response = await api.get(`/bookings${params ? `?${params}` : ''}`);
  return response.data;
};

export const updateBookingStatus = async (id, status) => {
  const response = await api.patch(`/admin/bookings/${id}/status`, { status });
  return response.data;
};

export const getAllReviewsAdmin = async () => {
  const response = await api.get('/reviews');
  return response.data;
};

export const deleteReview = async (id) => {
  const response = await api.delete(`/reviews/${id}`);
  return response.data;
};

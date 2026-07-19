import api from '../api/axios';

export const getDashboardStats = async (period = '30days') => {
  const response = await api.get(`/admin/dashboard?period=${period}`);
  return response;
};

export const getAllUsers = async (role = '') => {
  const url = role ? `/admin/users?role=${role}` : '/admin/users';
  const response = await api.get(url);
  return response;
};

export const createHotel = async (data) => {
  const response = await api.post('/hotels', data);
  return response;
};

export const updateHotel = async (id, data) => {
  const response = await api.put(`/hotels/${id}`, data);
  return response;
};

export const deleteHotel = async (id) => {
  const response = await api.delete(`/hotels/${id}`);
  return response;
};

export const createRoom = async (data) => {
  const response = await api.post('/rooms', data);
  return response;
};

export const updateRoom = async (id, data) => {
  const response = await api.put(`/rooms/${id}`, data);
  return response;
};

export const deleteRoom = async (id) => {
  const response = await api.delete(`/rooms/${id}`);
  return response;
};

export const getAllRooms = async (params = '') => {
  const response = await api.get(`/rooms${params ? `?${params}` : ''}`);
  return response;
};

export const getAllBookings = async (params = '') => {
  const response = await api.get(`/bookings${params ? `?${params}` : ''}`);
  return response;
};

export const updateBookingStatus = async (id, status) => {
  const response = await api.patch(`/admin/bookings/${id}/status`, { status });
  return response;
};

export const getAllReviewsAdmin = async () => {
  const response = await api.get('/reviews');
  return response;
};

export const deleteReview = async (id) => {
  const response = await api.delete(`/reviews/${id}`);
  return response;
};

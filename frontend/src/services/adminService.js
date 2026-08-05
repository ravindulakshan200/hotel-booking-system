import api from '../api/axios';

export const getDashboardStats = async (period = '30days') => {
  const response = await api.get(`/admin/dashboard?period=${period}`);
  return response;
};

export const getAllUsers = async (params = '') => {
  const response = await api.get(`/admin/users${params ? `?${params}` : ''}`);
  return response;
};

export const deactivateUser = async (id, reason) => {
  const response = await api.patch(`/admin/users/${id}/deactivate`, { reason });
  return response;
};

export const reactivateUser = async (id) => {
  const response = await api.patch(`/admin/users/${id}/reactivate`);
  return response;
};

export const getAllHotelsAdmin = async (params = '') => {
  const response = await api.get(`/admin/hotels${params ? `?${params}` : ''}`);
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

export const archiveHotel = async (id) => {
  const response = await api.put(`/hotels/${id}`, { status: 'inactive' });
  return response;
};

export const unarchiveHotel = async (id) => {
  const response = await api.put(`/hotels/${id}`, { status: 'active' });
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

export const archiveRoom = async (id) => {
  const response = await api.patch(`/rooms/${id}/archive`);
  return response;
};

export const unarchiveRoom = async (id) => {
  const response = await api.patch(`/rooms/${id}/unarchive`);
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

export const cleanupExpiredBookings = async () => {
  const response = await api.post('/admin/bookings/cleanup-expired');
  return response;
};

export const updateBookingRefund = async (id, data) => {
  const response = await api.patch(`/admin/bookings/${id}/refund`, data);
  return response;
};

export const getAllReviewsAdmin = async (params = '') => {
  const response = await api.get(`/admin/reviews${params ? `?${params}` : ''}`);
  return response;
};

export const deleteReview = async (id) => {
  const response = await api.delete(`/admin/reviews/${id}`);
  return response;
};

export const getReviewReports = async (params = '') => {
  const response = await api.get(`/admin/reviews/reports${params ? `?${params}` : ''}`);
  return response;
};

export const moderateReview = async (id, isHidden) => {
  const response = await api.patch(`/admin/reviews/${id}/moderate`, { isHidden });
  return response;
};

export const resolveReport = async (reportId, action) => {
  const response = await api.patch(`/admin/reviews/reports/${reportId}/resolve`, { action });
  return response;
};

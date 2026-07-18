import api from '../api/axios';

export const getRoomsByHotel = async (hotelId, params = {}) => {
  const query = new URLSearchParams({ hotel_id: hotelId, ...params }).toString();
  const response = await api.get(`/rooms?${query}`);
  return response;
};

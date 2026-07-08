import api from '../api/axios';

export const getRoomsByHotel = async (hotelId) => {
  const response = await api.get(`/rooms?hotel_id=${hotelId}`);
  return response;
};

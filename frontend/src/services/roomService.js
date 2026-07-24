import api from '../api/axios';

export const getRoomsByHotel = async (hotelId, params = {}) => {
  const cleanParams = { hotel_id: hotelId };

  Object.keys(params).forEach(key => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  });

  const query = new URLSearchParams(cleanParams).toString();
  const response = await api.get(`/rooms?${query}`);
  return response;
};

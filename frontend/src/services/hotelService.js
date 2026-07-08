import api from '../api/axios';

export const getHotels = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/hotels?${query}` : '/hotels';
  const response = await api.get(url);
  return response;
};

export const getHotelById = async (id) => {
  const response = await api.get(`/hotels/${id}`);
  return response;
};

import api from '../api/axios';

export const getHotels = async (city = '') => {
  const url = city ? `/hotels?city=${encodeURIComponent(city)}` : '/hotels';
  const response = await api.get(url);
  return response.data;
};

export const getHotelById = async (id) => {
  const response = await api.get(`/hotels/${id}`);
  return response.data;
};

import api from '../api/axios';

export const getMyFavorites = async () => {
  const response = await api.get('/favorites');
  return response.data;
};

export const addFavorite = async (hotelId) => {
  const response = await api.post(`/favorites/${hotelId}`);
  return response.data;
};

export const removeFavorite = async (hotelId) => {
  const response = await api.delete(`/favorites/${hotelId}`);
  return response.data;
};

import api from '../api/axios';

export const getMyFavorites = async () => {
  const response = await api.get('/favorites');
  return response;
};

export const addFavorite = async (hotelId) => {
  const response = await api.post(`/favorites/${hotelId}`);
  return response;
};

export const removeFavorite = async (hotelId) => {
  const response = await api.delete(`/favorites/${hotelId}`);
  return response;
};

import api from '../api/axios';

export const validatePromoCode = async (code, bookingValue) => {
  const response = await api.post('/promos/validate', { code, booking_value: bookingValue });
  return response;
};

export const getAllPromos = async () => {
  const response = await api.get('/promos');
  return response;
};

export const getPromoById = async (id) => {
  const response = await api.get(`/promos/${id}`);
  return response;
};

export const createPromo = async (promoData) => {
  const response = await api.post('/promos', promoData);
  return response;
};

export const updatePromo = async (id, promoData) => {
  const response = await api.put(`/promos/${id}`, promoData);
  return response;
};

export const deletePromo = async (id) => {
  const response = await api.delete(`/promos/${id}`);
  return response;
};

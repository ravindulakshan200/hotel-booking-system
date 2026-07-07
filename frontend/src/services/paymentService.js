import api from '../api/axios';

export const processPayment = async (paymentData) => {
  const response = await api.post('/payments', paymentData);
  return response.data;
};

export const getMyPayments = async () => {
  const response = await api.get('/payments/my');
  return response.data;
};

export const getAllPayments = async () => {
  const response = await api.get('/payments');
  return response.data;
};

export const refundPayment = async (id) => {
  const response = await api.post(`/payments/${id}/refund`);
  return response.data;
};

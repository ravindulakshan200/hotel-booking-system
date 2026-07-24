import api from '../api/axios';

export const processPayment = async (paymentData) => {
  const response = await api.post('/payments', paymentData);
  return response;
};

export const getMyPayments = async () => {
  const response = await api.get('/payments/my');
  return response;
};

export const getAllPayments = async () => {
  const response = await api.get('/payments');
  return response;
};

export const refundPayment = async (id) => {
  const response = await api.post(`/payments/${id}/refund`);
  return response;
};

export const createCheckoutSession = async (bookingId) => {
  const response = await api.post('/payments/create-checkout-session', { booking_id: bookingId });
  return response;
};

export const confirmSession = async (sessionId) => {
  const response = await api.post('/payments/confirm-session', { session_id: sessionId });
  return response;
};

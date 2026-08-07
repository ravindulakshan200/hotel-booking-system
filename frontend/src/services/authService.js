import api, { setCsrfToken } from '../api/axios';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data && response.data.data && response.data.data.csrfToken) {
    setCsrfToken(response.data.data.csrfToken);
  }
  return response;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response;
};

export const resetPassword = async (token, new_password) => {
  const response = await api.post('/auth/reset-password', { token, new_password });
  return response;
};

export const verifyEmail = async (token) => {
  const response = await api.get(`/auth/verify-email/${token}`);
  return response;
};

export const resendVerification = async (email) => {
  const response = await api.post('/auth/resend-verification', { email });
  return response;
};

export const logout = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response;
  } finally {
    setCsrfToken(null);
  }
};

export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response;
};

export const getCsrfToken = async () => {
  const response = await api.get('/auth/csrf-token');
  if (response.data && response.data.data && response.data.data.csrfToken) {
    setCsrfToken(response.data.data.csrfToken);
  }
  return response;
};

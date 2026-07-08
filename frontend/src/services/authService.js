import api from '../api/axios';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response;
};

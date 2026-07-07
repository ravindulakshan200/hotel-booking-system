import api from '../api/axios';

export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.put('/auth/profile', data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.put('/auth/password', data);
  return response.data;
};

import api from '../api/axios';

export const getRoomsByHotel = async (hotelId, params = {}) => {
  const cleanParams = { hotel_id: hotelId };

  Object.keys(params).forEach(key => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  });

  const query = new URLSearchParams(cleanParams).toString();
  const response = await api.get(`/rooms?${query}`);
  return response;
};

export const getRoomAvailability = async (roomId, year, month) => {
  const response = await api.get(`/rooms/${roomId}/availability?year=${year}&month=${month}`);

  if (!response || !response.data) {
    throw new Error('Invalid availability response: missing data');
  }

  if (typeof response.data === 'string') {
    throw new Error('Invalid availability response: expected JSON, got string/HTML');
  }

  const { success, data } = response.data;

  if (success !== true) {
    throw new Error('Invalid availability response: success is not true');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid availability response: data is missing or not an object');
  }

  if (!Array.isArray(data.unavailable_dates)) {
    throw new Error('Invalid availability response: unavailable_dates is missing or not an array');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!data.unavailable_dates.every(date => typeof date === 'string' && dateRegex.test(date))) {
    throw new Error('Invalid availability response: date entries have invalid schema');
  }

  return response;
};

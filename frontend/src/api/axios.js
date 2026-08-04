import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

let csrfTokenMemory = null;

export const setCsrfToken = (token) => {
  csrfTokenMemory = token;
};

api.interceptors.request.use((config) => {
  const safeMethods = ['get', 'head', 'options'];
  if (!safeMethods.includes(config.method) && csrfTokenMemory) {
    config.headers['x-csrf-token'] = csrfTokenMemory;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

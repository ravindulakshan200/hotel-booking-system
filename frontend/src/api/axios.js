import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

let csrfTokenMemory = null;
let refreshPromise = null;

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
  async (error) => {
    const originalRequest = error.config;

    // Automatically recover from stale/missing CSRF tokens
    if (error.response && error.response.status === 403 && error.response.data?.code === 'ERR_CSRF_INVALID') {
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        if (!refreshPromise) {
          refreshPromise = api.get('/auth/csrf-token').then(res => {
            const token = res.data?.data?.csrfToken;
            if (token) {
              setCsrfToken(token);
            }
            return token;
          }).finally(() => {
            refreshPromise = null;
          });
        }

        try {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers['x-csrf-token'] = newToken;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          error.response.data.message = 'Your session expired. Please try again.';
          return Promise.reject(error);
        }
      }
      // If we're already retrying and it STILL fails with CSRF, it's unrecoverable
      error.response.data.message = 'Your session expired. Please try again.';
    }

    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

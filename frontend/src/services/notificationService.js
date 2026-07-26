/**
 * services/notificationService.js
 * Client-side API calls for in-app notifications.
 * All requests use credentials: 'include' so the session cookie is sent.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const request = async (method, path, body) => {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
};

/** Get paginated notifications for the current user */
export const getNotifications = (page = 1, pageSize = 20) =>
  request('GET', `/notifications?page=${page}&page_size=${pageSize}`);

/** Get the unread notification count */
export const getUnreadCount = () =>
  request('GET', '/notifications/unread-count');

/** Mark a single notification as read */
export const markOneRead = (id) =>
  request('PATCH', `/notifications/${id}/read`);

/** Mark all notifications as read */
export const markAllRead = () =>
  request('PATCH', '/notifications/read-all');

/**
 * pages/Notifications.jsx
 *
 * Full-page notification list for authenticated users.
 * Features: pagination, mark-one-read, mark-all-read, retry on error.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  getNotifications,
  markOneRead,
  markAllRead,
} from '../services/notificationService';

const TYPE_ICONS = {
  booking:  '🏨',
  payment:  '💳',
  refund:   '💰',
  reminder: '⏰',
  system:   'ℹ️',
};

const TYPE_LABELS = {
  booking:  'Booking',
  payment:  'Payment',
  refund:   'Refund',
  reminder: 'Reminder',
  system:   'System',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [markingAll,    setMarkingAll]    = useState(false);
  const [markingId,     setMarkingId]     = useState(null);

  const fetchPage = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications(p, 20);
      setNotifications(data?.notifications ?? []);
      setTotalPages(data?.totalPages ?? 1);
      setPage(p);
    } catch {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const handleMarkOne = async (id) => {
    if (markingId === id) return;
    setMarkingId(id);
    try {
      await markOneRead(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch {
      // silent – the badge will self-correct on next poll
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <>
      <head>
        <title>Notifications | LuxStay</title>
        <meta
          name="description"
          content="View your booking, payment, and refund notifications all in one place."
        />
      </head>

      <div className="container py-5" style={{ maxWidth: '760px' }}>
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="h3 fw-bold mb-1" style={{ color: '#1a3c5e' }}>
              <i className="bi bi-bell me-2" />
              Notifications
            </h1>
            <p className="text-muted small mb-0">
              Stay updated with your booking activity and reminders.
            </p>
          </div>

          {hasUnread && (
            <button
              id="mark-all-read-btn"
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill"
              onClick={handleMarkAll}
              disabled={markingAll}
            >
              {markingAll && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                />
              )}
              Mark all as read
            </button>
          )}
        </div>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-5" aria-live="polite">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading notifications…</span>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill" />
            <span className="flex-grow-1">{error}</span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-danger"
              onClick={() => fetchPage(page)}
              id="notif-retry-btn"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty ─────────────────────────────────────────────────────────── */}
        {!loading && !error && notifications.length === 0 && (
          <div className="text-center py-5">
            <i
              className="bi bi-bell-slash"
              style={{ fontSize: '3rem', color: '#ccc' }}
              aria-hidden="true"
            />
            <h2 className="h5 mt-3 text-muted fw-semibold">No notifications yet</h2>
            <p className="text-muted small">
              Check back here for booking updates, payment confirmations, and reminders.
            </p>
            <Link to="/hotels" className="btn btn-primary btn-sm rounded-pill mt-2">
              Browse Hotels
            </Link>
          </div>
        )}

        {/* ── List ──────────────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="d-flex flex-column gap-3" aria-live="polite">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="card border-0 shadow-sm"
                style={{
                  borderLeft: `4px solid ${n.read_at ? '#e9ecef' : '#2d6fa5'}`,
                  borderRadius: '10px',
                  background: n.read_at ? '#fff' : 'rgba(45,111,165,0.04)',
                  transition: 'background 0.3s',
                }}
              >
                <div className="card-body py-3 px-4">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    {/* Icon + content */}
                    <div className="d-flex gap-3 align-items-start flex-grow-1">
                      <span
                        className="mt-1"
                        style={{ fontSize: '1.4rem', lineHeight: 1 }}
                        aria-hidden="true"
                      >
                        {TYPE_ICONS[n.type] ?? 'ℹ️'}
                      </span>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span className="fw-semibold" style={{ color: '#1a3c5e' }}>
                            {n.title}
                          </span>
                          {!n.read_at && (
                            <span
                              className="badge bg-warning text-dark"
                              style={{ fontSize: '0.65rem' }}
                            >
                              New
                            </span>
                          )}
                          <span
                            className="badge bg-light text-secondary border"
                            style={{ fontSize: '0.65rem' }}
                          >
                            {TYPE_LABELS[n.type] ?? 'System'}
                          </span>
                        </div>

                        <p className="mb-1 text-muted small">{n.message}</p>

                        {n.metadata?.bookingId && (
                          <Link
                            to="/my-bookings"
                            className="small text-primary"
                            id={`notif-booking-link-${n.id}`}
                          >
                            View booking #{n.metadata.bookingId}
                          </Link>
                        )}

                        <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Mark as read button */}
                    {!n.read_at && (
                      <button
                        id={`mark-read-btn-${n.id}`}
                        type="button"
                        className="btn btn-link btn-sm p-0 text-muted flex-shrink-0"
                        onClick={() => handleMarkOne(n.id)}
                        disabled={markingId === n.id}
                        title="Mark as read"
                        aria-label={`Mark "${n.title}" as read`}
                      >
                        {markingId === n.id ? (
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                          />
                        ) : (
                          <i className="bi bi-check2-circle" style={{ fontSize: '1.1rem' }} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {!loading && !error && totalPages > 1 && (
          <nav
            className="d-flex justify-content-center align-items-center gap-3 mt-5"
            aria-label="Notification pages"
          >
            <button
              id="notif-prev-btn"
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              disabled={page <= 1}
              onClick={() => fetchPage(page - 1)}
            >
              <i className="bi bi-chevron-left" /> Previous
            </button>

            <span className="small text-muted">Page {page} of {totalPages}</span>

            <button
              id="notif-next-btn"
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              disabled={page >= totalPages}
              onClick={() => fetchPage(page + 1)}
            >
              Next <i className="bi bi-chevron-right" />
            </button>
          </nav>
        )}
      </div>
    </>
  );
};

export default Notifications;
